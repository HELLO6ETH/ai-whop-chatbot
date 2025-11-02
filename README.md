# AI Coach Bot - Whop App

An intelligent chatbot for Whop communities that learns from custom training data and responds to user questions in chat.

## Features

- 🤖 **Customizable Bot**: Configure bot name, avatar, and personality (friendly, professional, or motivational)
- 📚 **Knowledge Base**: Upload text or PDF documents to train the bot
- 🔍 **Vector Search**: Uses OpenAI embeddings and Supabase pgvector for semantic search
- 💬 **Chat Integration**: Automatically responds when users mention the bot in chat
- 🎯 **Per-Community**: Each Whop experience has its own bot configuration and training data

## Quick Start

**Running locally?** See [LOCALHOST_SETUP.md](./LOCALHOST_SETUP.md) for localhost-specific instructions.

**Deploying?** See [QUICK_START.md](./QUICK_START.md) for a step-by-step setup guide, or [SETUP.md](./SETUP.md) for detailed information.

**TL;DR (Production):**
1. Set up environment variables (Whop, Supabase, OpenAI) - see `.env.local.example`
2. Run Supabase SQL migration (`supabase-setup.sql`)
3. Install dependencies: `pnpm install`
4. Deploy or run dev server: `pnpm dev`
5. Configure webhook in Whop dashboard: `/api/chat/webhook`
6. Install app in your Whop community
7. Configure bot at `/experiences/[experienceId]`
8. Add training data and test!

**TL;DR (Localhost):**
1. Set up `.env.local` with credentials
2. Run `pnpm dev` (uses Whop dev proxy)
3. Set up ngrok for webhooks: `ngrok http 3000`
4. Configure webhook in Whop: `https://your-ngrok-url.ngrok.io/api/chat/webhook`
5. Install app and configure bot

---

## Original Template Information

This is based on the Whop NextJS App Template. See below for deployment details.

To run this project:

1. Install dependencies with: `pnpm i`

2. Create a Whop App on your [whop developer dashboard](https://whop.com/dashboard/developer/), then go to the "Hosting" section and:
	- Ensure the "Base URL" is set to the domain you intend to deploy the site on.
	- Ensure the "App path" is set to `/experiences/[experienceId]`
	- Ensure the "Dashboard path" is set to `/dashboard/[companyId]`
	- Ensure the "Discover path" is set to `/discover`

3. Copy the environment variables from the `.env.development` into a `.env.local`. Ensure to use real values from the whop dashboard.

4. Go to a whop created in the same org as the app you created. Navigate to the tools section and add your app.

5. Run `pnpm dev` to start the dev server. Then in the top right of the window find a translucent settings icon. Select "localhost". The default port 3000 should work.

## Deploying

1. Upload your fork / copy of this template to github.

2. Go to [Vercel](https://vercel.com/new) and link the repository. Deploy your application with the environment variables from your `.env.local`

3. If necessary update you "Base Domain" and webhook callback urls on the app settings page on the whop dashboard.

## Troubleshooting

**App not loading properly?** Make sure to set the "App path" in your Whop developer dashboard. The placeholder text in the UI does not mean it's set - you must explicitly enter `/experiences/[experienceId]` (or your chosen path name)
a

**Make sure to add env.local** Make sure to get the real app environment vairables from your whop dashboard and set them in .env.local


For more info, see our docs at https://dev.whop.com/introduction
