import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { supabase } from "@/lib/supabase";
import { generateResponse } from "@/lib/ai";

/**
 * POST /api/chat/test - Test endpoint to manually trigger bot response
 * This helps debug issues without relying on webhooks
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		const body = await request.json();
		const { experience_id, channel_id, message, bot_name } = body;

		if (!experience_id) {
			return NextResponse.json({ error: "experience_id is required" }, { status: 400 });
		}

		if (!channel_id) {
			return NextResponse.json({ error: "channel_id is required" }, { status: 400 });
		}

		if (!message) {
			return NextResponse.json({ error: "message is required" }, { status: 400 });
		}

		// Get bot configuration
		const { data: config, error: configError } = await supabase
			.from("bot_config")
			.select("*")
			.eq("experience_id", experience_id)
			.single();

		if (configError || !config) {
			return NextResponse.json({ 
				error: "Bot not configured for this experience",
				details: configError?.message,
				hint: "Go to /experiences/[experience_id] to configure the bot"
			}, { status: 404 });
		}

		const botName = bot_name || config.bot_name || "CoachBot";
		
		// Extract question (remove bot mention if present)
		const question = message
			.replace(new RegExp(`@?${botName}`, "gi"), "")
			.trim();

		if (!question) {
			return NextResponse.json({ 
				error: "Question is empty after removing bot mention",
				message: message,
				bot_name: botName
			}, { status: 400 });
		}

		// Generate response
		console.log(`🤖 Generating AI response for question: "${question}"`);
		const response = await generateResponse(
			question,
			experience_id,
			config.personality,
			botName
		);
		console.log(`✅ Generated response: "${response.substring(0, 100)}..."`);

		// Try to send reply
		let sentSuccessfully = false;
		let sendMethod = "none";
		let sendError: any = null;

		try {
			console.log(`📤 Attempting to send reply to channel ${channel_id}...`);
			
			// Try different possible API structures
			if (whopsdk.channels?.messages?.create) {
				await whopsdk.channels.messages.create(channel_id, {
					content: response,
				});
				sentSuccessfully = true;
				sendMethod = "channels.messages.create";
				console.log("✅ Reply sent successfully via channels.messages.create");
			} else if (whopsdk.messages?.create) {
				await whopsdk.messages.create(channel_id, {
					content: response,
				});
				sentSuccessfully = true;
				sendMethod = "messages.create";
				console.log("✅ Reply sent successfully via messages.create");
			} else if (whopsdk.channels?.sendMessage) {
				await whopsdk.channels.sendMessage(channel_id, {
					content: response,
				});
				sentSuccessfully = true;
				sendMethod = "channels.sendMessage";
				console.log("✅ Reply sent successfully via channels.sendMessage");
			} else {
				sendError = "Could not find any message sending method in Whop SDK";
				console.error("❌ Could not find messages.create method in Whop SDK");
			}
		} catch (error: any) {
			sendError = error.message || error.toString();
			console.error("❌ Error sending reply:", error);
			console.error("Error details:", sendError);
		}

		return NextResponse.json({
			success: true,
			response: response,
			question: question,
			bot_name: botName,
			sent_to_chat: sentSuccessfully,
			send_method: sendMethod,
			send_error: sendError,
			config: {
				personality: config.personality,
				channel_id: config.channel_id,
			},
			note: sentSuccessfully 
				? "Response sent to chat successfully" 
				: "Response generated but could not send to chat. Check send_error for details."
		});
	} catch (error: any) {
		console.error("Error in test endpoint:", error);
		return NextResponse.json({ 
			error: error.message || "Failed to test chat",
			stack: process.env.NODE_ENV === "development" ? error.stack : undefined
		}, { status: 500 });
	}
}

