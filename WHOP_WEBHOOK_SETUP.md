# Whop Chat App Webhook Setup

When Whop's chat app creates a webhook, it gives you a URL like:
```
https://data.whop.com/api/v5/feed/webhooks/eyJfcmFpbHMiOnsi...
```

This is Whop's **internal webhook execution endpoint**. It will call YOUR app's webhook handler.

## How It Works

```
User sends message in Whop chat
    ↓
Whop's chat app triggers webhook execution
    ↓
Whop calls: https://data.whop.com/api/v5/feed/webhooks/...
    ↓
That endpoint calls YOUR app: https://aichatbotas.netlify.app/api/chat/webhook
    ↓
Your app processes the message and responds
```

## Setup Requirements

### ✅ Production (Netlify - Recommended)

**Works automatically once deployed!**

1. **Deploy your app** to Netlify (already done: `https://aichatbotas.netlify.app`)
2. **Your webhook endpoint** is: `https://aichatbotas.netlify.app/api/chat/webhook`
3. **Whop's webhook execution** will automatically call your endpoint
4. **No additional configuration needed** - it just works!

### 🔧 Localhost Testing (Requires ngrok)

**For local development, you need a public tunnel:**

1. **Install ngrok:**
   ```bash
   brew install ngrok  # macOS
   # or download from https://ngrok.com/download
   ```

2. **Authenticate ngrok** (first time only):
   ```bash
   ngrok config add-authtoken YOUR_AUTHTOKEN
   ```
   Get your token from: https://dashboard.ngrok.com/get-started/your-authtoken

3. **Start your local server:**
   ```bash
   pnpm dev
   ```

4. **In another terminal, start ngrok:**
   ```bash
   ngrok http 3000
   ```

5. **Copy the ngrok HTTPS URL:**
   ```
   Forwarding  https://abc123.ngrok.io -> http://localhost:3000
   ```

6. **Update Whop webhook configuration** to use:
   ```
   https://abc123.ngrok.io/api/chat/webhook
   ```

7. **Test it!** Send a message in Whop chat and check your local terminal logs.

## Important Notes

### Production Deployment

- ✅ **Must be deployed** - Whop's servers need a public URL to reach your endpoint
- ✅ **Use Netlify URL** - `https://aichatbotas.netlify.app/api/chat/webhook`
- ✅ **No ngrok needed** - Netlify provides public HTTPS automatically

### Localhost Development

- ⚠️ **Won't work without ngrok** - `localhost` isn't accessible from internet
- ⚠️ **ngrok URL changes** - Each time you restart ngrok, you get a new URL
- ⚠️ **Free ngrok limitations** - Free tier has connection limits and URLs expire

### Environment Variables

Make sure these are set in Netlify:
- `WHOP_WEBHOOK_SECRET` - Must match what Whop expects
- `WHOP_API_KEY` - For sending messages back
- `NEXT_PUBLIC_WHOP_APP_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

## Testing

### Test Production Endpoint

```bash
curl -X POST https://aichatbotas.netlify.app/api/chat/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

Should return an error (expected), but confirms endpoint is accessible.

### Test Locally with ngrok

1. Start `pnpm dev` and `ngrok http 3000`
2. Use ngrok URL in Whop webhook config
3. Send message in Whop chat
4. Check your local terminal for logs:
   ```
   📨 Webhook received!
   ✅ Bot mentioned! Processing message...
   ```

## Troubleshooting

### "This page isn't working" in browser

**Normal!** Webhooks only accept POST requests. Browsers send GET. The endpoint is working fine - test with curl or actual webhook calls.

### Webhook not reaching your app

1. **Check Netlify Function logs** - Look for incoming requests
2. **Verify webhook URL** - Must be exactly: `https://aichatbotas.netlify.app/api/chat/webhook`
3. **Check environment variables** - All must be set and redeployed

### "Missing required headers" error

1. **Check `WHOP_WEBHOOK_SECRET`** - Must match in both places
2. **Redeploy** after changing environment variables
3. **Check Netlify logs** - New logging will show what headers are received

## Summary

- **Production**: Use deployed Netlify URL ✅
- **Localhost**: Use ngrok for testing 🔧
- **Whop's webhook URL**: Their internal endpoint, will call your app automatically
- **Your endpoint**: `https://aichatbotas.netlify.app/api/chat/webhook`

Since you're already deployed to Netlify, it should work right now! Just make sure the webhook configuration in Whop points to your Netlify URL.

