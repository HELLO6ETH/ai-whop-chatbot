import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error("Missing Supabase environment variables:");
	console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
	console.error("SUPABASE_SERVICE_ROLE_KEY:", supabaseKey ? "✅ Set" : "❌ Missing");
	// Don't throw immediately - let it fail gracefully in API routes
}

export const supabase = supabaseUrl && supabaseKey 
	? createClient(supabaseUrl, supabaseKey, {
			auth: {
				persistSession: false,
				autoRefreshToken: false,
			},
		})
	: null as any; // Will be checked in API routes

// Database types
export interface BotConfig {
	id: string;
	experience_id: string;
	bot_name: string;
	bot_avatar_url: string | null;
	personality: "friendly" | "professional" | "motivational";
	channel_id: string | null;
	created_at: string;
	updated_at: string;
}

export interface TrainingDoc {
	id: string;
	experience_id: string;
	content: string;
	file_name: string | null;
	file_type: "text" | "pdf";
	created_at: string;
	updated_at: string;
}

export interface Embedding {
	id: string;
	experience_id: string;
	content: string;
	embedding: number[];
	metadata: {
		doc_id?: string;
		chunk_index?: number;
	};
	created_at: string;
}

export interface ChatMessage {
	id: string;
	experience_id: string;
	channel_id: string;
	message_id: string;
	user_id: string;
	content: string;
	response: string | null;
	created_at: string;
}

