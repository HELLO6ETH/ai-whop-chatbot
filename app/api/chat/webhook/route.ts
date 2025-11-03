import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { supabase } from "@/lib/supabase";
import { generateResponse } from "@/lib/ai";

// Helper to use waitUntil on Vercel, but work without it on Netlify/other platforms
function executeAsync(fn: () => Promise<void>) {
	try {
		// Try to use Vercel's waitUntil if available
		const { waitUntil } = require("@vercel/functions");
		waitUntil(fn());
	} catch {
		// On Netlify or other platforms, execute directly
		// This won't block the response since it's fire-and-forget
		fn().catch((error) => {
			console.error("Error in async webhook handler:", error);
		});
	}
}

/**
 * POST /api/chat/webhook - Handle chat webhook events from Whop (future-proof)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		console.log("📨 Webhook received!");
		const requestBodyText = await request.text();
		
		// Preserve original header casing - Next.js/Netlify may lowercase headers
		// but Whop SDK might need original casing
		const headers: Record<string, string> = {};
		request.headers.forEach((value, key) => {
			headers[key] = value;
		});

		// Log headers for debugging (but don't log secrets)
		console.log("Received headers:", Object.keys(headers));
		console.log("Header keys:", Object.keys(headers).join(", "));
		
		// Check if webhook secret is configured
		const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;
		if (!webhookSecret) {
			console.error("❌ WHOP_WEBHOOK_SECRET environment variable is not set!");
			return NextResponse.json({ 
				error: "Webhook secret not configured",
				details: "WHOP_WEBHOOK_SECRET environment variable is missing"
			}, { status: 500 });
		}
		console.log("✅ Webhook secret is configured");

		// Validate webhook
		let webhookData: any = null;
		try {
			webhookData = whopsdk.webhooks.unwrap(requestBodyText, { headers });
			console.log("Webhook type:", webhookData.type);
			console.log("Webhook data:", JSON.stringify(webhookData.data, null, 2));
		} catch (unwrapError: any) {
			console.warn("⚠️ Webhook verification failed - attempting to process anyway");
			console.warn("Error:", unwrapError.message);
			
			// If verification fails (missing headers from Whop execution endpoint),
			// try to parse the body directly as JSON
			try {
				const bodyJson = JSON.parse(requestBodyText);
				console.log("📦 Parsed webhook body directly:", JSON.stringify(bodyJson, null, 2));
				
				// Try to extract webhook data from the body
				// Whop's execution endpoint might wrap it differently
				if (bodyJson.type || bodyJson.event || bodyJson.data) {
					webhookData = {
						type: bodyJson.type || bodyJson.event?.type || bodyJson.event || "unknown",
						data: bodyJson.data || bodyJson.payload || bodyJson.event?.data || bodyJson,
					};
					console.log("✅ Extracted webhook data - type:", webhookData.type);
				} else {
					// If it's just raw data, assume it's a message event
					webhookData = {
						type: "message",
						data: bodyJson,
					};
					console.log("✅ Using raw body as webhook data");
				}
			} catch (parseError: any) {
				console.error("❌ Failed to parse webhook body as JSON:", parseError.message);
				return NextResponse.json({ 
					error: "Invalid webhook", 
					details: "Could not verify or parse webhook",
					verificationError: unwrapError.message,
					parseError: parseError.message,
				}, { status: 400 });
			}
		}

		// Handle different webhook event types
		if (webhookData && webhookData.data) {
			// Check if this looks like a chat message event
			const hasMessageFields = webhookData.data.content || webhookData.data.message || webhookData.data.text;
			const isMessageType = webhookData.type === "chat.message.created" || 
			                      webhookData.type === "message.created" ||
			                      webhookData.type === "chat.message" ||
			                      webhookData.type === "message" ||
			                      webhookData.type?.includes("message");
			
			if (isMessageType || hasMessageFields) {
				console.log(`✅ Processing message event: ${webhookData.type || "message"}`);
				executeAsync(() => handleChatMessage(webhookData.data));
				return new NextResponse("OK", { status: 200 });
			} else {
				console.log(`ℹ️ Ignoring webhook type: ${webhookData.type || "unknown"} (not a chat message event)`);
				console.log("Webhook data keys:", Object.keys(webhookData.data || {}));
				return new NextResponse("OK", { status: 200 });
			}
		} else {
			console.warn("⚠️ Webhook data structure unexpected:", webhookData);
			return new NextResponse("OK", { status: 200 });
		}
	} catch (error: any) {
		console.error("❌ Error processing webhook:", error);
		console.error("Error details:", error.message);
		console.error("Error stack:", error.stack);
		return NextResponse.json({ 
			error: "Internal server error", 
			details: error.message 
		}, { status: 500 });
	}
}

async function handleChatMessage(message: any) {
	try {
		console.log("💬 Processing chat message:", JSON.stringify(message, null, 2));
		
		// Extract experience ID from webhook payload
		// According to Whop docs, channel_id can be experience_id, so we prioritize experience_id
		let experienceId =
			message.experience_id ||
			message.experience?.id ||
			message.channel?.experience_id ||
			message.channel?.experience?.id ||
			message.channel_id; // channel_id might actually be experience_id
		
		// Also try to extract from message structure (message might be nested)
		if (!experienceId) {
			experienceId = message.channel_id || message.channel?.id;
		}

		if (!experienceId) {
			console.log("❌ Missing experience_id in webhook payload");
			console.log("Full message payload:", JSON.stringify(message, null, 2));
			return;
		}

		// According to Whop SDK docs, we can use experience_id as channel_id
		const channelId = experienceId;
		console.log("Using channel/experience ID:", channelId);

		// Get bot configuration
		const { data: config } = await supabase
			.from("bot_config")
			.select("*")
			.eq("experience_id", experienceId)
			.single();

		if (!config) {
			console.log("❌ Bot not configured for this experience, ignoring message");
			return;
		}

		const botName = config.bot_name || "CoachBot";
		// Message structure: { id, content, user: { id, name, username }, ... }
		const messageContent = message.content || "";
		const content = messageContent.toLowerCase();
		const botNameLower = botName.toLowerCase();
		console.log(`🔍 Checking mention - Bot name: "${botName}", Message: "${messageContent}"`);
		
		// Check if the bot name appears in the message (case-insensitive)
		const isMention = content.includes(botNameLower);
		console.log(`Mention detected: ${isMention}`);

		if (!isMention) {
			console.log(`❌ Bot name "${botName}" not found in message, ignoring`);
			return;
		}

		console.log(`✅ Bot mentioned! Processing message...`);

		// Extract question (remove bot mention)
		const question = messageContent
			.replace(new RegExp(`@?${botName}`, "gi"), "")
			.trim();

		if (!question) {
			console.log("❌ Question is empty after removing bot mention, ignoring");
			return;
		}

		// Generate response
		console.log(`🤖 Generating AI response for question: "${question}"`);
		const response = await generateResponse(question, experienceId, config.personality, botName);
		console.log(`✅ Generated response: "${response.substring(0, 100)}..."`);

		// Send reply using Whop SDK
		// Based on Whop SDK: client.messages.create({ channel_id, content })
		let sentSuccessfully = false;
		let sendMethod = "none";
		let sendError: any = null;

		try {
			console.log(`📤 Sending reply to channel ${channelId}...`);
			
			if (whopsdk.messages?.create) {
				await whopsdk.messages.create({
					channel_id: channelId,
					content: response,
				});
				sentSuccessfully = true;
				sendMethod = "messages.create";
				console.log("✅ Reply sent successfully via messages.create");
			} else {
				sendError = "Could not find messages.create method in Whop SDK";
				console.error("❌ Could not find messages.create method in Whop SDK");
				console.error("Available SDK properties:", Object.keys(whopsdk));
			}
		} catch (error: any) {
			sendError = error.message || error.toString();
			console.error("❌ Error sending reply:", error);
			console.error("Error details:", sendError);
			console.error("Error stack:", error.stack);
		}

		if (!sentSuccessfully) {
			console.error("⚠️ Response generated but could not be sent to chat");
			console.error("Generated response:", response.substring(0, 200));
			console.error("Send error:", sendError);
			console.error("Send method attempted:", sendMethod);
		}

		// Store in database
		// Message structure: { id, content, user: { id, name, username }, ... }
		try {
			const { error: dbError } = await supabase.from("chat_messages").insert({
				experience_id: experienceId,
				channel_id: channelId,
				message_id: message.id,
				user_id: message.user?.id || message.user_id || "unknown",
				content: question,
				response,
			});
			if (dbError) {
				console.error("❌ Error storing message in database:", dbError);
			} else {
				console.log("✅ Chat message and response stored in database");
			}
		} catch (dbError) {
			console.error("❌ Error storing message in database:", dbError);
		}
	} catch (error: any) {
		console.error("❌ Error handling chat message:", error);
		console.error("Error details:", error.message);
		console.error("Error stack:", error.stack);
	}
}

