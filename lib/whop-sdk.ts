import { Whop } from "@whop/sdk";

// Validate required environment variables
const appID = process.env.NEXT_PUBLIC_WHOP_APP_ID;
const apiKey = process.env.WHOP_API_KEY;

if (!appID || !apiKey) {
	console.error("Missing Whop environment variables:");
	console.error("NEXT_PUBLIC_WHOP_APP_ID:", appID ? "✅ Set" : "❌ Missing");
	console.error("WHOP_API_KEY:", apiKey ? "✅ Set" : "❌ Missing");
}

// Create SDK instance - API key is used for server-side requests
export const whopsdk = appID && apiKey
	? new Whop({
		appID,
		apiKey, // This authenticates server-side requests
		webhookKey: btoa(process.env.WHOP_WEBHOOK_SECRET || ""),
	})
	: null as any; // Will be checked in API routes

// Helper to check if SDK is properly configured
export function isWhopSDKConfigured(): boolean {
	return whopsdk !== null && !!appID && !!apiKey;
}
