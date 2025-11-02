# AI Coach Bot - Quick Start Guide

Follow these steps to set up your AI Coach Bot:

## Step 1: Prerequisites

You'll need accounts for:
- **Whop**: Developer account with an app created
- **Supabase**: Free account at [supabase.com](https://supabase.com)
- **OpenAI**: API key from [platform.openai.com](https://platform.openai.com)

## Step 2: Clone & Install

```bash
# Clone or navigate to the project
cd chatbotai

# Install dependencies
pnpm install
```

## Step 3: Environment Variables

Create a `.env.local` file in the project root:

```env
# Whop App Configuration
NEXT_PUBLIC_WHOP_APP_ID=your_app_id_from_whop_dashboard
WHOP_API_KEY=your_api_key_from_whop_dashboard
WHOP_WEBHOOK_SECRET=your_webhook_secret_from_whop_dashboard

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_supabase

# OpenAI Configuration
OPENAI_API_KEY=sk-your_openai_api_key_here

# Optional: Webhook URL (for production)
NEXT_PUBLIC_WEBHOOK_URL=https://your-deployed-app.vercel.app
```

### Getting Your Credentials:

**Whop Credentials:**
1. Go to [Whop Developer Dashboard](https://whop.com/dashboard/developer/)
2. Create a new app or select your existing app
3. Go to Settings → API Keys
4. Copy your `App ID`, `API Key`, and `Webhook Secret`

**Supabase Credentials:**
1. Go to [supabase.com](https://supabase.com) and create a project
2. Go to Project Settings → API
3. Copy the `URL` (for `NEXT_PUBLIC_SUPABASE_URL`)
4. Copy the `service_role` key (for `SUPABASE_SERVICE_ROLE_KEY`)

**OpenAI API Key:**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Navigate to API Keys
3. Create a new secret key
4. Copy it to `OPENAI_API_KEY`

## Step 4: Set Up Supabase Database

1. **Run SQL Migration:**
   - Go to your Supabase dashboard
   - Click on SQL Editor
   - Copy the entire contents of `supabase-setup.sql`
   - Paste and run it in the SQL Editor
   - This creates all necessary tables

2. **Create Storage Bucket (Optional but Recommended):**
   - Go to Storage in Supabase dashboard
   - Click "New bucket"
   - Name it: `bot-avatars`
   - Make it **public**
   - Click "Create bucket"

## Step 5: Deploy Your App

### Option A: Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Add all environment variables from `.env.local`
5. Deploy!

### Option B: Run Locally

```bash
pnpm dev
```

The app will be available at `http://localhost:3000` (or the port shown)

## Step 6: Configure Whop App

1. **Go to Whop Developer Dashboard:**
   - Navigate to your app settings
   - Go to "Hosting" section

2. **Set App Paths:**
   - **Base URL**: Your deployed URL (e.g., `https://your-app.vercel.app`)
   - **App path**: `/experiences/[experienceId]`
   - **Dashboard path**: `/dashboard/[companyId]`
   - **Discover path**: `/discover`

3. **Webhooks are Automatic!**
   - Webhooks are automatically configured when you install the app
   - No manual setup needed - just install the app and it works!

## Step 7: Install App in Your Whop Community

1. Go to your Whop community/experience
2. Navigate to Settings → Tools/Apps
3. Find "AI Coach Bot" and click "Add" or "Install"
4. The app should now be installed

## Step 8: Configure the Bot

1. **Access Admin Dashboard:**
   - Go to `/experiences/[your-experience-id]`
   - You must be an admin of the experience

2. **Configure Bot Settings:**
   - **Bot Name**: Give your bot a name (default: "CoachBot")
   - **Avatar**: Upload an image file for the bot's avatar
   - **Personality**: Choose friendly, professional, or motivational

3. **Add Training Data:**
   - Enter text directly in the text area, OR
   - Upload a PDF document
   - Click "Save & Train" to process the data
   - The bot will learn from this content

4. **Save Configuration:**
   - Click "Save Configuration"

## Step 9: Test the Bot

1. Go to your Whop community's chat
2. Mention your bot (e.g., `@CoachBot What's a good risk/reward ratio?`)
3. The bot should respond automatically!

## Troubleshooting

**Bot not responding?**
- ✅ Check webhook URL is configured correctly in Whop dashboard
- ✅ Verify webhook events are enabled for `chat.message.created`
- ✅ Check that `WHOP_WEBHOOK_SECRET` matches in both places
- ✅ Ensure training data has been added
- ✅ Check server logs for errors

**Webhook not receiving events?**
- Verify the webhook URL is publicly accessible
- Check that webhook secret is correct
- Test webhook endpoint manually with a test event

**Database errors?**
- Ensure Supabase SQL migration ran successfully
- Verify environment variables are set correctly
- Check Supabase project is active

**Embeddings not working?**
- Verify pgvector extension is enabled in Supabase
- Check OpenAI API key is valid
- Ensure training data was processed successfully

## Next Steps

- Add more training data to improve bot responses
- Customize bot personality for your community
- Monitor chat messages in your database
- Fine-tune the AI responses by adjusting training data

## Need Help?

- Check the full [SETUP.md](./SETUP.md) for detailed information
- Review the [README.md](./README.md) for overview
- Check Whop documentation: [docs.whop.com](https://docs.whop.com)

