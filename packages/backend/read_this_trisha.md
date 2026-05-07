# Backend Setup Guide for Trisha

> External implementation of WhatsApp, Gmail, and Telegram for Silent Social Debt Manager.

---

## Overview

The backend adapters are already coded. You only need to:
1. Set up `.env` with API credentials
2. Complete Gmail OAuth flow
3. Complete WhatsApp Business API registration
4. Use the Telegram bot (ask me for the token)

---

## 1. Environment Setup (`.packages/backend/.env`)

Copy and fill in the following template:

```env
# Server
PORT=3000
NODE_ENV=development

# Telegram (already configured)
TELEGRAM_BOT_TOKEN=<ask_me_for_this>

# Gmail API
GMAIL_CLIENT_ID=<get_from_google_cloud>
GMAIL_CLIENT_SECRET=<get_from_google_cloud>
GMAIL_REDIRECT_URI=http://localhost:3000/auth/gmail/callback

# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=<get_from_meta>
WHATSAPP_API_KEY=<get_from_meta>
WHATSAPP_WEBHOOK_TOKEN=<create_your_own_random_token>
WHATSAPP_APP_SECRET=<get_from_meta>

# Scheduler & Memory
HEARTBEAT_INTERVAL=1800000
ACTION_THRESHOLD=0.6
TOP_N=5
DRY_RUN=false
SOUL_STORE_PATH=./souls
MEMORY_CACHE_TTL=300000

# LLM (optional for now)
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=<optional>
OPENAI_API_KEY=<optional>

# Logging
LOG_LEVEL=info
```

---

## 2. Gmail API Setup

### 2a. Create Google Cloud Project
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project: **"SSDM Gmail Integration"**
- Enable the **Gmail API** (search in APIs & Services → Enable APIs and Services)

### 2b. Create OAuth 2.0 Credentials
- Go to **Credentials** → **Create Credentials** → **OAuth client ID**
- Application type: **Web application**
- Authorized redirect URIs: `http://localhost:3000/auth/gmail/callback`
- Click Create → Copy the `Client ID` and `Client Secret` into `.env`

### 2c. Test Gmail Auth Flow
- Start the backend:
  ```bash
  npm run dev
  ```
- Open browser: `http://localhost:3000/auth/gmail`
- You'll be redirected to Gmail login → approve → token saved to `gmail_token.json`
- Confirm with:
  ```bash
  curl http://localhost:3000/api/gmail/status
  ```
  Expected: `"tokenLoaded": true, "clientReady": true`

---

## 3. WhatsApp Business API Setup

### 3a. Register Meta Business App
- Go to [Meta for Developers](https://developers.facebook.com/)
- Create an app: **Type = Business**
- Add **Whatsapp** product to your app

### 3b. Get Credentials
- Go to **App Settings** → **Basic** → Copy `App ID` and `App Secret` (WHATSAPP_APP_SECRET)
- Go to **WhatsApp** → **Getting Started** → Follow Meta's onboarding to get:
  - `Phone Number ID` (WHATSAPP_PHONE_NUMBER_ID)
  - `Access Token` (WHATSAPP_API_KEY) — or use System User token

### 3c. Set Up Webhook
- In **WhatsApp** settings, go to **Webhook Configuration**
- **Callback URL:** `https://<your_ngrok_url>/webhook/whatsapp` (use `ngrok` for local dev)
- **Verify Token:** Match the `WHATSAPP_WEBHOOK_TOKEN` in your `.env`
- Meta will POST to this endpoint when users send messages

### 3d. Install ngrok (for local dev)
```bash
# Download from https://ngrok.com/download
# Then run:
ngrok http 3000
# Copy the https URL and use it in Meta webhook settings
```

### 3e. Test Message Ingestion
- Send a test message to your WhatsApp Business number
- Check backend logs for `[WhatsApp]` ingestion
- Verify queue stats:
  ```bash
  curl http://localhost:3000/api/gateway/stats
  ```

---

## 4. Telegram Bot Setup

**Use the bot already created.** Ask me for the `TELEGRAM_BOT_TOKEN` and add it to `.env`:

```env
TELEGRAM_BOT_TOKEN=<ask_me>
```

Polling is already running — just send messages to **@Ssdm_hellokitty_bot** and check the queue.

---

## 5. Quick Test

After all three are set up:

```bash
# 1. Start backend
npm run dev

# 2. In another terminal, send messages via Gmail, WhatsApp, and Telegram

# 3. Check queue
curl http://localhost:3000/api/gateway/stats

# 4. List contacts
curl http://localhost:3000/api/contacts?limit=5
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Gmail: "Not Found" on token exchange | Check `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` are exact |
| WhatsApp: Messages not arriving | Confirm webhook token matches; check ngrok is running; test with test message button in Meta dashboard |
| Telegram: No messages in queue | Confirm token in `.env`; send message to bot; check backend logs for `[Telegram]` lines |

---

## Questions?

Slack me if any step fails or `.env` values are unclear.
