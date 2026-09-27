# 🔒 Encora

<p align="center">
  <b>A Zero-Trust, End-to-End Encrypted Real-Time Messaging Platform</b>
</p>

<p align="center">
  <a href="https://encora-ashen.vercel.app/">
    <img src="https://img.shields.io/badge/🚀_Live_Demo-encora--ashen.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-Express_5-green?style=for-the-badge&logo=nodedotjs" alt="Node.js Express 5" />
  <img src="https://img.shields.io/badge/WebSockets-ws-orange?style=for-the-badge&logo=websocket" alt="WebSockets" />
  <img src="https://img.shields.io/badge/RabbitMQ-AMQP-ff6600?style=for-the-badge&logo=rabbitmq" alt="RabbitMQ" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Security-E2EE_ECDH_P--256-red?style=for-the-badge&logo=smallstep" alt="E2EE Security" />
</p>

---

## 🌐 Live Application

Explore the live web application: **[https://encora-ashen.vercel.app/](https://encora-ashen.vercel.app/)**

---

## 📖 Overview

**Encora** is a real-time instant messaging application engineered around a **zero-trust security model**. Inspired by modern messaging platforms like WhatsApp, Encora guarantees complete data privacy: message payloads are encrypted inside the user's browser using native Web Cryptography standards before transmission.

The backend infrastructure acts strictly as a **blind relay** and **encrypted data store**. Unencrypted message payloads and private keys never touch server memory, database records, or application logs.

---

## ✨ Key Features

### 🛡️ End-to-End Cryptography (Zero-Trust)

- **Browser-Native Web Crypto API**: Key derivation and payload ciphers generated natively using `window.crypto.subtle`.
- **ECDH P-256 Key Exchange**: Dynamic Elliptic-Curve Diffie-Hellman (P-256) key pairs for secure shared secret derivation.
- **AES-256-GCM Payload Cipher**: Symmetric encryption using unique 96-bit Initialization Vectors (IVs) per message frame.
- **Encrypted Key Vault**: Private keys are encrypted via **PBKDF2** (300,000 iterations, SHA-256) + **AES-GCM** using a user-selected 6-digit PIN and backed up as an encrypted blob.
- **IndexedDB Key Caching**: Client-side key caching via `idb-keyval` for seamless persistent sessions across browser reloads.

### ⚡ Real-Time High-Performance Engine

- **Non-Blocking Acknowledgment Pipeline**: Instant client socket confirmation (`message_sent_ack`) using pre-generated MongoDB `ObjectId`s — eliminating database bottlenecks for senders.
- **Decoupled RabbitMQ Message Broker**: Asynchronous message distribution using AMQP Direct Exchange routing messages to user-dedicated queues (`queue.<userId>`).
- **Zero-Exposure WebSocket Handshake**: WebSocket connections authenticate over post-connection frames, keeping JWT tokens out of URL parameters and access logs.
- **Heartbeat & Connection Cleanup**: Server-side 30-second ping/pong monitoring automatically cleans up dead socket instances and syncs status.

### 💬 Rich Messaging & Social System

- **Multi-Stage Delivery Receipts**: Real-time status tracking (`sent` ✓, `delivered` ✓✓, `read` blue ✓✓).
- **Live Typing & Online Presence**: Instant typing indicators, online status synchronization (`user_online`, `user_offline`), and `lastSeen` timestamps.
- **Dual-Opt-In Contact Network**: Contact request workflow (`pending`, `accepted`, `declined`) via public profile handles (`/u/:username`) protecting users from unsolicited messages.
- **Cross-Chat Banners**: In-app notification banners when messages arrive from background conversations.

### 🎨 Mobile-First UI & Design

- **Responsive Layout**: Designed for mobile and desktop screens with smooth tab navigation and soft-keyboard-aware views.
- **System-Aware Dark Mode**: Custom CSS tokens with automatic system theme sync and manual toggle.
- **Google OAuth 2.0 Auth**: One-tap Google login with dual-token security (Access Token + HTTP-only Refresh Cookie).

---

## 📐 System Architecture

```
                               ┌───────────────────────────────────────────────┐
                               │               Browser (React 19)              │
                               │  - Web Crypto API (ECDH P-256 / AES-GCM-256)  │
                               │  - Local Key Storage (IndexedDB / idb-keyval) │
                               └───────┬───────────────────────────────┬───────┘
                                       │                               │
                              HTTPS REST API                     WebSocket (ws)
                         (Auth, Contacts, Keys)                 (Real-time Frame Stream)
                                       │                               │
                                       ▼                               ▼
                               ┌───────────────┐               ┌───────────────┐
                               │  Express 5    │               │  WS Gateway   │
                               │  REST Service │               │  Registry     │
                               └───────┬────────┘               └───────┬───────┘
                                       │                               │
                                       │                       AMQP Direct Exchange
                                       │                               │
                                       ▼                               ▼
                               ┌───────────────┐               ┌───────────────┐
                               │ MongoDB       │◄──────────────┤ RabbitMQ      │
                               │ Database      │  Async Write  │ Message Queue │
                               └───────────────┘  (Non-block)  └───────────────┘
```

---

## 🔒 Security & Cryptographic Model

1. **Key Generation**: Upon first sign-in, an ECDH P-256 key pair is generated in the browser.
2. **Key Protection**: The private key is encrypted locally using an AES-256 key derived from the user's 6-digit PIN via PBKDF2 (300k iterations, SHA-256) and backed up to the server as an encrypted ciphertext.
3. **Session Persistence**: The unencrypted private key is cached securely in browser IndexedDB (`idb-keyval`) for seamless session recovery.
4. **Message Encryption**: Every message is encrypted using a unique shared AES-256-GCM key derived from the sender's private key and recipient's public key.

---

## 🛠️ Tech Stack

| Layer                  | Technology                                                      |
| ---------------------- | --------------------------------------------------------------- |
| **Frontend**           | React 19, TypeScript, Vite, Tailwind CSS v4                     |
| **Authentication**     | Google OAuth 2.0, JWT (Access Token + HTTP-Only Refresh Cookie) |
| **Real-Time**          | WebSockets (`ws` library)                                       |
| **Backend API**        | Node.js, Express 5, TypeScript                                  |
| **Database**           | MongoDB (Mongoose)                                              |
| **Message Queue**      | RabbitMQ (`amqplib`)                                            |
| **Cryptography**       | Web Crypto API — ECDH P-256, AES-GCM-256, PBKDF2                |
| **Client Key Storage** | IndexedDB (`idb-keyval`)                                        |

---

## 📄 License

This project is licensed under the **ISC License**.

---

<p align="center">
  Crafted with ❤️ by <a href="https://github.com/Nikhil-Gautam-dev">Nikhil Gautam</a>
</p>
