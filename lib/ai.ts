import OpenAI from "openai";
import { supabase, type Embedding } from "./supabase";

const EMBEDDING_MODEL = "text-embedding-3-small";
const CHAT_MODEL = "gpt-4-turbo-preview";

// Lazy initialization of OpenAI client to ensure environment variables are loaded
function getOpenAIClient(): OpenAI {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		throw new Error("OPENAI_API_KEY environment variable is not set");
	}
	return new OpenAI({
		apiKey,
	});
}

/**
 * Generate embeddings for text content
 */
export async function generateEmbedding(text: string): Promise<number[]> {
	if (!text || !text.trim()) {
		throw new Error("Text cannot be empty for embedding generation");
	}

	if (!process.env.OPENAI_API_KEY) {
		throw new Error("OPENAI_API_KEY environment variable is not set");
	}

	try {
		const openai = getOpenAIClient();
		const response = await openai.embeddings.create({
			model: EMBEDDING_MODEL,
			input: text.replace(/\n/g, " "),
		});

	const embedding = response.data[0]?.embedding;
	
	if (!embedding || !Array.isArray(embedding)) {
		throw new Error("Invalid embedding response from OpenAI");
	}

	// Validate embedding array length and values
	if (embedding.length === 0) {
		throw new Error("Embedding array is empty");
	}

	// Check for invalid numeric values before processing
	if (embedding.some(val => !Number.isFinite(val))) {
		throw new Error("Embedding contains invalid values (NaN or Infinity)");
	}

	// Handle length mismatch
	if (embedding.length !== 1536) {
		console.warn(`Warning: Embedding length is ${embedding.length}, expected 1536`);
		
		if (embedding.length > 1536) {
			// Truncate to 1536
			return embedding.slice(0, 1536);
		} else {
			// Safely pad to 1536 with zeros
			const paddingLength = 1536 - embedding.length;
			if (paddingLength <= 0 || !Number.isInteger(paddingLength) || paddingLength > 1536) {
				console.error(`Invalid padding calculation: embedding length=${embedding.length}, padding=${paddingLength}`);
				throw new Error(`Invalid embedding length: ${embedding.length} (expected 1536)`);
			}
			return [...embedding, ...Array(paddingLength).fill(0)];
		}
	}

		return embedding;
	} catch (error: any) {
		console.error("OpenAI API error:", error);
		if (error.status === 401) {
			throw new Error("OpenAI API key is invalid or expired");
		} else if (error.status === 429) {
			throw new Error("OpenAI API rate limit exceeded. Please try again later.");
		} else if (error.status === 500) {
			throw new Error("OpenAI API server error. Please try again later.");
		} else {
			throw new Error(`OpenAI API error: ${error.message || error.toString()}`);
		}
	}
}

/**
 * Split text into chunks for embedding
 */
export function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
	const chunks: string[] = [];
	let start = 0;
	
	// Ensure overlap is less than chunkSize to prevent infinite loops
	const safeOverlap = Math.min(overlap, Math.max(1, chunkSize - 1));
	
	// Safety limit to prevent infinite loops
	const maxChunks = 10000;
	let iterations = 0;

	while (start < text.length && iterations < maxChunks) {
		iterations++;
		const end = Math.min(start + chunkSize, text.length);
		const chunk = text.slice(start, end);
		
		// Only push non-empty chunks
		if (chunk.length > 0) {
			chunks.push(chunk);
		}
		
		// Calculate next start position
		const nextStart = end - safeOverlap;
		
		// Ensure we always make progress (prevent infinite loop)
		if (nextStart <= start) {
			// Force progress by moving forward at least 1 character
			start = start + 1;
		} else {
			start = nextStart;
		}
	}

	if (iterations >= maxChunks) {
		console.warn(`chunkText stopped after ${maxChunks} iterations to prevent infinite loop`);
	}

	return chunks;
}

/**
 * Find relevant embeddings for a query
 */
export async function findRelevantContext(
	query: string,
	experienceId: string,
	limit = 5,
): Promise<string[]> {
	// Generate embedding for the query
	const queryEmbedding = await generateEmbedding(query);

	// Use Supabase vector search (pgvector)
	// Note: This assumes you've set up the embeddings table with a vector column
	const { data, error } = await supabase.rpc("match_embeddings", {
		query_embedding: queryEmbedding,
		experience_id: experienceId,
		match_threshold: 0.7,
		match_count: limit,
	});

	if (error) {
		console.error("Error finding relevant context:", error);
		// Fallback: simple text search
		const { data: fallbackData } = await supabase
			.from("embeddings")
			.select("content")
			.eq("experience_id", experienceId)
			.limit(limit);

		return fallbackData?.map((e: { content: string }) => e.content) || [];
	}

	return data?.map((item: { content: string }) => item.content) || [];
}

