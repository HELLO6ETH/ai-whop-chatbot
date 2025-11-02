-- Supabase Database Setup for AI Coach Bot
-- Run this in your Supabase SQL Editor

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Bot configuration table
CREATE TABLE IF NOT EXISTS bot_config (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	experience_id TEXT NOT NULL UNIQUE,
	bot_name TEXT NOT NULL DEFAULT 'CoachBot',
	bot_avatar_url TEXT,
	personality TEXT NOT NULL DEFAULT 'friendly' CHECK (personality IN ('friendly', 'professional', 'motivational')),
	channel_id TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training documents table
CREATE TABLE IF NOT EXISTS training_docs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	experience_id TEXT NOT NULL,
	content TEXT NOT NULL,
	file_name TEXT,
	file_type TEXT NOT NULL DEFAULT 'text' CHECK (file_type IN ('text', 'pdf')),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Embeddings table with vector column
CREATE TABLE IF NOT EXISTS embeddings (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	experience_id TEXT NOT NULL,
	content TEXT NOT NULL,
	embedding vector(1536), -- OpenAI text-embedding-3-small produces 1536-dimensional vectors
	metadata JSONB DEFAULT '{}',
	created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	experience_id TEXT NOT NULL,
	channel_id TEXT NOT NULL,
	message_id TEXT NOT NULL,
	user_id TEXT NOT NULL,
	content TEXT NOT NULL,
	response TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bot_config_experience ON bot_config(experience_id);
CREATE INDEX IF NOT EXISTS idx_training_docs_experience ON training_docs(experience_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_experience ON embeddings(experience_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_experience ON chat_messages(experience_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_message_id ON chat_messages(message_id);

-- Vector similarity search function (using cosine distance)
CREATE OR REPLACE FUNCTION match_embeddings(
	query_embedding vector(1536),
	experience_id TEXT,
	match_threshold float DEFAULT 0.7,
	match_count int DEFAULT 5
)
RETURNS TABLE (
	id UUID,
	content TEXT,
	similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
	RETURN QUERY
	SELECT
		embeddings.id,
		embeddings.content,
		1 - (embeddings.embedding <=> query_embedding) AS similarity
	FROM embeddings
	WHERE embeddings.experience_id = match_embeddings.experience_id
		AND 1 - (embeddings.embedding <=> query_embedding) > match_threshold
	ORDER BY embeddings.embedding <=> query_embedding
	LIMIT match_count;
END;
$$;

-- Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE bot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to do anything (for server-side operations)
CREATE POLICY "Service role full access" ON bot_config FOR ALL USING (true);
CREATE POLICY "Service role full access" ON training_docs FOR ALL USING (true);
CREATE POLICY "Service role full access" ON embeddings FOR ALL USING (true);
CREATE POLICY "Service role full access" ON chat_messages FOR ALL USING (true);

-- Note: Since we're using the service role key in the server, these policies
-- allow full access. If you want to add client-side access, create more restrictive policies.

-- Storage bucket for bot avatars (optional - app will fallback to base64 if not configured)
-- To set up:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Create a new bucket called "bot-avatars"
-- 3. Set it to public (or configure RLS policies)
-- 4. The app will automatically use this bucket for avatar uploads

