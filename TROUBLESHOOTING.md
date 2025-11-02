# Troubleshooting: Bot Not Responding

If your bot isn't responding to messages, follow these steps to diagnose and fix the issue.

## Quick Diagnostic Steps

### 1. Check if Webhook is Configured

**For Localhost Development:**
- Webhooks won't work on localhost unless you use ngrok (see [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md))
- You MUST use ngrok or deploy to production for webhooks to work

**For Production (Vercel/Netlify):**
- Go to your Whop Developer Dashboard: https://whop.com/dashboard/developer/
- Select your app → Settings → Webhooks
- Verify webhook URL is set to: `https://your-domain.com/api/chat/webhook`
- Verify event type is: `chat.message.created`
- Verify webhook secret matches `WHOP_WEBHOOK_SECRET` in your environment variables

### 2. Use the Test Endpoint

I've created a test endpoint you can use to debug without webhooks:

```bash
curl -X POST https://your-domain.com/api/chat/test \
  -H "Content-Type: application/json" \
  -d '{
    "experience_id": "your-experience-id",
    "channel_id": "your-channel-id",
    "message": "CoachBot help me",
    "bot_name": "CoachBot"
  }'
```

This will:
- Generate a response (even if webhook isn't working)
- Show you what method it's trying to send messages
- Show any errors in sending

### 3. Check Server Logs

Look for these log messages when you send a message:

**✅ Good signs:**
- `📨 Webhook received!` - Webhook is reaching your server
- `✅ Bot mentioned! Processing message...` - Bot name detected
- `🤖 Generating AI response...` - AI is processing
- `✅ Generated response: ...` - Response was created
- `✅ Reply sent successfully via ...` - Message sent to chat

**❌ Problem signs:**
- `❌ Error processing webhook:` - Webhook validation failed
- `❌ Missing experience_id` - Webhook payload missing data
- `❌ Bot name not found in message` - Bot name doesn't match
- `❌ Could not find messages.create method` - Whop SDK API issue
- `❌ Error sending reply:` - Failed to send message

### 4. Verify Bot Configuration

1. Go to `/experiences/[your-experience-id]` in your app
2. Check that:
   - ✅ Bot name is set (e.g., "CoachBot")
   - ✅ Configuration is saved
   - ✅ Training data exists (optional but recommended)

3. **Important:** Your message MUST include the bot name. Examples:
   - ✅ `CoachBot help me`
   - ✅ `coachbot what is the refund policy?`
   - ✅ `CoachBot tell me about returns`
   - ❌ `help me` (no bot name - won't work)
   - ❌ `@CoachBot` (the @ symbol is optional but the name must be in the message)

### 5. Check Environment Variables

Ensure these are set in your deployment:

- `NEXT_PUBLIC_WHOP_APP_ID`
- `WHOP_API_KEY`
- `WHOP_WEBHOOK_SECRET` (must match Whop dashboard)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

**Important:** After changing environment variables, **redeploy** your app!

### 6. Common Issues & Solutions

#### Issue: "No webhook logs at all"

**Causes:**
- Webhook not configured in Whop dashboard
- Wrong webhook URL
- Running on localhost without ngrok
- Webhook endpoint not accessible

**Fix:**
1. Verify webhook URL in Whop dashboard matches your domain exactly
2. Check webhook is enabled and event is `chat.message.created`
3. For localhost, use ngrok (see [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md))

#### Issue: "Invalid webhook" error

**Cause:** Webhook secret mismatch

**Fix:**
1. Check `WHOP_WEBHOOK_SECRET` in your environment variables
2. Verify it matches the secret in Whop dashboard
3. Redeploy after changing

#### Issue: "Bot not configured for this experience"

**Cause:** Bot config not saved in database

**Fix:**
1. Go to `/experiences/[experience-id]`
2. Set bot name and save configuration
3. Verify config is saved by checking the page again

#### Issue: "Bot name not found in message"

**Cause:** Bot name doesn't match what you typed

**Fix:**
1. Check exact bot name in your config (case-insensitive, but spelling must match)
2. Make sure your message includes the bot name
3. Check server logs for: `🔍 Checking mention - Bot name: "...", Message: "..."`
4. Example: If bot name is "CoachBot", message must include "CoachBot" or "coachbot"

#### Issue: "Could not find messages.create method in Whop SDK"

**Cause:** Whop SDK API structure might differ

**Fix:**
1. Check server logs - it will show available SDK properties
2. The code tries multiple methods automatically:
   - `channels.messages.create`
   - `messages.create`
   - `channels.sendMessage`
   - `chat.messages.create`
3. If none work, check Whop SDK documentation for the correct method
4. Report the error with SDK structure details from logs

#### Issue: "Error sending reply" (but response was generated)

**Cause:** Whop API permissions or SDK method issue

**Fix:**
1. Check server logs for exact error message
2. Verify `WHOP_API_KEY` is correct and has proper permissions
3. Check if your app has permission to send messages in the channel
4. Verify the channel_id is correct

### 7. Test Without Webhooks

Use the test endpoint to bypass webhooks entirely:

```bash
POST /api/chat/test
{
  "experience_id": "your-experience-id",
  "channel_id": "your-channel-id", 
  "message": "CoachBot help me",
  "bot_name": "CoachBot"
}
```

This will show you:
- If bot config exists
- If AI response generation works
- If message sending works (and which method)
- Any errors at each step

### 8. Enable Debug Logging

The webhook handler logs extensively. Check your deployment logs for:

```
📨 Webhook received!
Webhook type: chat.message.created
💬 Processing chat message: {...}
🔍 Checking mention - Bot name: "CoachBot", Message: "..."
✅ Bot mentioned! Processing message...
🤖 Generating AI response for question: "..."
✅ Generated response: "..."
📤 Sending reply to channel ...
✅ Reply sent successfully via ...
```

If any step is missing, that's where the problem is.

### 9. Checklist

Before reporting issues, verify:

- [ ] App is deployed and running
- [ ] Environment variables are set correctly
- [ ] Webhook is configured in Whop dashboard
- [ ] Webhook URL matches your domain exactly
- [ ] Webhook event is `chat.message.created`
- [ ] `WHOP_WEBHOOK_SECRET` matches in both places
- [ ] Bot is configured at `/experiences/[id]`
- [ ] Bot name is set correctly
- [ ] Your message includes the bot name
- [ ] You're testing in the correct Whop community
- [ ] Server logs show webhook received (if not, webhook isn't configured)

### 10. Still Not Working?

If you've tried everything above, please provide:

1. **Server logs** from when you sent the message (screenshot or copy)
2. **Whop webhook settings** (screenshot - hide secrets)
3. **Bot name** from your config
4. **Exact message** you sent in chat
5. **Response from test endpoint** (`/api/chat/test`)
6. **Environment** (localhost with ngrok, or production URL)

### Quick Test Commands

```bash
# Test webhook endpoint is reachable
curl -X POST https://your-domain.com/api/chat/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Test bot without webhook
curl -X POST https://your-domain.com/api/chat/test \
  -H "Content-Type: application/json" \
  -d '{
    "experience_id": "your-id",
    "channel_id": "your-channel-id",
    "message": "CoachBot test",
    "bot_name": "CoachBot"
  }'
```

