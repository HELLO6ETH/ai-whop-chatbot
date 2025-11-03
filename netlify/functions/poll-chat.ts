import type { Handler } from "@netlify/functions";

/**
 * Netlify Scheduled Function - Polls for new chat messages
 * This runs automatically on a schedule to check for new messages and respond to bot mentions
 */
export const handler: Handler = async (event, context) => {
	console.log("🔄 Polling for new chat messages...");
	console.log("Event:", JSON.stringify(event, null, 2));

	try {
		// Get experience_id from environment variable or event payload
		const experienceId = 
			process.env.EXPERIENCE_ID || 
			event.queryStringParameters?.experience_id ||
			(event.body ? JSON.parse(event.body)?.experience_id : null);

		if (!experienceId) {
			console.error("❌ No experience_id found. Set EXPERIENCE_ID environment variable in Netlify.");
			return {
				statusCode: 400,
				body: JSON.stringify({
					error: "experience_id is required",
					hint: "Set EXPERIENCE_ID environment variable in Netlify Dashboard → Site Settings → Environment Variables",
				}),
				headers: { "Content-Type": "application/json" },
			};
		}

		console.log(`📡 Polling experience: ${experienceId}`);

		// Call the polling endpoint
		const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || "https://aichatbotas.netlify.app";
		const pollUrl = `${baseUrl}/api/chat/poll`;

		console.log(`Calling polling endpoint: ${pollUrl}`);

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
				headers: { "Content-Type": "application/json" },
			};
		}

		console.log(`✅ Polling complete: ${result.message || "No new mentions"}`);
		console.log(`Processed ${result.processed || 0} mentions`);

		return {
			statusCode: 200,
			body: JSON.stringify(result),
			headers: { "Content-Type": "application/json" },
		};
	} catch (error: any) {
		console.error("❌ Error in scheduled poll function:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({
				error: "Failed to poll chat",
				details: error.message,
			}),
			headers: { "Content-Type": "application/json" },
		};
	}
};

