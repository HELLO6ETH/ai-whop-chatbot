# Polling Guide - Using Experience ID Directly

Since Whop SDK supports using `experience_id` as `channel_id`, we can poll for messages directly without needing webhooks!

## How It Works

Instead of waiting for webhooks, the bot polls the chat every minute to check for new messages mentioning it.

1. **Scheduled function runs** every minute (or manually triggered)
2. **Fetches recent messages** from the experience using `experience_id`
3. **Finds messages** that mention the bot name
4. **Generates AI responses** and sends replies
5. **Stores processed messages** to avoid duplicates

## Setup Instructions

### Option 1: Manual Polling (For Testing)

Test the polling endpoint directly:

```bash
curl -X POST https://aichatbotas.netlify.app/api/chat/poll \
  -H "Content-Type: application/json" \
  -d '{
    "experience_id": "exp_OWLHdLOH1hPNyP"
  }'
```

This will:
- Check for new messages in that experience
- Respond to any that mention your bot
- Return how many messages were processed

### Option 2: Automatic Polling with Netlify Scheduled Functions

For automatic polling, you need to set up a scheduled function.

#### Step 1: Create Scheduled Function File

The file `netlify/functions/poll-chat.ts` was removed, but you can create a simpler version:

```typescript
// netlify/functions/poll-chat.ts
export const handler = async () => {
  const experienceId = process.env.EXPERIENCE_ID;
  
  if (!experienceId) {
    return { statusCode: 400, body: 'EXPERIENCE_ID not configured' };
  }

  const response = await fetch(`https://aichatbotas.netlify.app/api/chat/poll?experience_id=${experienceId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ experience_id: experienceId }),
  });

  return {
    statusCode: response.ok ? 200 : 500,
    body: JSON.stringify(await response.json()),
  };
};
```

#### Step 2: Configure in Netlify Dashboard

1. Go to **Netlify Dashboard** → Your Site → **Functions**
2. Go to **Scheduled Functions** section
3. Add a new scheduled function:
   - **Function**: `poll-chat`
   - **Schedule**: `rate(1 minute)` or `cron(* * * * *)` (every minute)
4. **Set environment variable**:
   - Key: `EXPERIENCE_ID`
   - Value: `exp_OWLHdLOH1hPNyP` (your experience ID)

#### Step 3: Install Scheduled Functions Plugin

You'll need the plugin:

```bash
pnpm add -D @netlify/plugin-scheduled-functions
```

And update `netlify.toml`:

```toml
[[plugins]]
  package = "@netlify/plugin-scheduled-functions"
```

### Option 3: Use Netlify Cron Jobs (Simpler)

If Netlify supports cron jobs directly, you can configure it in `netlify.toml`:

```toml
[[plugins]]
  package = "@netlify/plugin-cron"
  
[[cron]]
  path = "/api/chat/poll"
  schedule = "* * * * *"  # Every minute
```

## Advantages of Polling

✅ **No webhook configuration needed**
✅ **Works with just experience_id** - no channel_id required
✅ **Simple and reliable** - runs on schedule
✅ **Easy to test** - just call the endpoint manually

## Disadvantages

⚠️ **Slight delay** - up to 1 minute (depending on polling frequency)
⚠️ **API calls** - makes requests even when there are no messages

## Testing

Test manually first:

```bash
curl -X POST https://aichatbotas.netlify.app/api/chat/poll \
  -H "Content-Type: application/json" \
  -d '{"experience_id": "exp_OWLHdLOH1hPNyP"}'
```

You should get:
```json
{
  "processed": 1,
  "message": "Processed 1 mentions"
}
```

## Configuration

You only need:
1. **Experience ID** - `exp_OWLHdLOH1hPNyP` (or your experience ID)
2. **Bot configured** at `/experiences/[id]` with bot name set
3. **Polling endpoint** calling `/api/chat/poll`

No webhook configuration needed!

## Next Steps

1. **Test the polling endpoint** manually with your experience_id
2. **If it works**, set up automatic polling (scheduled function or cron)
3. **Send a test message** mentioning your bot and wait for the next poll cycle

This approach is simpler than webhooks and works perfectly with the Whop SDK!

