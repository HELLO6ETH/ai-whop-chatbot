"use client";

import { Button } from "@whop/react/components";
import { useState, useEffect } from "react";

interface BotConfig {
	bot_name: string;
	bot_avatar_url: string | null;
	personality: "friendly" | "professional" | "motivational";
	channel_id: string | null;
}

interface TrainingDoc {
	id: string;
	file_name: string | null;
	file_type: "text" | "pdf";
	content: string;
	created_at: string;
}

export default function BotConfigForm({
	experienceId,
	experience,
}: {
	experienceId: string;
	experience?: any;
}) {
	const [config, setConfig] = useState<BotConfig>({
		bot_name: "CoachBot",
		bot_avatar_url: null,
		personality: "friendly",
		channel_id: null,
	});
	const [textContent, setTextContent] = useState("");
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [documents, setDocuments] = useState<TrainingDoc[]>([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
	const [uploadingAvatar, setUploadingAvatar] = useState(false);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

	// Load existing config and documents
	useEffect(() => {
		loadConfig();
		loadDocuments();
	}, [experienceId]);

	const loadConfig = async () => {
		try {
			const url = `/api/config?experience_id=${experienceId}`;
			console.log("Fetching config from:", url);
			
			const response = await fetch(url, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			}).catch((fetchError) => {
				console.error("Fetch error (network level):", fetchError);
				throw new Error(`Network error: ${fetchError.message}. Make sure the dev server is running.`);
			});
			
			// Check if response is JSON
			const contentType = response.headers.get("content-type");
			if (!contentType?.includes("application/json")) {
				const text = await response.text();
				console.error("Non-JSON response from /api/config:", text.substring(0, 200));
				console.error("Response status:", response.status, response.statusText);
				
				// Try to extract useful info from HTML error page
				setMessage({ 
					type: "error", 
					text: `Server error (${response.status} ${response.statusText}). Check that environment variables are set correctly.` 
				});
				return;
			}
			
			if (response.ok) {
				const data = await response.json();
				setConfig(data);
				// Set preview if avatar URL exists
				if (data.bot_avatar_url) {
					setAvatarPreview(data.bot_avatar_url);
				}
			} else {
				// Try to parse error, but handle if it's not JSON
				let error: any;
				try {
					const text = await response.text();
					console.error("Response body (text):", text.substring(0, 500));
					if (text.trim()) {
						error = JSON.parse(text);
					} else {
						error = { 
							error: `HTTP ${response.status} ${response.statusText}`,
							message: `Server returned empty response with status ${response.status}`
						};
					}
				} catch (parseError) {
					error = { 
						error: `HTTP ${response.status} ${response.statusText}`,
						message: `Failed to parse response: ${parseError}`
					};
				}
				
				console.error("Error loading config - Status:", response.status, "Error object:", error);
				
				// Handle specific error types
				if (error && error.error === "Authentication failed") {
					setMessage({ type: "error", text: "Please refresh the page - authentication may have expired." });
				} else if (error && error.error === "Failed to connect to Supabase database") {
					const troubleshooting = error.troubleshooting || "Please check your Supabase configuration in .env.local";
					const details = error.details ? `\n\nDetails: ${error.details}` : "";
					setMessage({ 
						type: "error", 
						text: `Supabase Connection Error${details}\n\n${troubleshooting}` 
					});
				} else if (error && error.error) {
					setMessage({ type: "error", text: error.error });
				} else if (response.status >= 500) {
					setMessage({ type: "error", text: `Server error (${response.status}). This usually means:\n1. Supabase project doesn't exist or is paused\n2. Database tables haven't been created\n3. Environment variables are incorrect\n\nCheck SUPABASE_SETUP_TROUBLESHOOTING.md for help.` });
				} else {
					setMessage({ type: "error", text: `Failed to load configuration (${response.status})` });
				}
			}
		} catch (error: any) {
			console.error("Error loading config:", error);
			const errorMessage = error.message || "Failed to load configuration";
			
			// Provide more specific error messages for common network issues
			if (errorMessage.includes("fetch failed") || errorMessage.includes("Network error")) {
				setMessage({ 
					type: "error", 
					text: "Cannot connect to server. Please ensure:\n1. The dev server is running (pnpm dev)\n2. You're accessing through the Whop proxy\n3. Check the browser console for details"
				});
			} else {
				setMessage({ type: "error", text: errorMessage });
			}
		}
	};

	const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		// Validate file type
		if (!file.type.startsWith("image/")) {
			setMessage({ type: "error", text: "Please select an image file" });
			return;
		}

		// Show preview
		const reader = new FileReader();
		reader.onloadend = () => {
			setAvatarPreview(reader.result as string);
		};
		reader.readAsDataURL(file);

		// Upload file
		setUploadingAvatar(true);
		setMessage(null);

		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("experience_id", experienceId);

			const response = await fetch("/api/upload/avatar", {
				method: "POST",
				body: formData,
			}).catch((fetchError) => {
				console.error("Fetch error (network level):", fetchError);
				throw new Error(`Network error: ${fetchError.message}. Make sure the dev server is running.`);
			});

			if (response.ok) {
				const data = await response.json();
				setConfig({ ...config, bot_avatar_url: data.url });
				setMessage({ type: "success", text: "Avatar uploaded successfully!" });
			} else {
				const error = await response.json();
				setMessage({ type: "error", text: error.error || "Failed to upload avatar" });
				setAvatarPreview(null);
			}
		} catch (error: any) {
			setMessage({ type: "error", text: error.message || "Failed to upload avatar" });
			setAvatarPreview(null);
		} finally {
			setUploadingAvatar(false);
		}
	};

	const loadDocuments = async () => {
		try {
			const url = `/api/training?experience_id=${experienceId}`;
			console.log("Fetching documents from:", url);
			
			const response = await fetch(url, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			}).catch((fetchError) => {
				console.error("Fetch error (network level):", fetchError);
				throw new Error(`Network error: ${fetchError.message}. Make sure the dev server is running.`);
			});
			
			// Check if response is JSON
			const contentType = response.headers.get("content-type");
			if (!contentType?.includes("application/json")) {
				const text = await response.text();
				console.error("Non-JSON response from /api/training:", text.substring(0, 200));
				
				// Try to extract useful info from HTML error page
				const statusText = response.statusText || "Unknown error";
				setMessage({ 
					type: "error", 
					text: `Server error (${response.status} ${statusText}). The API route may have crashed. Check server logs.` 
				});
				return;
			}
			
			if (response.ok) {
				const data = await response.json();
				setDocuments(data.documents || []);
			} else {
				// Try to parse error, but handle if it's not JSON
				let error: any;
				try {
					const text = await response.text();
					console.error("Response body (text):", text.substring(0, 500));
					if (text.trim()) {
						error = JSON.parse(text);
					} else {
						error = { 
							error: `HTTP ${response.status} ${response.statusText}`,
							message: `Server returned empty response with status ${response.status}`
						};
					}
				} catch (parseError) {
					error = { 
						error: `HTTP ${response.status} ${response.statusText}`,
						message: `Failed to parse response: ${parseError}`
					};
				}
				
				console.error("Error loading documents - Status:", response.status, "Error object:", error);
				
				// Handle specific error types
				if (error && error.error === "Authentication failed") {
					setMessage({ type: "error", text: "Please refresh the page - authentication may have expired." });
				} else if (error && error.error === "Failed to connect to Supabase database") {
					const troubleshooting = error.troubleshooting || "Please check your Supabase configuration in .env.local";
					const details = error.details ? `\n\nDetails: ${error.details}` : "";
					setMessage({ 
						type: "error", 
						text: `Supabase Connection Error${details}\n\n${troubleshooting}` 
					});
				} else if (error && error.error && !error.error.includes("HTTP")) {
					// Only show non-HTTP errors to avoid confusing messages
					setMessage({ type: "error", text: error.error });
				} else if (response.status >= 500) {
					setMessage({ type: "error", text: `Server error (${response.status}). This usually means:\n1. Supabase project doesn't exist or is paused\n2. Database tables haven't been created\n3. Environment variables are incorrect\n\nCheck SUPABASE_SETUP_TROUBLESHOOTING.md for help.` });
				} else {
					setMessage({ type: "error", text: `Failed to load documents (${response.status})` });
				}
			}
		} catch (error: any) {
			console.error("Error loading documents:", error);
			const errorMessage = error.message || "Failed to load documents";
			
			// Provide more specific error messages for common network issues
			if (errorMessage.includes("fetch failed") || errorMessage.includes("Network error")) {
				setMessage({ 
					type: "error", 
					text: "Cannot connect to server. Please ensure:\n1. The dev server is running (pnpm dev)\n2. You're accessing through the Whop proxy\n3. Check the browser console for details"
				});
			} else {
				setMessage({ type: "error", text: errorMessage });
			}
		}
	};

	const handleSaveConfig = async () => {
		setSaving(true);
		setMessage(null);

		try {
			const response = await fetch("/api/config", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					experience_id: experienceId,
					...config,
				}),
			}).catch((fetchError) => {
				console.error("Fetch error (network level):", fetchError);
				throw new Error(`Network error: ${fetchError.message}. Make sure the dev server is running.`);
			});

			if (response.ok) {
				setMessage({ type: "success", text: "Configuration saved successfully!" });
			} else {
				const error = await response.json();
				setMessage({ type: "error", text: error.error || "Failed to save configuration" });
			}
		} catch (error: any) {
			setMessage({ type: "error", text: error.message || "Failed to save configuration" });
		} finally {
			setSaving(false);
		}
	};

	const handleSaveAndTrain = async () => {
		if (!textContent.trim() && !selectedFile) {
			setMessage({ type: "error", text: "Please provide text content or upload a file" });
			return;
		}

		setLoading(true);
		setMessage(null);

		try {
			const formData = new FormData();
			formData.append("experience_id", experienceId);
			if (textContent.trim()) {
				formData.append("text_content", textContent);
			}
			if (selectedFile) {
				formData.append("file", selectedFile);
			}

			const response = await fetch("/api/training", {
				method: "POST",
				body: formData,
			}).catch((fetchError) => {
				console.error("Fetch error (network level):", fetchError);
				throw new Error(`Network error: ${fetchError.message}. Make sure the dev server is running.`);
			});

			if (response.ok) {
				const data = await response.json();
				setMessage({
					type: "success",
					text: "Training data processed! Embeddings generated successfully.",
				});
				setTextContent("");
				setSelectedFile(null);
				loadDocuments();
			} else {
				const error = await response.json();
				setMessage({ type: "error", text: error.error || "Failed to process training data" });
			}
		} catch (error: any) {
			setMessage({ type: "error", text: error.message || "Failed to process training data" });
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteDoc = async (docId: string) => {
		if (!confirm("Are you sure you want to delete this document?")) {
			return;
		}

		try {
			const response = await fetch(
				`/api/training?experience_id=${experienceId}&doc_id=${docId}`,
				{ method: "DELETE" },
			).catch((fetchError) => {
				console.error("Fetch error (network level):", fetchError);
				throw new Error(`Network error: ${fetchError.message}. Make sure the dev server is running.`);
			});

			if (response.ok) {
				setMessage({ type: "success", text: "Document deleted successfully" });
				loadDocuments();
			} else {
				const error = await response.json();
				setMessage({ type: "error", text: error.error || "Failed to delete document" });
			}
		} catch (error: any) {
			setMessage({ type: "error", text: error.message || "Failed to delete document" });
		}
	};

	return (
		<div className="flex flex-col gap-6">
			{/* Bot Configuration Section */}
			<div className="border border-gray-a4 rounded-lg p-6 bg-gray-a2">
				<h2 className="text-6 font-bold mb-4">Bot Settings</h2>

				<div className="flex flex-col gap-4">
					<div>
						<label className="block text-sm font-medium mb-2">Bot Name</label>
						<input
							type="text"
							value={config.bot_name}
							onChange={(e) => setConfig({ ...config, bot_name: e.target.value })}
							className="w-full px-3 py-2 border border-gray-a4 rounded-lg bg-gray-a1 text-gray-12"
							placeholder="CoachBot"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium mb-2">Bot Avatar</label>
						
						{/* Preview */}
						{avatarPreview && (
							<div className="mb-3">
								<img
									src={avatarPreview}
									alt="Avatar preview"
									className="w-24 h-24 rounded-full object-cover border border-gray-a4"
								/>
							</div>
						)}

						{/* File Upload */}
						<div className="flex flex-col gap-2">
							<input
								type="file"
								accept="image/*"
								onChange={handleAvatarUpload}
								disabled={uploadingAvatar}
								className="w-full px-3 py-2 border border-gray-a4 rounded-lg bg-gray-a1 text-gray-12 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-gray-a4 file:text-gray-12 hover:file:bg-gray-a5"
							/>
							{uploadingAvatar && (
								<p className="text-xs text-gray-10">Uploading...</p>
							)}
							<p className="text-xs text-gray-10">
								Upload an image file for your bot's avatar (PNG, JPG, GIF - max 5MB)
							</p>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium mb-2">Personality</label>
						<select
							value={config.personality}
							onChange={(e) =>
								setConfig({
									...config,
									personality: e.target.value as BotConfig["personality"],
								})
							}
							className="w-full px-3 py-2 border border-gray-a4 rounded-lg bg-gray-a1 text-gray-12"
						>
							<option value="friendly">Friendly</option>
							<option value="professional">Professional</option>
							<option value="motivational">Motivational</option>
						</select>
					</div>

					{/* Webhook Info - Automatically configured */}
					<div className="p-4 bg-green-a1 border border-green-a4 rounded-lg">
						<p className="text-sm font-semibold mb-2 text-green-11">✅ Ready to Use!</p>
						<p className="text-xs text-green-10 mb-2">
							The bot is automatically configured to receive chat messages via webhooks. No additional setup needed!
						</p>
						<p className="text-xs text-green-10">
							<strong>How it works:</strong> When users mention your bot in chat (e.g., "@CoachBot"),
							Whop automatically sends the message to your bot, and it will respond instantly.
						</p>
					</div>

					<Button
						variant="classic"
						onClick={handleSaveConfig}
						disabled={saving}
						className="w-full"
					>
						{saving ? "Saving..." : "Save Configuration"}
					</Button>
				</div>
			</div>

			{/* Knowledge Base Section */}
			<div className="border border-gray-a4 rounded-lg p-6 bg-gray-a2">
				<h2 className="text-6 font-bold mb-4">Knowledge Base</h2>

				<div className="flex flex-col gap-4">
					<div>
						<label className="block text-sm font-medium mb-2">Add Training Text</label>
						<textarea
							value={textContent}
							onChange={(e) => setTextContent(e.target.value)}
							className="w-full px-3 py-2 border border-gray-a4 rounded-lg bg-gray-a1 text-gray-12 min-h-[150px]"
							placeholder="Enter training text here... The bot will learn from this content."
						/>
					</div>

					<div>
						<label className="block text-sm font-medium mb-2">Or Upload PDF</label>
						<input
							type="file"
							accept=".pdf"
							onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
							className="w-full px-3 py-2 border border-gray-a4 rounded-lg bg-gray-a1 text-gray-12"
						/>
						{selectedFile && (
							<p className="text-xs text-gray-10 mt-1">Selected: {selectedFile.name}</p>
						)}
					</div>

					<Button
						variant="classic"
						onClick={handleSaveAndTrain}
						disabled={loading || (!textContent.trim() && !selectedFile)}
						className="w-full"
					>
						{loading ? "Processing..." : "Save & Train"}
					</Button>
				</div>

				{/* Existing Documents */}
				{documents.length > 0 && (
					<div className="mt-6">
						<h3 className="text-5 font-semibold mb-3">Training Documents</h3>
						<div className="flex flex-col gap-2">
							{documents.map((doc) => (
								<div
									key={doc.id}
									className="flex items-center justify-between p-3 bg-gray-a1 rounded-lg border border-gray-a4"
								>
									<div>
										<p className="text-sm font-medium">
											{doc.file_name || "Text Document"}
										</p>
										<p className="text-xs text-gray-10">
											{doc.file_type.toUpperCase()} •{" "}
											{new Date(doc.created_at).toLocaleDateString()}
										</p>
									</div>
									<Button
										variant="ghost"
										size="2"
										onClick={() => handleDeleteDoc(doc.id)}
										className="text-red-10"
									>
										Delete
									</Button>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Webhook Setup Info */}
			<div className="border border-gray-a4 rounded-lg p-6 bg-gray-a2">
				<h2 className="text-6 font-bold mb-4">Webhook Setup</h2>
				<p className="text-sm text-gray-10 mb-4">
					To enable the bot to automatically respond to mentions, set up a polling service or
					configure webhooks:
				</p>
				<div className="bg-gray-a1 p-4 rounded-lg border border-gray-a4">
					<code className="text-xs text-gray-10 block mb-2">
						POST /api/chat/poll
					</code>
					<p className="text-xs text-gray-10">
						Call this endpoint every 10-15 seconds to check for new mentions. For production, use
						a cron job or scheduled function.
					</p>
				</div>
			</div>

			{/* Messages */}
			{message && (
				<div
					className={`p-4 rounded-lg ${
						message.type === "success"
							? "bg-green-a2 border border-green-a4"
							: "bg-red-a2 border border-red-a4"
					}`}
				>
					<p className={`text-sm whitespace-pre-line ${message.type === "success" ? "text-green-11" : "text-red-11"}`}>
						{message.text}
					</p>
				</div>
			)}
		</div>
	);
}

