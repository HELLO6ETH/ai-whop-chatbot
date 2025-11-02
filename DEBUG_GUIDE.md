# Debugging Guide - Bot Not Responding

## Step 1: Check Netlify Function Logs

1. **Go to Netlify Dashboard** → Your Site → **Functions** tab
2. Look for `/api/chat/webhook` function logs
3. Check for any errors or logs starting with:
   - `📨 Webhook received!`
   - `❌ Error processing webhook:`
   - `💬 Processing chat message:`

**What to look for:**
- ✅ If you see `📨 Webhook received!` - Webhook is reaching your app
- ❌ If you see `❌ Error processing webhook:` - There's an error, check the details
- ❌ If you see NOTHING - Webhook isn't reaching your app (see Step 2)

## Step 2: Verify Webhook Configuration in Whop

1. **Go to Whop Dashboard**: https://whop.com/dashboard/developer/
2. **Select your app** → **Settings** → **Webhooks**
3. **Verify:**
   - ✅ Webhook URL is exactly: `https://your-app.netlify.app/api/chat/webhook`
   - ✅ Event type is: `chat.message.created` (or similar chat message event)
   - ✅ Webhook secret matches your `WHOP_WEBHOOK_SECRET` in Netlify

**Common mistakes:**
- ❌ Wrong URL (missing `/api/chat/webhook`)
- ❌ Wrong event type (should be chat-related)
- ❌ Secret mismatch

## Step 3: Test Webhook Manually (Optional)

You can test if the webhook endpoint is reachable:

```bash
curl -X POST https://your-app.netlify.app/api/chat/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

This should return an error (which is expected), but it confirms the endpoint is reachable.

## Step 4: Check Bot Configuration

1. **Go to your bot config page**: `/experiences/[your-experience-id]`
2. **Verify:**
   - ✅ Bot name is set (e.g., "CoachBot")
   - ✅ Training data has been saved (check "Training Documents" section)
   - ✅ Configuration is saved

## Step 5: Verify Bot Mention in Chat

The bot responds when its name appears in the message. Try:

**✅ Should work:**
- `CoachBot help me`
- `Coachbot what is the refund policy?`
- `coachbot tell me about returns`

**❌ Won't work:**
- `@CoachBot` (the @ symbol isn't required, but the name must be in the message)
- `help me` (no bot name mentioned)

## Step 6: Check Environment Variables in Netlify

1. **Netlify Dashboard** → **Site Settings** → **Environment Variables**
2. **Verify all are set:**
   - `NEXT_PUBLIC_WHOP_APP_ID`
   - `WHOP_API_KEY`
   - `WHOP_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`

**Important:** After adding/changing environment variables, **redeploy** your site!

## Step 7: Enable More Detailed Logging

The webhook handler logs extensively. Check Netlify function logs for:
- `🔍 Checking mention - Bot name: "...", Message: "..."`
- `✅ Bot mentioned! Processing message...`
- `🤖 Generating AI response...`
- `✅ Generated response: "..."`
- `📤 Sending reply to channel...`

If you see these logs, the bot is processing. If not, the webhook might not be configured correctly.

## Step 8: Common Issues & Fixes

### Issue: "No webhook logs in Netlify"
**Fix:** Webhook isn't reaching your app. Verify webhook URL in Whop Dashboard matches your Netlify URL exactly.

### Issue: "Webhook error: Invalid webhook"
**Fix:** Check that `WHOP_WEBHOOK_SECRET` in Netlify matches the secret configured in Whop Dashboard.

### Issue: "Bot not configured for this experience"
**Fix:** The bot config isn't saved for this experience. Go to `/experiences/[id]` and save the configuration.

### Issue: "Bot name not found in message"
**Fix:** The bot name in your config doesn't match what you're typing. Check the exact bot name in your config.

### Issue: "Failed to generate embeddings"
**Fix:** Check OpenAI API key in Netlify environment variables. Verify it's valid and has credits.

## Step 9: Still Not Working?

Share the following information:
1. **Netlify Function Logs** (screenshot or copy)
2. **Whop Dashboard Webhook Settings** (screenshot - hide secrets)
3. **Your bot name** from the config page
4. **Exact message** you're sending in chat

## Quick Checklist

- [ ] Netlify deployment is successful
- [ ] Environment variables are set in Netlify
- [ ] Webhook is configured in Whop Dashboard with correct URL
- [ ] Webhook event is `chat.message.created`
- [ ] `WHOP_WEBHOOK_SECRET` matches in both places
- [ ] Bot is configured at `/experiences/[id]`
- [ ] Bot name is set
- [ ] Training data is saved
- [ ] You're mentioning the bot name in the chat message
- [ ] You're testing in the correct Whop community where the app is installed

