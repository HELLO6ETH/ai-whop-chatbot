# Running AI Coach Bot on Localhost

This guide helps you run and test the AI Coach Bot locally on your machine.

## Prerequisites

1. Make sure you have all dependencies installed:
   ```bash
   pnpm install
   ```

2. Set up your `.env.local` file with all credentials (see QUICK_START.md)

## Step 1: Start the Development Server

```bash
pnpm dev
```

This will:
- Start Next.js on `http://localhost:3000`
- Use Whop's dev proxy to connect your localhost to Whop

You should see output like:
```
▲ Next.js 16.0.0
- Local:        http://localhost:3000
- Whop Proxy:   (configured via whop-proxy)
```

## Step 2: Configure Whop Dev Proxy

When you run `pnpm dev`, Whop's dev proxy should automatically:
- Create a proxy tunnel to your localhost
- Make your local app accessible through Whop's infrastructure

**Important**: Look for the proxy settings icon in your browser window (usually top-right) when the app loads. This lets you configure which port to proxy.

## Step 3: Configure Webhooks for Localhost

For webhooks to work on localhost, you have two options:

### Option A: Use ngrok (Recommended for Testing)

1. **Install ngrok:**
   ```bash
   # macOS
   brew install ngrok
   
   # or download from https://ngrok.com/download
   ```

2. **Start ngrok tunnel:**
   ```bash
   ngrok http 3000
   ```

3. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

4. **Configure Webhook in Whop Dashboard:**
   - Go to your Whop Developer Dashboard
   - Navigate to App → Settings → Webhooks
   - Add webhook URL: `https://your-ngrok-url.ngrok.io/api/chat/webhook`
   - Select event: `chat.message.created`
   - Save

5. **Update `.env.local` (optional):**
   ```env
   NEXT_PUBLIC_WEBHOOK_URL=https://your-ngrok-url.ngrok.io
   ```

### Option B: Use Whop Dev Proxy Webhook Feature

If Whop's dev proxy supports webhook forwarding:
1. Check Whop dev proxy documentation for webhook configuration
2. Configure webhook URL to use the proxy endpoint

## Step 4: Access Your App

### Through Whop Proxy:
- Your app should be accessible through Whop's proxy URL
- This is the URL configured in your Whop app settings

### Direct Localhost:
- `http://localhost:3000` - Direct access (won't have Whop authentication)

## Step 5: Test the Bot

1. **Install the app in a test Whop community:**
   - Go to your test Whop experience/community
   - Add the app from the Tools/Apps section

2. **Access Admin Dashboard:**
   - Navigate to `/experiences/[your-experience-id]`
   - You should see the bot configuration page

3. **Configure the Bot:**
   - Set bot name, upload avatar, choose personality
   - Add some training data
   - Click "Save Configuration"

4. **Test in Chat:**
   - Go to your Whop community's chat
   - Mention the bot: `@CoachBot What is a good trading strategy?`
   - The bot should respond!

## Troubleshooting Localhost

### Webhook Not Receiving Events?

**Check ngrok:**
```bash
# Make sure ngrok is running
# Visit http://localhost:4040 to see ngrok dashboard and webhook requests
```

**Verify webhook URL:**
- Make sure the URL in Whop dashboard matches your ngrok URL exactly
- Include `/api/chat/webhook` at the end
- Use HTTPS (ngrok provides this automatically)

**Test webhook endpoint:**
```bash
# Test if your endpoint is accessible
curl -X POST https://your-ngrok-url.ngrok.io/api/chat/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Whop Dev Proxy Issues?

- Check that the proxy icon appears in your browser
- Verify the port matches (default 3000)
- Try restarting the dev server

### Can't Access Admin Dashboard?

- Make sure you're logged into Whop
- Verify you have admin access to the experience
- Check the URL includes the correct `experienceId`

### Bot Not Responding?

1. **Check webhook configuration:**
   - Verify webhook URL in Whop dashboard
   - Check ngrok is running and forwarding to port 3000
   - Look at ngrok dashboard (localhost:4040) for incoming requests

2. **Check server logs:**
   - Look at your terminal running `pnpm dev`
   - Check for errors when webhook is triggered

3. **Verify bot configuration:**
   - Make sure bot is configured and saved
   - Check that training data was added successfully

4. **Test webhook manually:**
   ```bash
   # Use the ngrok dashboard at http://localhost:4040
   # Click "Request" tab to replay webhook events
   ```

## Development Tips

### Hot Reload
- Code changes auto-reload
- Refresh browser to see UI changes
- Webhook endpoint updates automatically

### Debugging
- Check browser console for client-side errors
- Check terminal for server-side errors
- Use ngrok dashboard to inspect webhook payloads

### Database Changes
- Supabase changes reflect immediately
- You can test with real data locally
- Production database is separate

## Next Steps

Once everything works locally:
1. Test thoroughly
2. Deploy to Vercel (or your hosting platform)
3. Update webhook URL to production URL
4. Configure production environment variables

## Quick Reference

```bash
# Start dev server
pnpm dev

# Start ngrok (in separate terminal)
ngrok http 3000

# Check ngrok dashboard
open http://localhost:4040
```

## Common Issues

**"Webhook secret mismatch"**
- Make sure `WHOP_WEBHOOK_SECRET` in `.env.local` matches Whop dashboard

**"Cannot verify user token"**
- Make sure you're accessing through Whop proxy, not direct localhost
- Verify `NEXT_PUBLIC_WHOP_APP_ID` and `WHOP_API_KEY` are correct

**"Supabase connection error"**
- Check `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Verify Supabase project is active

**"OpenAI API error"**
- Check `OPENAI_API_KEY` is valid
- Verify you have credits/quota available

