import { headers } from "next/headers";
import { whopsdk, isWhopSDKConfigured } from "@/lib/whop-sdk";
import BotConfigForm from "./bot-config-form";

export default async function ExperiencePage({
	params,
}: {
	params: Promise<{ experienceId: string }>;
}) {
	const { experienceId } = await params;

	// Check if Whop SDK is configured
	if (!isWhopSDKConfigured()) {
		return (
			<div className="flex flex-col p-8 gap-4">
				<h1 className="text-9 font-bold">Configuration Error</h1>
				<p className="text-3 text-gray-10">
					Whop SDK is not configured. Please set NEXT_PUBLIC_WHOP_APP_ID and WHOP_API_KEY in your .env.local file.
				</p>
				<p className="text-2 text-gray-10 mt-2">
					Current values:
				</p>
				<ul className="list-disc list-inside text-2 text-gray-10">
					<li>NEXT_PUBLIC_WHOP_APP_ID: {process.env.NEXT_PUBLIC_WHOP_APP_ID ? "✅ Set" : "❌ Missing"}</li>
					<li>WHOP_API_KEY: {process.env.WHOP_API_KEY ? "✅ Set" : "❌ Missing"}</li>
				</ul>
			</div>
		);
	}

	// Ensure the user is logged in and has admin access
	let userId: string;
	let experience: any;
	let access: any;

	try {
		// Verify user authentication first
		const authResult = await whopsdk.verifyUserToken(await headers());
		userId = authResult.userId;

		// For server-side SDK calls, we need to ensure the API key is valid
		// The SDK uses the API key for authentication, but these specific calls might need user context
		try {
			experience = await whopsdk.experiences.retrieve(experienceId);
		} catch (expError: any) {
			console.error("Error fetching experience:", expError);
			// If API key is invalid, provide helpful error
			if (expError.message?.includes("authenticated actor") || expError.message?.includes("unauthorized")) {
				throw new Error(
					`Authentication failed. Check that WHOP_API_KEY is correct in .env.local. ` +
					`Current API key starts with: ${process.env.WHOP_API_KEY?.substring(0, 10)}...`
				);
			}
			throw new Error(`Failed to fetch experience: ${expError.message}`);
		}

		try {
			access = await whopsdk.users.checkAccess(experienceId, { id: userId });
			
			// Validate access object was returned
			if (!access) {
				throw new Error("Access check returned null or undefined");
			}
		} catch (accessError: any) {
			console.error("Error checking access:", accessError);
			if (accessError.message?.includes("authenticated actor") || accessError.message?.includes("unauthorized")) {
				throw new Error(
					`Authentication failed for access check. Verify WHOP_API_KEY is correct. ` +
					`Also ensure you're accessing through Whop proxy (not direct localhost).`
				);
			}
			throw new Error(`Failed to check access: ${accessError.message}`);
		}
	} catch (error: any) {
		console.error("Authentication/Authorization error:", error);
		return (
			<div className="flex flex-col p-8 gap-4">
				<h1 className="text-9 font-bold">Authentication Error</h1>
				<p className="text-3 text-gray-10">
					{error.message || "Failed to authenticate with Whop. Please make sure:"}
				</p>
				<ul className="list-disc list-inside text-3 text-gray-10 mt-2 space-y-1">
					<li>You are logged into Whop</li>
					<li>You are accessing this page through the Whop app (not direct localhost)</li>
					<li>Your Whop API credentials are correctly set in .env.local</li>
					<li>The app is installed in your Whop community</li>
				</ul>
				<p className="text-2 text-gray-10 mt-4">
					Error details: {error.message}
				</p>
			</div>
		);
	}

	// Verify admin access (access should be defined at this point, but check anyway)
	if (!access || !access.access_level || access.access_level !== "admin") {
		return (
			<div className="flex flex-col p-8 gap-4">
				<h1 className="text-9 font-bold">Access Denied</h1>
				<p className="text-3 text-gray-10">
					You need admin access to configure the AI Coach Bot.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col p-8 gap-6 max-w-4xl mx-auto">
			<div className="flex flex-col gap-2">
				<h1 className="text-9 font-bold">AI Coach Bot Configuration</h1>
				<p className="text-3 text-gray-10">
					Configure your AI Coach Bot for <strong>{experience.name}</strong>
				</p>
			</div>

			<BotConfigForm experienceId={experienceId} experience={experience} />
		</div>
	);
}
