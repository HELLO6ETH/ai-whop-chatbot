import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";

/**
 * GET /api/channels - Get available channels for an experience
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
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
		const access = await whopsdk.users.checkAccess(experienceId, { id: userId });
		if (access.access_level !== "admin") {
			return NextResponse.json({ error: "Admin access required" }, { status: 403 });
		}

		// Try multiple methods to find channels
		let channels: any[] = [];

		// Method 1: Check if experience object contains channel info
		try {
			const experience = await whopsdk.experiences.retrieve(experienceId);
			
			// Check if experience has channels embedded
			if (experience?.channels && Array.isArray(experience.channels)) {
				channels = experience.channels;
			} else if (experience?.channel_id) {
				// Single default channel
				channels = [{ id: experience.channel_id, name: "Main Channel", type: "default" }];
			} else if (experience?.chat?.channel_id) {
				channels = [{ id: experience.chat.channel_id, name: "Main Channel", type: "default" }];
			} else if (experience?.settings?.channel_id) {
				channels = [{ id: experience.settings.channel_id, name: "Main Channel", type: "default" }];
			}
		} catch (error: any) {
			console.error("Error checking experience for channels:", error);
		}

		// Method 2: Try different SDK API structures
		if (channels.length === 0) {
			try {
				// Try various possible API paths
				const apiPaths = [
					() => whopsdk.experiences?.channels?.list?.(experienceId),
					() => whopsdk.experiences?.chat?.channels?.list?.(experienceId),
					() => whopsdk.channels?.list?.({ experience_id: experienceId }),
					() => whopsdk.channels?.list?.({ experienceId }),
					() => whopsdk.chat?.channels?.list?.(experienceId),
					() => whopsdk.chat?.channels?.list?.({ experience_id: experienceId }),
					() => whopsdk.chat?.list?.({ experience_id: experienceId }),
				];

				for (const apiCall of apiPaths) {
					try {
						const result = await apiCall();
						if (result) {
							const data = result?.data || result?.items || result;
							if (Array.isArray(data) && data.length > 0) {
								channels = data;
								break;
							}
						}
					} catch (e) {
						// Try next method
						continue;
					}
				}
			} catch (error: any) {
				console.error("Error trying SDK API paths:", error);
			}
		}

		// Method 3: Try to get default/main channel
		if (channels.length === 0) {
			try {
				// Some experiences might have a default channel
				if (whopsdk.channels?.retrieve) {
					// Try to get a default channel by ID pattern (might need experience_id as channel_id)
					// This is a fallback - might not work
				}
			} catch (error: any) {
				console.error("Error trying to get default channel:", error);
			}
		}

		// Format channels for display
		const formattedChannels = channels.map((channel: any) => ({
			id: channel.id || channel.channel_id || channel,
			name: channel.name || channel.title || channel.label || `Channel ${channel.id || channel}`,
			type: channel.type || "unknown",
		}));

		// If no channels found, return empty array (user will need to enter manually)
		if (formattedChannels.length === 0) {
			return NextResponse.json({
				channels: [],
			});
		}

		return NextResponse.json({ channels: formattedChannels });
	} catch (error: any) {
		console.error("Error in channels endpoint:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to fetch channels" },
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}

