import { waitUntil } from "@vercel/functions";
import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { supabase } from "@/lib/supabase";
import { generateResponse } from "@/lib/ai";

/**
 * POST /api/chat/webhook - Handle chat webhook events from Whop (future-proof)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		console.log("📨 Webhook received!");
		const requestBodyText = await request.text();
		const headers = Object.fromEntries(request.headers);

		// Validate webhook
		const webhookData = whopsdk.webhooks.unwrap(requestBodyText, { headers });
		console.log("Webhook type:", webhookData.type);
		console.log("Webhook data:", JSON.stringify(webhookData.data, null, 2));

		// Handle chat message events
		if (webhookData.type === "chat.message.created") {
			console.log("✅ Processing chat message event");
			waitUntil(handleChatMessage(webhookData.data));
		} else {
			console.log("ℹ️ Ignoring webhook type:", webhookData.type);
		}

		return new NextResponse("OK", { status: 200 });
	} catch (error: any) {
		console.error("❌ Error processing webhook:", error);
		console.error("Error details:", error.message);
		return NextResponse.json({ error: "Invalid webhook", details: error.message }, { status: 400 });
	}
}

async function handleChatMessage(message: any) {
	try {
		console.log("💬 Processing chat message:", JSON.stringify(message, null, 2));
		// Extract channel and experience IDs from webhook payload
		const channelId = message.channel_id || message.channel?.id;
		console.log("Channel ID:", channelId);
		
		// Experience ID might be in different places in the webhook payload
		let experienceId =
			message.experience_id ||
			message.experience?.id ||
			message.channel?.experience_id ||
			message.channel?.experience?.id;

		// If we still don't have experience_id, try to get it from channel
		if (!experienceId && channelId) {
			try {
				// Try to fetch channel info to get experience_id
				if (whopsdk.channels?.retrieve) {
					const channel = await whopsdk.channels.retrieve(channelId);
					experienceId = channel?.experience_id || channel?.experience?.id;
				}
			} catch (error) {
				console.error("Could not fetch channel to get experience_id:", error);
			}
		}

		if (!experienceId) {
			console.log("Missing experience_id in webhook payload");
			return;
		}

		if (!channelId) {
			console.log("Missing channel_id in webhook payload");
			return;
		}

		// Get bot configuration
		const { data: config } = await supabase
			.from("bot_config")
			.select("*")
			.eq("experience_id", experienceId)
			.single();

		if (!config) {
			return;
		}

		const botName = config.bot_name || "CoachBot";
		const content = (message.content || "").toLowerCase();
		const botNameLower = botName.toLowerCase();
		console.log(`🔍 Checking mention - Bot name: "${botName}", Message: "${message.content}"`);
		// Just check if the bot name appears in the message (case-insensitive)
		const isMention = content.includes(botNameLower);
		console.log(`Mention detected: ${isMention}`);

		if (!isMention) {
			console.log(`❌ Bot name "${botName}" not found in message, ignoring`);
			return;
		}

		console.log(`✅ Bot mentioned! Processing message...`);

		// Extract question
		const question = message.content
			.replace(new RegExp(`@?${botName}`, "gi"), "")
			.trim();

		if (!question) {
			return;
		}

		// Generate response
		console.log(`🤖 Generating AI response for question: "${question}"`);
		const response = await generateResponse(question, experienceId, config.personality, botName);
		console.log(`✅ Generated response: "${response.substring(0, 100)}..."`);

		// Send reply
		// Try different possible API structures
		try {
			console.log(`📤 Sending reply to channel ${channelId}...`);
			if (whopsdk.channels?.messages?.create) {
				await whopsdk.channels.messages.create(channelId, {
					content: response,
				});
				console.log("✅ Reply sent successfully via channels.messages.create");
			} else if (whopsdk.messages?.create) {
				await whopsdk.messages.create(channelId, {
					content: response,
				});
				console.log("✅ Reply sent successfully via messages.create");
			} else {
				console.error("❌ Could not find messages.create method in Whop SDK");
			}
		} catch (error: any) {
			console.error("❌ Error sending reply:", error);
			console.error("Error details:", error.message);
		}

		// Store in database
		await supabase.from("chat_messages").insert({
			experience_id: experienceId,
			channel_id: channelId,
			message_id: message.id,
			user_id: message.user_id || "unknown",
			content: question,
			response,
		});
	} catch (error) {
		console.error("Error handling chat message:", error);
	}
}

