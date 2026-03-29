# Encora

A real-time, end-to-end encrypted chat application built as a side project — inspired by WhatsApp. Encora lets you securely message contacts with full E2E encryption, typing indicators, delivery/read receipts, and a clean mobile-first UI.

---

## What it does

- **Google Sign-In** — one-tap login, no passwords
- **End-to-end encryption** — messages are encrypted in your browser using ECDH + AES-GCM before they leave your device. The server never sees plaintext
- **Real-time messaging** — powered by WebSockets with typing indicators, online presence, and last seen
- **Message delivery & read receipts** — single tick (sent), double tick (delivered), blue double tick (read)
- **Contact system** — add contacts by sharing your profile link (`/u/your-username`)
- **Cross-chat notifications** — in-app banner when a message arrives from another contact while you're chatting
- **Dark mode** — system-aware with manual toggle in profile
- **Mobile-first** — works on any screen size, keyboard-aware layout on mobile

---

## How it works

### Architecture

```
Browser (React)
    │
    ├── HTTPS REST  ──►  Express API  ──►  MongoDB
    │
    └── WebSocket   ──►  WS Gateway  ──►  RabbitMQ
                                              │
                                         Message queue
                                         (async DB writes)
```

### End-to-end encryption

1. On first login, a **PIN** is set and an ECDH P-256 key pair is generated in the browser
2. The private key is encrypted with your PIN (PBKDF2 → AES-GCM) and backed up to the server — the server stores only the encrypted blob
3. On a new device, enter your PIN to decrypt and restore your key
4. Every message is encrypted with a shared AES-GCM key derived from ECDH (your private key + recipient's public key) — only you and your contact can decrypt it

### Message flow

```
Sender                  Server                  Receiver
  │                       │                        │
  ├─ encrypt message ──►  │                        │
  ├─ send via WS ───────► │                        │
  │                       ├─ ack sender instantly  │
  │                       ├─ publish to RabbitMQ   │
  │                       ├─ async write to DB     │
  │                       ├─ forward via WS ─────► │
  │  ◄── delivered ───────┤                        │
  │                       │       ◄── read ────────┤
  │  ◄── read ────────────┤                        │
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Auth | Google OAuth 2.0, JWT (access + refresh tokens) |
| Real-time | WebSockets (ws library) |
| Backend | Node.js, Express 5, TypeScript |
| Database | MongoDB (Mongoose) |
| Message queue | RabbitMQ (amqplib) |
| Encryption | Web Crypto API — ECDH P-256, AES-GCM-256, PBKDF2 |
| Key storage | IndexedDB (idb-keyval) |

---

## Running locally

### Prerequisites
- Node.js 18+
- MongoDB instance
- RabbitMQ instance
- Google OAuth client ID

### Backend

```bash
cd ws-gateway
cp .env.example .env   # fill in your values
npm install
npm run dev
```

**Required env vars:**
```
PORT=3001
MONGO_URI=mongodb://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
GOOGLE_CLIENT_ID=...
RABBITMQ_URL=amqp://...
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Frontend

```bash
cd live_bridge_client
cp .env.example .env
npm install
npm run dev
```

**Required env vars:**
```
VITE_API_URL=http://localhost:3001/api
VITE_GOOGLE_CLIENT_ID=...
```

---

## Deployment

### Frontend — Vercel

1. Push to GitHub, import in [vercel.com](https://vercel.com)
2. Set `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID` in Vercel environment variables
3. The `vercel.json` at the root of `live_bridge_client/` handles SPA routing automatically

### Backend — any Node host (VPS, Railway, Render)

Using PM2 on a VPS:

```bash
cd ws-gateway
npm run build
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

Fill in real values in `ecosystem.config.js` before starting. Do not commit this file — it contains secrets.
