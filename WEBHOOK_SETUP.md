# Webhook Setup

## TL;DR: Deploy Instead! 🚀

**Deploying to Vercel is WAY simpler** - no ngrok needed! See [DEPLOY_SIMPLE.md](./DEPLOY_SIMPLE.md) for a 5-minute deployment guide.

**Only use this guide if you MUST test on localhost.**

---

# Webhook Setup for Localhost

## The Problem

When running on localhost (`pnpm dev`), Whop can't send webhooks to your local server because `localhost` isn't accessible from the internet. That's why the bot didn't respond when you tried "CoachBot help me".

## Solution: Use ngrok

ngrok creates a public HTTPS tunnel to your localhost server so Whop can send webhooks.

### Step 1: Install ngrok

```bash
# macOS (using Homebrew)
brew install ngrok

# Or download from https://ngrok.com/download
```

### Step 2: Authenticate ngrok (First Time Only)

If this is your first time using ngrok:

1. **Sign up for a free account**: https://dashboard.ngrok.com/signup
2. **Get your authtoken**: https://dashboard.ngrok.com/get-started/your-authtoken
3. **Configure ngrok**:
   ```bash
   ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
   ```

### Step 3: Start ngrok

Open a **new terminal window** (keep `pnpm dev` running in the other one) and run:

```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding    https://abc123-def456.ngrok.io -> http://localhost:3000
```

### Step 4: Copy the ngrok URL

Copy the HTTPS URL (e.g., `https://abc123-def456.ngrok.io`)

### Step 5: Configure Webhook in Whop Dashboard

1. Go to https://whop.com/dashboard/developer/
2. Select your app
3. Go to **Settings** → **Webhooks** (or similar section)
4. Add a new webhook:
   - **URL**: `https://your-ngrok-url.ngrok.io/api/chat/webhook`
   - **Event**: `chat.message.created` (or similar chat message event)
   - **Secret**: Should match your `WHOP_WEBHOOK_SECRET` in `.env.local`
5. Save

### Step 6: Test It!

1. Make sure both are running:
   - `pnpm dev` (in one terminal)
   - `ngrok http 3000` (in another terminal)

2. Go to your Whop community chat
3. Type: `CoachBot help me`
4. Check your terminal - you should see logs like:
   ```
   📨 Webhook received!
   💬 Processing chat message...
   ✅ Bot mentioned! Processing message...
   🤖 Generating AI response...
   ✅ Reply sent successfully
   ```

5. Check ngrok dashboard: Open http://localhost:4040 to see incoming webhook requests

## Verify It's Working

### Check Terminal Logs

When you mention the bot, you should see:
- `📨 Webhook received!` - Webhook reached your server
- `✅ Bot mentioned!` - Bot name detected
- `🤖 Generating AI response...` - Processing question
- `✅ Reply sent successfully` - Response sent to chat

### Check ngrok Dashboard

Visit http://localhost:4040 to see:
- All incoming requests
- Request/response details
- Webhook payloads

## Troubleshooting

### No webhook logs in terminal?
- ✅ Check ngrok is running (`ngrok http 3000`)
- ✅ Verify webhook URL in Whop dashboard matches ngrok URL exactly
- ✅ Make sure URL includes `/api/chat/webhook` at the end
- ✅ Use HTTPS URL from ngrok (not HTTP)

### "Invalid webhook" error?
- ✅ Check `WHOP_WEBHOOK_SECRET` in `.env.local` matches Whop dashboard
- ✅ Verify webhook secret in Whop dashboard settings

### Bot name not detected?
- ✅ Check the exact bot name in your config (case-insensitive, but must match)
- ✅ Make sure you saved the bot configuration
- ✅ Check logs for `Bot name: "..."` and `Message: "..."` to see what's being compared

### Bot responds but message doesn't appear?
- ✅ Check ngrok dashboard for errors
- ✅ Verify Whop SDK has permission to send messages
- ✅ Check server logs for "Error sending reply"

## Quick Test Command

Test if your webhook endpoint is accessible:

```bash
curl -X POST https://your-ngrok-url.ngrok.io/api/chat/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

You should see a response (even if it's an error - that means ngrok is working!)

## Production

Once you deploy to Vercel or another platform:
1. Update webhook URL in Whop dashboard to your production URL
2. Remove ngrok (only needed for localhost)
3. Production webhooks will work automatically!

