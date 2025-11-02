import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { supabase } from "@/lib/supabase";
import { generateResponse } from "@/lib/ai";

/**
 * POST /api/chat/poll - Poll for new chat messages and respond to bot mentions
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		// Support both JSON body and query parameters (for cron jobs)
		let experience_id: string | null = null;
		
		try {
			const body = await request.json();
			experience_id = body.experience_id;
		} catch {
			// If JSON parsing fails, try query parameters
			const searchParams = request.nextUrl.searchParams;
			experience_id = searchParams.get("experience_id");
		}

		if (!experience_id) {
			return NextResponse.json({ error: "experience_id is required" }, { status: 400 });
		}

		// Get bot configuration
		const { data: config, error: configError } = await supabase
			.from("bot_config")
			.select("*")
			.eq("experience_id", experience_id)
			.single();

		if (configError || !config) {
			return NextResponse.json({ error: "Bot not configured for this experience" }, { status: 404 });
		}

		const botName = config.bot_name || "CoachBot";
		const channelId = config.channel_id;

		if (!channelId) {
			return NextResponse.json({ error: "No channel configured" }, { status: 400 });
		}

		// Get recent messages from the channel
		// Note: Adjust API calls based on actual Whop SDK structure
		let messages: any;
		try {
			// Try different possible API structures
			if (whopsdk.channels?.messages?.list) {
				messages = await whopsdk.channels.messages.list(channelId, {
					limit: 20,
				});
			} else if (whopsdk.messages?.list) {
				messages = await whopsdk.messages.list(channelId, {
					limit: 20,
				});
			} else {
				// Fallback: Return error suggesting manual check
				return NextResponse.json({
					error: "Whop SDK API structure may differ. Please check SDK documentation for messages.list() method.",
					processed: 0,
				}, { status: 500 });
			}
		} catch (error: any) {
			console.error("Error fetching messages:", error);
			return NextResponse.json({
				error: `Failed to fetch messages: ${error.message}`,
				processed: 0,
			}, { status: 500 });
		}

		// Handle different response structures
		const messageList = messages?.data || messages?.items || messages || [];
		if (!Array.isArray(messageList) || messageList.length === 0) {
			return NextResponse.json({ processed: 0, message: "No new messages" });
		}

		// Get last processed message ID from database
		const { data: lastMessage } = await supabase
			.from("chat_messages")
			.select("message_id")
			.eq("experience_id", experience_id)
			.order("created_at", { ascending: false })
			.limit(1)
			.single();

		const lastProcessedId = lastMessage?.message_id;

		// Filter for new messages that mention the bot (just check if bot name appears)
		const newMentions = messageList.filter((msg: any) => {
			// Skip if already processed
			if (lastProcessedId && msg.id === lastProcessedId) {
				return false;
			}

			const content = (msg.content || "").toLowerCase();
			return content.includes(botName.toLowerCase());
		});

		let processed = 0;

		// Process each mention
		for (const message of newMentions) {
			try {
				// Extract the question (remove the mention)
				const content = message.content || "";
				const question = content
					.replace(new RegExp(`@?${botName}`, "gi"), "")
					.trim();

				if (!question) {
					continue;
				}

				// Generate AI response
				const response = await generateResponse(
					question,
					experience_id,
					config.personality,
					botName,
				);

				// Send reply to chat
				// Try different possible API structures
				let sentSuccessfully = false;
				try {
					if (whopsdk.channels?.messages?.create) {
						await whopsdk.channels.messages.create(channelId, {
							content: response,
						});
						sentSuccessfully = true;
					} else if (whopsdk.messages?.create) {
						await whopsdk.messages.create(channelId, {
							content: response,
						});
						sentSuccessfully = true;
					} else if (whopsdk.channels?.sendMessage) {
						await whopsdk.channels.sendMessage(channelId, {
							content: response,
						});
						sentSuccessfully = true;
					} else if (whopsdk.chat?.messages?.create) {
						await whopsdk.chat.messages.create(channelId, {
							content: response,
						});
						sentSuccessfully = true;
					} else {
						console.error("Could not find messages.create method in Whop SDK");
						console.error("Available SDK properties:", Object.keys(whopsdk));
						throw new Error("Whop SDK API structure may differ for message creation");
					}
				} catch (msgError: any) {
					console.error("Error sending message:", msgError);
					console.error("Error details:", msgError.message || msgError.toString());
					throw msgError;
				}

				// Store in database
				await supabase.from("chat_messages").insert({
					experience_id,
					channel_id: channelId,
					message_id: message.id,
					user_id: message.user_id || message.user?.id || "unknown",
					content: question,
					response,
				});

				processed++;
			} catch (error) {
				console.error(`Error processing message ${message.id}:`, error);
				// Continue processing other messages
			}
		}

		return NextResponse.json({
			processed,
			message: processed > 0 ? `Processed ${processed} mentions` : "No new mentions",
		});
	} catch (error: any) {
		console.error("Error polling chat:", error);
		return NextResponse.json({ error: error.message || "Failed to poll chat" }, { status: 500 });
	}
}