/**
 * Generate AI response using OpenAI
 */
export async function generateResponse(
	question: string,
	experienceId: string,
	personality: "friendly" | "professional" | "motivational" = "friendly",
	botName: string = "CoachBot",
): Promise<string> {
	// Get relevant context from embeddings
	const contextChunks = await findRelevantContext(question, experienceId);

	// Build system prompt based on personality
	const personalityPrompts = {
		friendly: "You are a helpful, friendly AI coach that responds in a warm and approachable manner.",
		professional: "You are a professional AI coach that provides clear, concise, and expert advice.",
		motivational: "You are an energetic, motivational AI coach that inspires and encourages users.",
	};

	const systemPrompt = `${personalityPrompts[personality]}

Your name is ${botName}. You are trained on custom knowledge provided by the community admin.

When answering questions:
- Use the context provided below to ground your responses
- If the context doesn't contain relevant information, say so honestly
- Keep responses concise but helpful
- Maintain the ${personality} tone throughout

Context from knowledge base:
${contextChunks.join("\n\n---\n\n")}`;

	try {
		const openai = getOpenAIClient();
		const completion = await openai.chat.completions.create({
			model: CHAT_MODEL,
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: question },
			],
			temperature: 0.7,
			max_tokens: 500,
		});

		return completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
	} catch (error) {
		console.error("Error generating response:", error);
		throw new Error("Failed to generate AI response");
	}
}

/**
 * Process and store training data with embeddings
 */
export async function processTrainingData(
	experienceId: string,
	content: string,
	docId?: string,
): Promise<void> {
	if (!content || !content.trim()) {
		throw new Error("Content cannot be empty for training");
	}

	// Split content into chunks
	const chunks = chunkText(content);
	
	if (chunks.length === 0) {
		throw new Error("No text chunks created from content");
	}

	console.log(`Processing ${chunks.length} chunks for experience ${experienceId}`);

	// Generate embeddings for each chunk and store
	const embeddingPromises = chunks.map(async (chunk, index) => {
		try {
			console.log(`Generating embedding for chunk ${index + 1}/${chunks.length}`);
			const embedding = await generateEmbedding(chunk);

			// Validate embedding before inserting
			if (!embedding || !Array.isArray(embedding)) {
				throw new Error(`Invalid embedding: not an array`);
			}
			
			if (embedding.length !== 1536) {
				throw new Error(`Invalid embedding length: expected 1536, got ${embedding.length}`);
			}

			// Check for invalid values (NaN, Infinity, etc.)
			const invalidValues = embedding.filter(val => !Number.isFinite(val));
			if (invalidValues.length > 0) {
				console.error(`Found ${invalidValues.length} invalid values in embedding`);
				throw new Error(`Embedding contains ${invalidValues.length} invalid numeric values (NaN or Infinity)`);
			}

			const embeddingData = {
				experience_id: experienceId,
				content: chunk,
				embedding: embedding, // Should be array of 1536 numbers
				metadata: {
					doc_id: docId || null,
					chunk_index: index,
				},
			};

			// Insert into embeddings table
			const { error: insertError, data: insertData } = await supabase.from("embeddings").insert(embeddingData);
			
			if (insertError) {
				console.error(`Error inserting embedding for chunk ${index}:`, insertError);
				throw new Error(`Failed to insert embedding into database: ${insertError.message || insertError.code}`);
			}
			
			console.log(`Successfully stored embedding for chunk ${index + 1}`);
		} catch (error: any) {
			console.error(`Error processing chunk ${index}:`, error);
			console.error(`Chunk content (first 100 chars):`, chunk.substring(0, 100));
			// Re-throw with context
			throw new Error(`Failed to process chunk ${index + 1}/${chunks.length}: ${error.message || error.toString()}`);
		}
	});

	try {
		await Promise.all(embeddingPromises);
		console.log(`Successfully processed all ${chunks.length} chunks`);
	} catch (error: any) {
		console.error("Error in Promise.all for embeddings:", error);
		throw error;
	}
}

