import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/config - Get bot configuration for an experience
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
	// Ensure we always return JSON, even on unexpected errors
	try {
		let userId: string;
		try {
			const result = await whopsdk.verifyUserToken(await headers());
			userId = result.userId;
		} catch (authError: any) {
			return NextResponse.json(
				{ error: "Authentication failed", details: authError.message },
				{ status: 401, headers: { "Content-Type": "application/json" } },
			);
		}
		const searchParams = request.nextUrl.searchParams;
		const experienceId = searchParams.get("experience_id");

		if (!experienceId) {
			return NextResponse.json({ error: "experience_id is required" }, { status: 400 });
		}

		// Verify admin access
		let access: any;
		try {
			access = await whopsdk.users.checkAccess(experienceId, { id: userId });
		} catch (accessError: any) {
			console.error("checkAccess error:", accessError);
			return NextResponse.json(
				{ 
					error: "Failed to verify access", 
					details: accessError.message || "Unknown error during access check"
				},
				{ status: 403, headers: { "Content-Type": "application/json" } },
			);
		}
		
		if (!access || access.access_level !== "admin") {
			return NextResponse.json(
				{ error: "Admin access required" },
				{ status: 403, headers: { "Content-Type": "application/json" } },
			);
		}

		// Check Supabase is configured
		if (!supabase) {
			return NextResponse.json(
				{ error: "Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables." },
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}

		let result: any;
		try {
			result = await supabase
				.from("bot_config")
				.select("*")
				.eq("experience_id", experienceId)
				.single();
		} catch (fetchError: any) {
			console.error("Supabase fetch exception:", fetchError);
			const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
			return NextResponse.json(
				{ 
					error: "Failed to connect to Supabase database",
					details: fetchError.message || fetchError.toString() || "Network error connecting to Supabase",
					hint: supabaseUrl ? `Supabase URL: ${supabaseUrl.substring(0, 30)}...` : "Supabase URL not configured",
					troubleshooting: "Check: 1) Internet connection 2) Supabase URL is correct 3) Service role key is valid"
				},
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}

		const { data, error: supabaseError } = result || {};

		if (supabaseError && supabaseError.code !== "PGRST116") {
			// PGRST116 is "not found", which is okay - table doesn't exist yet
			console.error("Supabase query error:", supabaseError);
			
			// Check if it's a network/fetch error
			if (supabaseError.message?.includes("fetch failed") || supabaseError.message?.includes("TypeError") || supabaseError.code === "PGRST301" || supabaseError.message?.includes("Failed to fetch")) {
				const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
				return NextResponse.json(
					{ 
						error: "Failed to connect to Supabase database",
						details: supabaseError.message || "Network error connecting to Supabase",
						troubleshooting: [
							"1. Check your Supabase project status at https://supabase.com/dashboard",
							"2. Free tier projects pause after inactivity - unpause if needed",
							"3. Verify your Supabase URL is correct in .env.local",
							"4. Check your internet connection and firewall settings",
							"5. Ensure the service role key is correct and hasn't been rotated"
						].join("\n"),
						supabase_url: supabaseUrl || "Not configured"
					},
					{ status: 500, headers: { "Content-Type": "application/json" } },
				);
			}
			
			return NextResponse.json(
				{ 
					error: "Database query error",
					details: supabaseError.message || supabaseError.code || supabaseError.toString()
				},
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}

		// Return default config if none exists (this is normal for first-time setup)
		if (!data) {
			return NextResponse.json(
				{
					bot_name: "CoachBot",
					bot_avatar_url: null,
					personality: "friendly",
					channel_id: null, // Not needed with webhooks, but kept for backward compatibility
				},
				{ headers: { "Content-Type": "application/json" } },
			);
		}

		return NextResponse.json(data, {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error: any) {
		console.error("Error fetching config:", error);
		// Ensure we always return JSON, even on errors
		return NextResponse.json(
			{ 
				error: error.message || "Failed to fetch config",
				stack: process.env.NODE_ENV === "development" ? error.stack : undefined
			},
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}

/**
 * POST /api/config - Save bot configuration
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	// Ensure we always return JSON, even on unexpected errors
	try {
		// Check Whop SDK is configured
		if (!whopsdk) {
			return NextResponse.json(
				{ error: "Whop SDK not configured. Please set NEXT_PUBLIC_WHOP_APP_ID and WHOP_API_KEY environment variables." },
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}

		let userId: string;
		try {
			const result = await whopsdk.verifyUserToken(await headers());
			userId = result.userId;
		} catch (authError: any) {
			return NextResponse.json(
				{ error: "Authentication failed", details: authError.message },
				{ status: 401, headers: { "Content-Type": "application/json" } },
			);
		}
		
		const body = await request.json();

		const { experience_id, bot_name, bot_avatar_url, personality, channel_id } = body;

		if (!experience_id) {
			return NextResponse.json({ error: "experience_id is required" }, { status: 400 });
		}

		// Verify admin access
		let access: any;
		try {
			access = await whopsdk.users.checkAccess(experience_id, { id: userId });
		} catch (accessError: any) {
			console.error("checkAccess error:", accessError);
			return NextResponse.json(
				{ 
					error: "Failed to verify access", 
					details: accessError.message || "Unknown error during access check"
				},
				{ status: 403, headers: { "Content-Type": "application/json" } },
			);
		}
		
		if (!access || access.access_level !== "admin") {
			return NextResponse.json({ error: "Admin access required" }, { status: 403, headers: { "Content-Type": "application/json" } });
		}

		// Validate personality
		if (personality && !["friendly", "professional", "motivational"].includes(personality)) {
			return NextResponse.json(
				{ error: "Invalid personality type" },
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// Check Supabase is configured
		if (!supabase) {
			return NextResponse.json(
				{ error: "Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables." },
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}

		// Upsert configuration
		const { data, error } = await supabase
			.from("bot_config")
			.upsert(
				{
					experience_id,
					bot_name: bot_name || "CoachBot",
					bot_avatar_url: bot_avatar_url || null,
					personality: personality || "friendly",
					channel_id: null, // Not needed with webhooks
					updated_at: new Date().toISOString(),
				},
				{
					onConflict: "experience_id",
				},
			)
			.select()
			.single();

		if (error) throw error;

		// Automatically set up webhook when bot is configured
		try {
			const baseUrl =
				process.env.NEXT_PUBLIC_WEBHOOK_URL ||
				process.env.VERCEL_URL ||
				process.env.NEXT_PUBLIC_SITE_URL ||
				"";

			if (baseUrl) {
				// Webhook will be automatically handled by Whop when configured
				// The /api/chat/webhook endpoint is already set up to receive events
				console.log(`Webhook endpoint ready at: ${baseUrl}/api/chat/webhook`);
			}
		} catch (webhookError) {
			console.error("Note: Webhook setup note:", webhookError);
			// Don't fail config save if webhook setup has issues
		}

		return NextResponse.json({ success: true, config: data });
	} catch (error: any) {
		console.error("Error saving config:", error);
		// Ensure we always return JSON, even on errors
		return NextResponse.json(
			{ error: error.message || "Failed to save config" },
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}

