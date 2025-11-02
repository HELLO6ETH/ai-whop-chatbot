# Quick Fix: Supabase Connection Error

## Step 1: Verify/Create Supabase Project

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Log in** with your account
3. **Check if you have a project**:
   - If you see a project, check if it's paused (free tier projects pause after 7 days of inactivity)
   - If paused, click "Restore" or "Unpause"
   - If no project exists, click **"New Project"**

## Step 2: Get Your Credentials

If you created a new project or are using an existing one:

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **service_role key** (under "Project API keys" → "service_role" - **NOT** the anon key)

## Step 3: Update Environment Variables

1. Open `.env.local` in your project root
2. Update these lines:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Important**: 
- Replace `YOUR_PROJECT_REF` with your actual project reference (the `xxxxx` part)
- Use the **service_role** key, NOT the anon key
- Don't include quotes around the values

Example:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjEwOTc3MywiZXhwIjoyMDc3Njg1NzczfQ.example_signature
```

## Step 4: Set Up Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Open the file `supabase-setup.sql` in your project root
4. **Copy all the SQL** from that file
5. **Paste it** into the Supabase SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

This creates:
- ✅ `bot_config` table
- ✅ `training_docs` table  
- ✅ `embeddings` table (with vector support for AI)
- ✅ `chat_messages` table
- ✅ Required indexes and functions

## Step 5: Restart Dev Server

```bash
# Stop your current server (Ctrl+C or Cmd+C)
# Then restart:
pnpm dev
```

## Step 6: Test the Connection

Refresh your browser - the error should be gone! You should now see:
- The configuration form loads successfully
- Default values show (Bot name: "CoachBot", etc.)
- No Supabase connection errors

## Troubleshooting

### Still seeing "fetch failed"?
- ✅ Double-check the URL format (should start with `https://`)
- ✅ Verify the service_role key is correct (starts with `eyJ...`)
- ✅ Make sure you restarted the dev server after updating `.env.local`
- ✅ Check your Supabase project is not paused

### "Table doesn't exist" error?
- Run the SQL setup script again (Step 4)
- Check the SQL Editor for any error messages

### Need help?
Check `SUPABASE_SETUP_TROUBLESHOOTING.md` for more detailed troubleshooting.

