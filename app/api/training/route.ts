import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { supabase } from "@/lib/supabase";
import { processTrainingData } from "@/lib/ai";
import { extractTextFromPDF } from "@/lib/pdf-parser";

/**
 * POST /api/training - Save training data and generate embeddings
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	// Ensure we always return JSON, even on unexpected errors
	try {
		// Verify user authentication
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
		const formData = await request.formData();

		const experienceId = formData.get("experience_id") as string;
		const textContent = formData.get("text_content") as string | null;
		const file = formData.get("file") as File | null;
		const docId = formData.get("doc_id") as string | null;

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
			return NextResponse.json({ error: "Admin access required" }, { status: 403, headers: { "Content-Type": "application/json" } });
		}

		let content = "";
		let fileName: string | null = null;
		let fileType: "text" | "pdf" = "text";

		if (file) {
			// Handle file upload
			fileName = file.name;
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			if (file.type === "application/pdf") {
				content = await extractTextFromPDF(buffer);
				fileType = "pdf";
			} else {
				// Assume text file
				content = buffer.toString("utf-8");
				fileType = "text";
			}
		} else if (textContent) {
			content = textContent;
		} else {
			return NextResponse.json({ error: "Either text_content or file is required" }, { status: 400 });
		}

		if (!content.trim()) {
			return NextResponse.json({ error: "Content cannot be empty" }, { status: 400 });
		}

		// Save or update training document
		let savedDocId = docId;

		if (docId) {
			// Update existing document
			const { error } = await supabase
				.from("training_docs")
				.update({
					content,
					file_name: fileName,
					file_type: fileType,
					updated_at: new Date().toISOString(),
				})
				.eq("id", docId)
				.eq("experience_id", experienceId);

			if (error) throw error;
		} else {
			// Create new document
			const { data, error } = await supabase
				.from("training_docs")
				.insert({
					experience_id: experienceId,
					content,
					file_name: fileName,
					file_type: fileType,
				})
				.select()
				.single();

			if (error) throw error;
			savedDocId = data.id;
		}

		// Delete old embeddings for this document if updating
		if (docId) {
			await supabase
				.from("embeddings")
				.delete()
				.eq("experience_id", experienceId)
				.eq("metadata->>doc_id", docId);
		}

		// Process and store embeddings
		try {
			await processTrainingData(experienceId, content, savedDocId || undefined);
		} catch (embeddingError: any) {
			console.error("Error processing embeddings:", embeddingError);
			console.error("Error stack:", embeddingError.stack);
			console.error("Error details:", JSON.stringify(embeddingError, null, 2));
			
			// Return detailed error information
			const errorMessage = embeddingError.message || embeddingError.toString() || "Unknown embedding error";
			const isEmbeddingError = 
				errorMessage.includes("Invalid array length") || 
				errorMessage.includes("embedding length") ||
				errorMessage.includes("Invalid embedding") ||
				errorMessage.includes("embedding") ||
				errorMessage.includes("OpenAI") ||
				embeddingError.name === "RangeError";
			
			if (isEmbeddingError) {
				return NextResponse.json(
					{ 
						error: "Failed to generate embeddings",
						details: errorMessage,
						hint: "Check: 1) OpenAI API key is valid 2) You have API credits 3) Text content is not empty",
						debug: process.env.NODE_ENV === "development" ? embeddingError.stack : undefined
					},
					{ status: 500, headers: { "Content-Type": "application/json" } },
				);
			}
			throw embeddingError; // Re-throw if it's a different error
		}

		return NextResponse.json({
			success: true,
			doc_id: savedDocId,
			message: "Training data processed and embeddings generated",
		});
	} catch (error: any) {
		console.error("Error processing training data:", error);
		
		// Provide more specific error messages
		let errorMessage = error.message || "Failed to process training data";
		if (error.message?.includes("Invalid array length")) {
			errorMessage = "Embedding generation failed: Invalid array length. Please check your OpenAI API key and try again.";
		} else if (error.message?.includes("embedding")) {
			errorMessage = `Embedding error: ${error.message}`;
		}
		
		return NextResponse.json(
			{ 
				error: errorMessage,
				details: error.stack ? undefined : error.toString()
			},
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}

/**
 * GET /api/training - Get training documents for an experience
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
			return NextResponse.json({ error: "Admin access required" }, { status: 403, headers: { "Content-Type": "application/json" } });
		}

		let result: any;
		try {
			result = await supabase
				.from("training_docs")
				.select("*")
				.eq("experience_id", experienceId)
				.order("created_at", { ascending: false });
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

		if (supabaseError) {
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

		// Return empty array if no documents (normal for first-time setup)
		return NextResponse.json({ documents: data || [] }, {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error: any) {
		console.error("Error fetching training documents:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to fetch documents" },
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}

/**
 * DELETE /api/training - Delete a training document
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
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
		const docId = searchParams.get("doc_id");

		if (!experienceId || !docId) {
			return NextResponse.json({ error: "experience_id and doc_id are required" }, { status: 400 });
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
			return NextResponse.json({ error: "Admin access required" }, { status: 403, headers: { "Content-Type": "application/json" } });
		}

		// Delete document
		const { error: docError } = await supabase
			.from("training_docs")
			.delete()
			.eq("id", docId)
			.eq("experience_id", experienceId);

		if (docError) throw docError;

		// Delete associated embeddings
		await supabase
			.from("embeddings")
			.delete()
			.eq("experience_id", experienceId)
			.eq("metadata->>doc_id", docId);

		return NextResponse.json({ success: true, message: "Document deleted" });
	} catch (error: any) {
		console.error("Error deleting document:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to delete document" },
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}

