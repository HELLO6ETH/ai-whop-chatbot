import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";

/**
 * POST /api/webhooks/setup - Set up webhook for chat messages
 * This should be called automatically when bot is configured
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		const { userId } = await whopsdk.verifyUserToken(await headers());
		const body = await request.json();

		const { experience_id } = body;

		if (!experience_id) {
			return NextResponse.json({ error: "experience_id is required" }, { status: 400 });
		}

		// Verify admin access
		const access = await whopsdk.users.checkAccess(experience_id, { id: userId });
		if (access.access_level !== "admin") {
			return NextResponse.json({ error: "Admin access required" }, { status: 403 });
		}

		// Get the base URL for webhook endpoint
		// In production, this should be your deployed URL
		const baseUrl =
			process.env.NEXT_PUBLIC_WEBHOOK_URL ||
			process.env.VERCEL_URL ||
			process.env.NEXT_PUBLIC_SITE_URL ||
			"";

		if (!baseUrl) {
			return NextResponse.json({
				success: false,
				note: "Webhook URL not configured. Please set NEXT_PUBLIC_WEBHOOK_URL in your environment variables.",
				webhook_url: "/api/chat/webhook",
				instructions: "Configure the webhook URL in your Whop app settings: /api/chat/webhook",
			});
		}

		const webhookUrl = `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/api/chat/webhook`;

		// Try to register webhook via SDK (if supported)
		// Note: Adjust based on actual Whop SDK API
		let webhookRegistered = false;
		try {
			// Try different possible API structures
			if (whopsdk.webhooks?.create) {
				await whopsdk.webhooks.create({
					url: webhookUrl,
					events: ["chat.message.created"],
					experience_id: experience_id,
				});
				webhookRegistered = true;
			} else if (whopsdk.webhooks?.register) {
				await whopsdk.webhooks.register({
					url: webhookUrl,
					events: ["chat.message.created"],
				});
				webhookRegistered = true;
			}
		} catch (error: any) {
			console.error("Error registering webhook via SDK:", error);
			// Continue - webhook might need to be configured manually
		}

		return NextResponse.json({
			success: true,
			webhook_registered: webhookRegistered,
			webhook_url: webhookUrl,
			note: webhookRegistered
				? "Webhook registered successfully!"
				: "Webhook URL generated. Please configure it in your Whop app dashboard under Webhooks section.",
			instructions: webhookRegistered
				? undefined
				: `Go to your Whop developer dashboard → Your App → Webhooks → Add webhook URL: ${webhookUrl}`,
		});
	} catch (error: any) {
		console.error("Error setting up webhook:", error);
		return NextResponse.json({ error: error.message || "Failed to setup webhook" }, { status: 500 });
	}
}

