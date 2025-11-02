# Supabase Connection Troubleshooting

## Issue: "Failed to connect to Supabase database"

If you're seeing this error, it means your Next.js server cannot reach your Supabase project.

## Quick Diagnosis

The DNS lookup for your Supabase project (`rjhelkcdgxyesguedtw.supabase.co`) failed, which suggests:

1. **The Supabase project doesn't exist or was deleted**
2. **The project URL in your `.env.local` is incorrect**
3. **The project is paused (free tier projects pause after inactivity)**

## Solution Steps

### Step 1: Verify Your Supabase Project

1. Go to https://supabase.com/dashboard
2. Log in with your account
3. Check if you have a project with the reference `rjhelkcdgxyesguedtw`
4. If the project doesn't exist:
   - **Create a new project** at https://supabase.com/dashboard
   - Copy the **Project URL** (it looks like `https://xxxxx.supabase.co`)
   - Copy the **Service Role Key** (Settings → API → service_role key)

### Step 2: Update Your Environment Variables

1. Open `.env.local` in your project root
2. Update these values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

3. Replace `YOUR_PROJECT_REF` with your actual project reference

### Step 3: Unpause Your Project (if paused)

- Free tier Supabase projects pause after 7 days of inactivity
- Go to your project dashboard
- Click "Restore project" or "Unpause" if you see that option

### Step 4: Set Up Database Tables

Once connected, you need to create the database tables:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase-setup.sql` 
4. Click **Run** to execute the SQL

This will create:
- `bot_config` table
- `training_docs` table
- `embeddings` table (with vector support)
- `chat_messages` table
- Required indexes and functions

### Step 5: Restart Your Dev Server

After updating `.env.local`:

```bash
# Stop your current server (Ctrl+C)
pnpm dev
```

## Testing the Connection

You can test if your Supabase connection works by running:

```bash
node -e "const { createClient } = require('@supabase/supabase-js'); const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); client.from('bot_config').select('count').then(r => console.log('Success!', r.error ? r.error.message : 'Connected')).catch(e => console.error('Failed:', e.message));"
```

## Common Issues

### "Unknown host" / DNS resolution failed
- **Cause**: Project doesn't exist or URL is wrong
- **Fix**: Create/verify project and update `.env.local`

### Project paused
- **Cause**: Free tier inactivity
- **Fix**: Unpause in Supabase dashboard

### Invalid API key
- **Cause**: Service role key is wrong or was rotated
- **Fix**: Get a fresh key from Settings → API → service_role

### Tables don't exist
- **Cause**: SQL setup script wasn't run
- **Fix**: Run `supabase-setup.sql` in Supabase SQL Editor

## Need Help?

1. Check your Supabase project status at https://supabase.com/dashboard
2. Verify your `.env.local` has the correct values
3. Make sure you've run the SQL setup script
4. Check the browser console and server logs for detailed error messages

