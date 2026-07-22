# Respondr — WhatsApp Response Reminder Engine

An automated, localized background service designed for individuals who struggle with message management on personal WhatsApp accounts. Rather than utilizing commercial business APIs that strip away personal chat data, this lightweight service passively monitors your recent chats and reminds you when a contact is still waiting for a reply.

By securely mirroring your active conversation queue, the engine checks your chat list at set intervals, evaluates the direction of the last message, and flags conversations where you owe a response.

---

## 🚀 Key Features

* **Zero Meta Business Requirements:** Runs natively against a standard personal WhatsApp account with no registration or verification fees.
* **Directional Context Awareness:** Automatically flags conversations where the final message was sent by the contact (`fromMe === false`).
* **Custom Elapsed Time Thresholds:** Define your own rule for what counts as a forgotten response.
* **Smart Filter Optimization:** Skips archived threads, muted chats, and group messages to prevent notification fatigue.
* **Secure Session Persistence:** Uses localized authentication state data, so you only scan the QR code once.
* **Anti-Ban Pattern Mimicry:** Processes only the top recent active chats at spaced-out intervals to simulate natural usage.
* **Web Dashboard:** Manage settings, view the QR code, ignored chats, and history from a browser.
* **Flexible Notifications:** Sends reminders via NTFY and/or Gotify.

---

## 🛠️ How It Works

```text
[ Active WhatsApp Phone Session ]
                │ (Scanned via LocalAuth QR)
                ▼
  [ whatsapp-web.js (Puppeteer Instance) ]
                │
                ├──► 1. Sweeps top active chats on a cron schedule
                ├──► 2. Evaluates the direction of the latest message
                │
                ▼
        [ Conditional Filter ]
                │
                ├──► Is last message from you? ──► [ SKIP CHAT ]
                └──► Is last message from contact?
                             │
                             └──► Age > threshold? ──► [ TRIGGER ALERT ]
```

1. **Authentication:** The project boots a headless Chromium instance. On first run, open `/qr` in the dashboard to see the QR code, then scan it with WhatsApp on your phone.
2. **Analysis Loop:** A background cron scheduler sweeps the metadata of your most recent chats.
3. **Logic Assessment:** If the contact sent the last message and the configured time threshold is exceeded, the engine triggers an alert.
4. **Outbound Notification:** The alert is sent via NTFY/Gotify without interacting with WhatsApp itself.

---

## � Prerequisites

* **Docker** and **Docker Compose** (recommended)
* Or **Node.js** v22+ and **npm** for local development

---

## 🔧 Docker Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/FelixClements/Respondr.git
   cd Respondr
   ```

2. **Configure the environment:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set at least the notification settings you want to use.

3. **Pull and run the pre-built image:**
   ```bash
   docker compose pull
   docker compose up -d
   ```

   To build the image locally instead, run:
   ```bash
   docker build -t ghcr.io/felixclements/respondr:latest .
   docker compose up -d
   ```

4. **Open the dashboard:**
   * Visit `http://localhost:9595`.
   * Go to the **QR** page and scan the code with WhatsApp.

The WhatsApp session is persisted in the `.wwebjs_auth` volume, and the SQLite database in the `data` volume.

---

## ⚙️ Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | Web server port | `9595` |
| `SCAN_INTERVAL_MINUTES` | Minutes between automatic scans | `30` |
| `CHAT_LIMIT` | Number of recent chats to check | `50` |
| `THRESHOLD_HOURS` | Hours before a chat is considered forgotten | `3` |
| `DASHBOARD_USER` | Optional HTTP basic auth username | (none) |
| `DASHBOARD_PASSWORD` | Optional HTTP basic auth password | (none) |
| `NTFY_SERVER` | NTFY server URL | `https://ntfy.sh` |
| `NTFY_TOPIC` | NTFY topic to publish to | (none) |
| `NTFY_PRIORITY` | NTFY message priority | `3` |
| `GOTIFY_URL` | Gotify server URL | (none) |
| `GOTIFY_TOKEN` | Gotify app token | (none) |
| `GOTIFY_PRIORITY` | Gotify message priority | `5` |

### NTFY.sh setup

1. Install the NTFY app on your phone.
2. Pick a unique topic name, e.g. `respondr-alerts-yourname`.
3. Subscribe to that topic in the app.
4. Set `NTFY_TOPIC=respondr-alerts-yourname` in `.env`.

### Gotify setup

1. Run your own Gotify server (or use an existing one).
2. Create an app and copy the token.
3. Set `GOTIFY_URL` and `GOTIFY_TOKEN` in `.env`.

---

## 🖥️ Local Development

```bash
npm install
npm start
```

> Note: local development requires a Chromium installation. The Docker image installs Chromium automatically.

---

## ⚠️ Essential Safety Practices

Because WhatsApp explicitly states in its terms that it does not authorize unofficial third-party automation, using this method carries an account suspension risk. To safeguard your personal number:

* **Never use this script to send automated replies.** Only use it as a passive monitoring tool.
* **Keep scan intervals large** (30+ minutes). Aggressive polling flags anti-bot systems.
* **Limit the scope.** Focus on the top recent active chats instead of scraping thousands of threads.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
