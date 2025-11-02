# AI Coach Bot - Setup Guide

## Prerequisites

1. **Whop App Account**: You need a Whop developer account and an app created
2. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
3. **OpenAI API Key**: Get one from [platform.openai.com](https://platform.openai.com)

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Whop App Configuration
NEXT_PUBLIC_WHOP_APP_ID=your_app_id
WHOP_API_KEY=your_api_key
WHOP_WEBHOOK_SECRET=your_webhook_secret

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=sk-your_openai_api_key
```

## Supabase Setup

1. **Create a new Supabase project** at [supabase.com](https://supabase.com)

2. **Run the SQL migration**:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `supabase-setup.sql`
   - Execute the SQL

3. **Get your Supabase credentials**:
   - Go to Project Settings → API
   - Copy the `URL` (for `NEXT_PUBLIC_SUPABASE_URL`)
   - Copy the `service_role` key (for `SUPABASE_SERVICE_ROLE_KEY`)
   - ⚠️ Keep the service role key secret - it has admin access!

4. **Set up Storage bucket for avatars (optional)**:
   - Go to Storage in your Supabase dashboard
   - Create a new bucket called `bot-avatars`
   - Make it public (or configure appropriate RLS policies)
   - If you don't set this up, avatars will be stored as base64 (less efficient but works)

## Installation

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Run the development server**:
   ```bash
   pnpm dev
   ```

3. **Access your app**:
   - The app will be available through the Whop proxy
   - Navigate to your experience page: `/experiences/[experienceId]`

## Configuring the Bot

1. **Install the app** in your Whop community/experience

2. **Navigate to the admin dashboard**:
   - Go to `/experiences/[your-experience-id]`
   - You must have admin access to the experience

3. **Configure the bot**:
   - Set the bot name (default: "CoachBot")
   - Upload an avatar image file
   - Choose personality: friendly, professional, or motivational
   - **No channel ID needed!** The bot uses webhooks which automatically include channel information

4. **Add training data**:
   - Enter text directly in the text area, OR
   - Upload a PDF file
   - Click "Save & Train" to process and generate embeddings

5. **Save configuration**:
   - Click "Save Configuration" to save bot settings

## Webhooks (Automatic)

The bot uses webhooks to receive chat messages in real-time - and it's **automatically configured** when you install the app!

### How It Works

- When you install the app in your Whop community, webhooks are automatically set up
- When a user mentions your bot in chat, Whop sends a webhook event
- The webhook endpoint (`/api/chat/webhook`) processes the message
- The bot generates a response using AI
- The bot replies automatically in the chat

**No manual webhook configuration needed!** Just install the app and it works.

## How It Works

1. **Admin Configuration**: Admins configure the bot through the dashboard
2. **Training Data**: Text/PDFs are processed and embedded using OpenAI
3. **Vector Search**: When users ask questions, relevant context is found using vector similarity
4. **AI Response**: GPT-4 generates responses grounded in the training data
5. **Chat Interaction**: Bot listens for mentions (e.g., "@CoachBot") and responds

## API Endpoints

- `GET /api/config?experience_id=xxx` - Get bot configuration
- `POST /api/config` - Save bot configuration
- `GET /api/training?experience_id=xxx` - List training documents
- `POST /api/training` - Upload training data
- `DELETE /api/training?experience_id=xxx&doc_id=yyy` - Delete training document
- `POST /api/chat/webhook` - Webhook endpoint (receives chat events from Whop)

## Notes

- The bot responds to mentions like "@CoachBot" or just "CoachBot" in messages
- Embeddings are generated using OpenAI's `text-embedding-3-small` model
- Chat responses use GPT-4-turbo
- All data is scoped per experience_id

## Troubleshooting

1. **Bot not responding**: 
   - Verify webhook URL is configured in Whop dashboard: `/api/chat/webhook`
   - Check that webhook events are enabled for `chat.message.created`
   - Verify `WHOP_WEBHOOK_SECRET` environment variable is set
   - Check that training data has been added
   - Test webhook by mentioning the bot in chat and checking server logs

2. **Embeddings not working**:
   - Ensure pgvector extension is enabled in Supabase
   - Verify the embeddings table was created correctly

3. **API errors**:
   - Check environment variables are set correctly
   - Verify API keys are valid
   - Check Supabase connection

