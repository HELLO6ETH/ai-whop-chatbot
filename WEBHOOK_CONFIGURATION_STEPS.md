# Webhook Configuration Steps

## Where to Configure the Webhook

You need to configure this in **Whop Dashboard**, not Netlify.

## Step-by-Step Instructions

### Step 1: Go to Whop Developer Dashboard

1. Visit: https://whop.com/dashboard/developer/
2. Sign in if needed
3. **Select your app** (the chat bot app)

### Step 2: Find Webhook Settings

Look for one of these sections:
- **Settings** → **Webhooks**
- **Webhooks** (in the left sidebar)
- **Integrations** → **Webhooks**
- **App Settings** → **Webhooks**

### Step 3: Configure the Webhook

You have the webhook execution URL from Whop:
```
https://data.whop.com/api/v5/feed/webhooks/eyJfcmFpbHMiOnsiZGF0YSI6WzEwNDczMV0sInB1ciI6IkZlZWQ6OldlYmhvb2tcbmV4ZWN1dGVfd2ViaG9va1xuIn19--97385d774567a852958b2f372e5724a2581bb237/execute
```

**What to do:**

1. **Find the webhook configuration** for this URL (it might be listed in your webhooks)
2. **Set the Target URL** or **Callback URL** to:
   ```
   https://aichatbotas.netlify.app/api/chat/webhook
   ```
3. **Set the Webhook Secret** (optional but recommended):
   - This should match your `WHOP_WEBHOOK_SECRET` in Netlify
   - If you don't have one set in Netlify yet, generate one and add it to both places
4. **Save** the configuration

### Alternative: If Webhook is Auto-Created

If Whop's chat app automatically created the webhook and you can't edit it directly:

1. **Check if there's a "Edit" or "Configure" button** next to the webhook
2. **Look for "Callback URL" or "Target URL" field**
3. **Or check your app's settings** for webhook configuration

### Step 4: Verify in Netlify

**You DON'T need to configure anything in Netlify** - your endpoint is already live at:
```
https://aichatbotas.netlify.app/api/chat/webhook
```

However, make sure these environment variables are set in Netlify:
- `WHOP_WEBHOOK_SECRET` (should match what you set in Whop)
- `WHOP_API_KEY`
- `NEXT_PUBLIC_WHOP_APP_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

## How to Check if It's Working

### Test 1: Check Netlify Function Logs

1. Go to **Netlify Dashboard** → Your Site → **Functions** tab
2. Click on `/api/chat/webhook`
3. Send a test message in Whop chat
4. You should see logs like:
   ```
   📨 Webhook received!
   ✅ Bot mentioned! Processing message...
   ```

### Test 2: Manual Test (Optional)

```bash
curl -X POST https://aichatbotas.netlify.app/api/chat/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

This should return an error (expected - missing webhook signature), but confirms the endpoint is reachable.

## Troubleshooting

### Can't Find Webhook Settings in Whop

1. **Try different locations:**
   - App Settings → Webhooks
   - Integrations → Webhooks
   - Feed/Activity → Webhooks
   - Chat Settings → Webhooks

2. **Check if the webhook is managed by the chat app** - it might be auto-configured

3. **Look for "Webhook URL" or "Callback URL" field** in your app's general settings

### Webhook Still Not Working

1. **Verify the URL** is exactly: `https://aichatbotas.netlify.app/api/chat/webhook`
2. **Check webhook secret** matches in both Whop and Netlify
3. **Check Netlify Function logs** - they'll show if requests are reaching your endpoint
4. **Make sure environment variables are set** and you've redeployed after adding them

## Summary

- ✅ **Configure in Whop Dashboard** - Set target URL to your Netlify endpoint
- ❌ **Don't configure in Netlify** - Your endpoint is already live
- ✅ **Use this URL in Whop**: `https://aichatbotas.netlify.app/api/chat/webhook`

The webhook execution URL Whop gave you is their internal endpoint. You just need to tell Whop where to forward the events (your Netlify URL).

