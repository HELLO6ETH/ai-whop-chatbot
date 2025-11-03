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
		try {
			const webhookData = whopsdk.webhooks.unwrap(requestBodyText, { headers });
			console.log("Webhook type:", webhookData.type);
			console.log("Webhook data:", JSON.stringify(webhookData.data, null, 2));

			// Handle different webhook event types
			// Note: Whop may not have chat.message.created, so we'll handle any message-related events
			if (webhookData.type === "chat.message.created" || 
			    webhookData.type === "message.created" ||
			    webhookData.type === "chat.message" ||
			    webhookData.type?.includes("message")) {
				console.log(`✅ Processing message event: ${webhookData.type}`);
				executeAsync(() => handleChatMessage(webhookData.data));
			} else {
				console.log(`ℹ️ Ignoring webhook type: ${webhookData.type} (not a chat message event)`);
				console.log("💡 Tip: Use polling endpoint /api/chat/poll if chat message webhooks aren't supported");
			}

			return new NextResponse("OK", { status: 200 });
		} catch (unwrapError: any) {
			console.error("❌ Webhook unwrap failed:", unwrapError);
			console.error("Error type:", unwrapError.constructor?.name);
			console.error("Error message:", unwrapError.message);
			console.error("Received headers count:", Object.keys(headers).length);
			
			// Log which headers we received (for debugging, but hide values)
			const headerNames = Object.keys(headers);
			console.error("Header names received:", headerNames.join(", "));
			
			// Check if webhook secret might be wrong
			if (unwrapError.message?.includes("headers") || unwrapError.message?.includes("signature")) {
				console.error("⚠️ Possible issues:");
				console.error("1. WHOP_WEBHOOK_SECRET in Netlify might not match Whop dashboard");
				console.error("2. Whop might not be sending the required headers");
				console.error("3. Headers might be getting modified by Netlify");
			}
			
			return NextResponse.json({ 
				error: "Invalid webhook", 
				details: unwrapError.message,
				hint: "Check that WHOP_WEBHOOK_SECRET in Netlify matches the secret in Whop dashboard"
			}, { status: 400 });
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
			console.log("❌ Missing experience_id in webhook payload");
			console.log("Full message payload:", JSON.stringify(message, null, 2));
			return;
		}

		if (!channelId) {
			console.log("❌ Missing channel_id in webhook payload");
			console.log("Full message payload:", JSON.stringify(message, null, 2));
			return;
		}

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
			console.log("❌ Question is empty after removing bot mention, ignoring");
			return;
		}

		// Generate response
		console.log(`🤖 Generating AI response for question: "${question}"`);
		const response = await generateResponse(question, experienceId, config.personality, botName);
		console.log(`✅ Generated response: "${response.substring(0, 100)}..."`);

		// Send reply
		// Try different possible API structures
		let sentSuccessfully = false;
		let sendMethod = "none";
		let sendError: any = null;

		try {
			console.log(`📤 Sending reply to channel ${channelId}...`);
			
			// Try different possible API structures
			if (whopsdk.channels?.messages?.create) {
				await whopsdk.channels.messages.create(channelId, {
					content: response,
				});
				sentSuccessfully = true;
				sendMethod = "channels.messages.create";
				console.log("✅ Reply sent successfully via channels.messages.create");
			} else if (whopsdk.messages?.create) {
				await whopsdk.messages.create(channelId, {
					content: response,
				});
				sentSuccessfully = true;
				sendMethod = "messages.create";
				console.log("✅ Reply sent successfully via messages.create");
			} else if (whopsdk.channels?.sendMessage) {
				await whopsdk.channels.sendMessage(channelId, {
					content: response,
				});
				sentSuccessfully = true;
				sendMethod = "channels.sendMessage";
				console.log("✅ Reply sent successfully via channels.sendMessage");
			} else if (whopsdk.chat?.messages?.create) {
				await whopsdk.chat.messages.create(channelId, {
					content: response,
				});
				sentSuccessfully = true;
				sendMethod = "chat.messages.create";
				console.log("✅ Reply sent successfully via chat.messages.create");
			} else {
				sendError = "Could not find any message sending method in Whop SDK";
				console.error("❌ Could not find messages.create method in Whop SDK");
				console.error("Available SDK properties:", Object.keys(whopsdk));
				if (whopsdk.channels) {
					console.error("Available channels properties:", Object.keys(whopsdk.channels));
				}
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
		try {
			const { error: dbError } = await supabase.from("chat_messages").insert({
				experience_id: experienceId,
				channel_id: channelId,
				message_id: message.id,
				user_id: message.user_id || "unknown",
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

