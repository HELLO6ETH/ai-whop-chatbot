# Netlify Deployment Guide

Since you're using Netlify, follow these specific steps to get your bot working.

## Step 1: Deploy to Netlify

### Option A: Connect GitHub Repository

1. **Push your code to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/chatbotai.git
   git push -u origin main
   ```

2. **Go to Netlify**: https://app.netlify.com
3. **Click "Add new site" → "Import an existing project"**
4. **Connect to GitHub** and select your repository
5. **Configure build settings:**
   - Build command: `npm run build` (or `pnpm build`)
   - Publish directory: `.next`
6. **Add environment variables** (see Step 2 below)
7. **Click "Deploy site"**

### Option B: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

## Step 2: Configure Environment Variables

1. **Go to Netlify Dashboard** → Your Site → **Site Settings** → **Environment Variables**
2. **Add all required variables:**

   ```
   NEXT_PUBLIC_WHOP_APP_ID=your_app_id
   WHOP_API_KEY=your_api_key
   WHOP_WEBHOOK_SECRET=your_webhook_secret
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_key
   NEXT_PUBLIC_WEBHOOK_URL=https://your-site.netlify.app
   ```

3. **Important:** After adding/changing environment variables, **trigger a new deployment**:
   - Go to **Deploys** tab
   - Click **"Trigger deploy"** → **"Clear cache and deploy site"**

## Step 3: Install Netlify Next.js Plugin (Important!)

For Next.js apps on Netlify, you need the official plugin:

1. **Install the plugin in your project:**
   ```bash
   npm install @netlify/plugin-nextjs
   ```
   Or if using pnpm:
   ```bash
   pnpm add @netlify/plugin-nextjs
   ```

2. **The `netlify.toml` file is already configured** for you with the plugin setup.

3. **Redeploy** after adding the plugin:
   - Go to Netlify Dashboard → Deploys
   - Click "Trigger deploy" → "Clear cache and deploy site"

## Step 4: Configure Webhook in Whop Dashboard

1. **Get your Netlify URL:**
   - Netlify gives you a URL like: `https://your-site-name.netlify.app`
   - Or use your custom domain if configured

2. **Go to Whop Developer Dashboard**: https://whop.com/dashboard/developer/
3. **Select your app** → **Settings** → **Webhooks**
4. **Add webhook:**
   - **URL**: `https://your-site-name.netlify.app/api/chat/webhook`
   - **Event**: `chat.message.created`
   - **Secret**: Must match `WHOP_WEBHOOK_SECRET` in Netlify
5. **Save**

## Step 5: Update Whop App Base URL

1. **In Whop Dashboard** → Your App → **Hosting**
2. **Set Base URL**: `https://your-site-name.netlify.app`
3. **Save**

## Step 6: Check Netlify Function Logs

1. **Go to Netlify Dashboard** → Your Site → **Functions** tab
2. **Look for `/api/chat/webhook`** function
3. **Click on it** to see logs
4. **When you send a message**, you should see:
   - `📨 Webhook received!`
   - `✅ Bot mentioned! Processing message...`
   - `🤖 Generating AI response...`
   - `✅ Reply sent successfully`

## Troubleshooting for Netlify

### Issue: "Function not found" or 404 on webhook

**Fix:**
1. Make sure `@netlify/plugin-nextjs` is installed
2. Check that `netlify.toml` has the plugin configured
3. Redeploy after adding the plugin

### Issue: "waitUntil is not a function"

**Fix:** 
- This is already fixed! The code now works on both Vercel and Netlify
- If you still see this error, make sure you've deployed the latest code

### Issue: "Environment variables not working"

**Fix:**
1. Check environment variables are set in Netlify dashboard
2. **Trigger a new deployment** after changing env vars (clear cache)
3. Variables are only available at build time - you must redeploy

### Issue: "No webhook logs in Netlify"

**Fix:**
1. Verify webhook URL in Whop matches your Netlify URL exactly
2. Check webhook is enabled in Whop dashboard
3. Try the test endpoint: `https://your-site.netlify.app/api/chat/test`

### Issue: "Build fails"

**Fix:**
1. Make sure Node version is set to 20 in Netlify build settings
2. Check build logs for specific errors
3. Ensure all dependencies are in `package.json`

## Testing the Bot

1. **Send a test message** in your Whop community chat:
   ```
   CoachBot help me
   ```

2. **Check Netlify Function Logs** to see what's happening

3. **Use the test endpoint** if webhooks aren't working:
   ```bash
   curl -X POST https://your-site.netlify.app/api/chat/test \
     -H "Content-Type: application/json" \
     -d '{
       "experience_id": "your-experience-id",
       "channel_id": "your-channel-id",
       "message": "CoachBot test",
       "bot_name": "CoachBot"
     }'
   ```

## Netlify-Specific Notes

- **Functions timeout**: Netlify functions have a timeout (10 seconds on free tier, up to 26 seconds on paid)
- **Cold starts**: First request after inactivity may be slower
- **Logs**: Check Function logs in Netlify dashboard, not build logs
- **Redeploy**: Always redeploy after changing environment variables

## Quick Checklist

- [ ] Code pushed to GitHub
- [ ] Site deployed on Netlify
- [ ] `@netlify/plugin-nextjs` installed
- [ ] `netlify.toml` configured
- [ ] All environment variables set in Netlify
- [ ] Site redeployed after adding env vars
- [ ] Webhook configured in Whop dashboard
- [ ] Webhook URL matches Netlify URL exactly
- [ ] `WHOP_WEBHOOK_SECRET` matches in both places
- [ ] Bot configured at `/experiences/[id]`
- [ ] Tested sending message with bot name

## Need Help?

1. **Check Netlify Function Logs** first (most helpful!)
2. **Try the test endpoint** (`/api/chat/test`)
3. **See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** for more help

