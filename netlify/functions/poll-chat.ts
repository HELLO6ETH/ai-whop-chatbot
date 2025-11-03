import type { Handler } from "@netlify/functions";

/**
 * Netlify Scheduled Function - Polls for new chat messages
 * This runs every minute to check for new messages and respond to bot mentions
 * 
 * To set this up:
 * 1. Go to Netlify Dashboard → Your Site → Functions
 * 2. Add a new scheduled function
 * 3. Set schedule: rate(1 minute) or cron(* * * * *) for every minute
 * 4. Point to: poll-chat
 */
export const handler: Handler = async (event, context) => {
	console.log("🔄 Polling for new chat messages...");

	try {
		// Get all configured experiences from database
		// For now, we'll need experience_id to be passed via environment or query
		const experienceId = event.queryStringParameters?.experience_id;

		if (!experienceId) {
			console.log("ℹ️ No experience_id provided in query parameters");
			return {
				statusCode: 400,
				body: JSON.stringify({
					error: "experience_id is required as query parameter",
					hint: "Set up the scheduled function with ?experience_id=your-experience-id",
				}),
			};
		}

		// Call the polling endpoint
		const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || "https://aichatbotas.netlify.app";
		const pollUrl = `${baseUrl}/api/chat/poll?experience_id=${experienceId}`;

		const response = await fetch(pollUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ experience_id: experienceId }),
		});

		const result = await response.json();

		if (!response.ok) {
			console.error("❌ Polling failed:", result);
			return {
				statusCode: response.status,
				body: JSON.stringify(result),
			};
		}

		console.log(`✅ Polling complete: ${result.message || "No new mentions"}`);
		return {
			statusCode: 200,
			body: JSON.stringify(result),
		};
	} catch (error: any) {
		console.error("❌ Error in scheduled poll function:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({
				error: "Failed to poll chat",
				details: error.message,
			}),
		};
	}
};

