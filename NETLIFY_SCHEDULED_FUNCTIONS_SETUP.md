# Netlify Scheduled Functions Setup - Step by Step

Follow these exact steps to set up automatic polling with Netlify scheduled functions.

## Prerequisites

✅ Your app is deployed to Netlify  
✅ You have your experience ID (e.g., `exp_OWLHdLOH1hPNyP`)  
✅ Bot is configured at `/experiences/[id]`

## Step 1: Install Required Package

The scheduled function uses `@netlify/functions` types. Install it:

```bash
pnpm add -D @netlify/functions
```

Or with npm:
```bash
npm install -D @netlify/functions
```

## Step 2: Deploy the Function

The function file is already created at `netlify/functions/poll-chat.ts`. 

1. **Commit and push** (if you haven't already):
   ```bash
   git add netlify/functions/poll-chat.ts
   git commit -m "Add scheduled function for polling chat"
   git push
   ```

2. **Wait for Netlify to deploy** (automatic after push)

## Step 3: Set Environment Variable

1. **Go to Netlify Dashboard**: https://app.netlify.com
2. **Select your site**: `aichatbotas`
3. **Go to**: **Site Settings** → **Environment Variables**
4. **Add new variable**:
   - **Key**: `EXPERIENCE_ID`
   - **Value**: `exp_OWLHdLOH1hPNyP` (your experience ID)
5. **Save**

## Step 4: Configure Scheduled Function in Netlify Dashboard

1. **Go to**: **Functions** tab (not Site Settings)
2. **Look for**: **Scheduled Functions** section (might be in a submenu)
3. **Click**: **"Add scheduled function"** or **"Create scheduled function"**
4. **Configure**:
   - **Function**: Select `poll-chat` (should appear after deployment)
   - **Schedule**: 
     - Option A: `rate(1 minute)` - runs every minute
     - Option B: `cron(* * * * *)` - runs every minute (cron format)
     - Option C: `cron(*/2 * * * *)` - runs every 2 minutes
5. **Save** or **Deploy**

## Step 5: Verify It's Working

1. **Send a test message** in your Whop chat mentioning your bot (e.g., "CoachBot test")
2. **Wait 1-2 minutes** for the scheduled function to run
3. **Check Netlify Function logs**:
   - Go to **Functions** tab → **poll-chat**
   - Look for logs showing:
     ```
     🔄 Polling for new chat messages...
     📡 Polling experience: exp_OWLHdLOH1hPNyP
     ✅ Polling complete: Processed 1 mentions
     ```

## Alternative: If Scheduled Functions UI Not Available

If you don't see "Scheduled Functions" in the Netlify Dashboard, you can use Netlify's `netlify.toml` with the scheduled functions plugin:

### Option A: Install Plugin and Configure

1. **Install the plugin**:
   ```bash
   pnpm add -D @netlify/plugin-scheduled-functions
   ```

2. **Update `netlify.toml`**:
   ```toml
   [[plugins]]
     package = "@netlify/plugin-scheduled-functions"

   [functions]
     directory = "netlify/functions"

   [[functions.schedule]]
     function = "poll-chat"
     schedule = "* * * * *"  # Every minute
   ```

3. **Redeploy**

### Option B: Use Netlify UI to Create Scheduled Function

1. **Go to**: Netlify Dashboard → **Functions** → **Add function**
2. **Select**: **"Scheduled function"** or **"Background function"**
3. **Configure** with the schedule

## Troubleshooting

### Function not appearing in dashboard

- Wait for deployment to complete
- Check `netlify/functions/` directory exists and has `poll-chat.ts`
- Verify build completed successfully

### "EXPERIENCE_ID not found" error

- Make sure environment variable is set in Netlify
- Variable name must be exactly: `EXPERIENCE_ID`
- **Redeploy** after adding environment variables

### Function not running on schedule

- Check the schedule syntax in Netlify dashboard
- Verify function is enabled/active
- Check function logs for errors
- Try manual test first to verify function works

### Manual Test

Before setting up the schedule, test the function manually:

1. **Go to**: Functions → `poll-chat`
2. **Click**: "Invoke function" or "Test" button
3. **Check logs** to see if it works

## Quick Checklist

- [ ] Installed `@netlify/functions` package
- [ ] Function file exists at `netlify/functions/poll-chat.ts`
- [ ] Pushed and deployed to Netlify
- [ ] Set `EXPERIENCE_ID` environment variable in Netlify
- [ ] Created scheduled function in Netlify Dashboard
- [ ] Set schedule (every minute recommended)
- [ ] Tested manually to verify it works
- [ ] Sent test message and waited for bot response

## Schedule Examples

- **Every minute**: `rate(1 minute)` or `cron(* * * * *)`
- **Every 2 minutes**: `rate(2 minutes)` or `cron(*/2 * * * *)`
- **Every 5 minutes**: `rate(5 minutes)` or `cron(*/5 * * * *)`
- **Every 15 minutes**: `rate(15 minutes)` or `cron(*/15 * * * *)`

## What Happens

1. Scheduled function runs every minute (or your configured interval)
2. Calls `/api/chat/poll` with your experience_id
3. Polling endpoint fetches recent messages using Whop SDK
4. Finds messages mentioning your bot
5. Generates AI responses and sends them
6. Stores processed messages to avoid duplicates

Once set up, your bot will automatically check for and respond to messages!

