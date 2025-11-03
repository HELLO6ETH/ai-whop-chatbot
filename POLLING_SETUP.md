# Polling Setup for Chat Bot (Alternative to Webhooks)

Since Whop doesn't have a `chat.message.created` webhook event, we'll use **polling** instead. This means your bot will check for new messages every minute and respond to mentions.

## How It Works

1. A scheduled function runs every minute
2. It calls `/api/chat/poll` to check for new messages
3. The bot responds to messages that mention it
4. Processed messages are stored to avoid duplicate responses

## Setup Instructions

### Option 1: Netlify Scheduled Functions (Recommended)

1. **Go to Netlify Dashboard** → Your Site → **Functions** tab
2. **Click "Add function"** or go to **Functions** → **Scheduled functions**
3. **Create a new scheduled function:**
   - **Function name**: `poll-chat`
   - **Schedule**: `rate(1 minute)` or `cron(* * * * *)` (every minute)
   - **Function path**: `netlify/functions/poll-chat.ts`

4. **Add query parameter** with your experience ID:
   - In the scheduled function settings, add: `?experience_id=your-experience-id`
   - Or modify the function to read from environment variables

### Option 2: Manual API Calls (For Testing)

You can manually trigger polling by calling the endpoint:

```bash
curl -X POST https://aichatbotas.netlify.app/api/chat/poll \
  -H "Content-Type: application/json" \
  -d '{"experience_id": "your-experience-id"}'
```

### Option 3: Use Netlify's Built-in Scheduled Functions

1. **Create the function file** (already created: `netlify/functions/poll-chat.ts`)
2. **Configure in `netlify.toml`** (already configured)
3. **Set up the schedule in Netlify Dashboard:**
   - Go to **Site Settings** → **Functions** → **Scheduled Functions**
   - Add new scheduled function
   - Function: `poll-chat`
   - Schedule: `* * * * *` (every minute)

## Configuration

The bot needs:

1. **Bot Configuration** - Set at `/experiences/[experience-id]`:
   - Bot name (e.g., "CoachBot")
   - Channel ID (where to read/send messages)
   - Personality settings

2. **Environment Variables** in Netlify:
   - `NEXT_PUBLIC_WHOP_APP_ID`
   - `WHOP_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`

3. **Channel ID** - The bot config needs a `channel_id`. You can:
   - Set it manually in the bot config form
   - Or let the bot find it automatically (if the API supports it)

## How Polling Works

1. **Every minute**, the scheduled function runs
2. **Fetches recent messages** from the configured channel
3. **Filters for new messages** that mention the bot name
4. **Generates AI response** for each mention
5. **Sends reply** back to the channel
6. **Stores in database** to avoid duplicate processing

## Advantages of Polling

✅ **Works without webhooks** - No need for Whop to support chat message webhooks
✅ **Reliable** - Runs on a schedule, doesn't depend on external events
✅ **Simple** - Just a cron job calling your API
✅ **Debuggable** - Easy to test manually

## Disadvantages

⚠️ **Delayed responses** - Up to 1 minute delay (depending on schedule)
⚠️ **Resource usage** - Makes API calls even when there are no messages
⚠️ **Requires channel_id** - Must know which channel to poll

## Testing

Test the polling endpoint manually:

```bash
curl -X POST https://aichatbotas.netlify.app/api/chat/poll \
  -H "Content-Type: application/json" \
  -d '{
    "experience_id": "your-experience-id"
  }'
```

Response:
```json
{
  "processed": 1,
  "message": "Processed 1 mentions"
}
```

## Setting Channel ID

The bot needs to know which channel to poll. Options:

1. **Manual entry**: Add channel_id when configuring the bot
2. **Auto-detect**: Use `/api/channels?experience_id=...` to list channels
3. **Default channel**: Some experiences have a default channel

## Troubleshooting

### "Bot not configured for this experience"
- Go to `/experiences/[id]` and save bot configuration

### "No channel configured"
- Set `channel_id` in bot configuration
- Use `/api/channels?experience_id=...` to find channel IDs

### "Could not find messages.list method"
- Whop SDK API might differ
- Check Netlify Function logs for available SDK methods

### Messages not being detected
- Make sure bot name matches exactly (case-insensitive)
- Check that channel_id is correct
- Verify messages are in the channel being polled

## Next Steps

1. Set up the scheduled function in Netlify
2. Configure bot with experience_id and channel_id
3. Test manually with the curl command above
4. Wait a minute and check if bot responds in chat

The polling approach is more reliable than webhooks if Whop doesn't support chat message events!

