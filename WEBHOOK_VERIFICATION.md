# How to Verify Your Webhook is Working

## ✅ Your Endpoint is Deployed!

The webhook endpoint at `https://aichatbotas.netlify.app/api/chat/webhook` is **working correctly**. 

When I tested it, it responded with:
```json
{"error":"Invalid webhook","details":"Missing required headers"}
```

This is **good** - it means:
- ✅ The endpoint is accessible
- ✅ The code is running
- ✅ It's properly validating webhook requests

## Why Browser Shows "This Page Isn't Working"

**This is completely normal!** Webhook endpoints only accept POST requests, but browsers send GET requests. The error you see is expected.

## How to Actually Test the Webhook

### Option 1: Check Netlify Function Logs (Best Method)

1. **Go to Netlify Dashboard**: https://app.netlify.com
2. **Select your site**: `aichatbotas`
3. **Go to Functions tab**
4. **Look for `/api/chat/webhook`**
5. **Click on it to see logs**

When Whop sends a webhook, you should see logs like:
```
📨 Webhook received!
Webhook type: chat.message.created
✅ Bot mentioned! Processing message...
🤖 Generating AI response...
```

### Option 2: Use the Test Endpoint

I created a test endpoint you can use:

```bash
curl -X POST https://aichatbotas.netlify.app/api/chat/test \
  -H "Content-Type: application/json" \
  -d '{
    "experience_id": "your-experience-id",
    "channel_id": "your-channel-id",
    "message": "CoachBot help me",
    "bot_name": "CoachBot"
  }'
```

This bypasses webhooks and tests the bot directly.

### Option 3: Send a Real Message

1. **Go to your Whop community chat**
2. **Type**: `CoachBot help me`
3. **Check Netlify Function Logs** immediately after
4. **You should see** webhook logs appearing

## Next Steps

Since your endpoint is working, now you need to:

1. **Configure the webhook in Whop Dashboard**:
   - Go to https://whop.com/dashboard/developer/
   - Your app → Settings → Webhooks
   - Add: `https://aichatbotas.netlify.app/api/chat/webhook`
   - Event: `chat.message.created`
   - Secret: Must match your `WHOP_WEBHOOK_SECRET` in Netlify

2. **Verify environment variables are set in Netlify**:
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Check all required variables are there
   - **Important**: Redeploy after adding/changing variables

3. **Configure your bot**:
   - Go to `https://aichatbotas.netlify.app/experiences/[your-experience-id]`
   - Set bot name and save configuration

4. **Test it**:
   - Send a message in your Whop chat: `CoachBot help me`
   - Check Netlify Function logs to see what happens

## What You Should See in Logs

**If webhook is working correctly:**
```
📨 Webhook received!
Webhook type: chat.message.created
💬 Processing chat message: {...}
🔍 Checking mention - Bot name: "CoachBot", Message: "CoachBot help me"
✅ Bot mentioned! Processing message...
🤖 Generating AI response for question: "help me"
✅ Generated response: "..."
📤 Sending reply to channel ...
✅ Reply sent successfully via ...
```

**If something is wrong, you'll see:**
- `❌ Missing experience_id` - Webhook payload issue
- `❌ Bot not configured` - Bot config not saved
- `❌ Bot name not found` - Name doesn't match
- `❌ Error sending reply` - Whop API issue

## Quick Checklist

- [x] Endpoint is deployed and accessible ✅
- [ ] Webhook configured in Whop Dashboard
- [ ] Environment variables set in Netlify
- [ ] Bot configured at `/experiences/[id]`
- [ ] Webhook secret matches in both places
- [ ] Tested sending message with bot name

You're almost there! The hard part (deployment) is done. Now just configure the webhook in Whop and test it.

