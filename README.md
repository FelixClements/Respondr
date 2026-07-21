# WhatsApp Response Reminder Engine

An automated, localized background service designed for individuals who struggle with message management on personal WhatsApp accounts. Rather than utilizing commercial business APIs that strip away personal chat data, this lightweight script serves as a passive monitoring system to ensure you never accidentally leave friends, family, or critical contacts "on read."

By securely mirroring your active conversation queue, the engine checks your chat list at set intervals, calculates the directional context of the last message, and flags conversations where you owe a response.

---

## 🚀 Key Features

* **Zero Meta Business Requirements:** Runs natively against a standard personal WhatsApp account with no registration or verification fees.
* **Directional Context Awareness:** Automatically evaluates if the final message in a thread was sent by the contact (`fromMe === false`).
* **Custom Elapsed Time Thresholds:** Allows you to define your own rules for what constitutes a forgotten response (e.g., flagging a chat only after 3 hours of silence).
* **Smart Filter Optimization:** Automatically skips archived threads, muted chats, and chaotic group messages to prevent notification fatigue.
* **Secure Session Persistence:** Uses localized authentication state data, requiring you to scan the QR onboarding code only once on setup.
* **Anti-Ban Pattern Mimicry:** Avoids aggressive API scraping by processing only recent active threads at spaced-out intervals to perfectly simulate natural browser-use patterns.

---

## 🛠️ How It Works

```text
[ Active WhatsApp Phone Session ] 
                │ (Scanned via LocalAuth QR)
                ▼
  [ whatsapp-web.js (Puppeteer Instance) ]
                │
                ├──► 1. Sweeps top 50 active chats every 30 minutes
                ├──► 2. Evaluates the direction of the latest message
                │
                ▼
        [ Conditional Filter ]
                │
                ├──► Is last message from you? ──► [ SKIP CHAT ]
                └──► Is last message from contact?
                             │
                             └──► Age > 3 Hours? ──► [ TRIGGER ALERT ]
```

1. **Authentication:** The project boots up a headless instance of Chromium using browser automation. Upon initial boot, it displays a QR code in the terminal terminal to link your device natively.
2. **Analysis Loop:** Every 30 minutes, a background cron scheduler sweeps the metadata of your most recent conversation threads.
3. **Logic Assessment:** The script checks the timestamp of the last message. If the contact spoke last and the threshold is breached, the engine triggers an alert payload.
4. **Outbound Notification:** It passes the payload to an outbound notification pipeline to alert you without interacting with the WhatsApp platform itself.

---

## 🔔 Outbound Push Notifications (To Be Defined)

The engine is designed to be completely decoupled from your WhatsApp communication channel. When a forgotten chat is detected, the system will not send a message back to the contact; instead, it triggers a private push notification directly to your personal device so you can jump back into the app and reply manually.

```text
[ Forgotten Chat Detected ] ──► [ Outbound Notification Pipeline ] ──► [ Your Phone / Desktop ]
```

> ⚠️ **Status: Under Development**  
> The exact delivery mechanism for these alerts is **currently undefined**. The codebase is structured with a modular `triggerNotification()` handler, allowing you to plug in your preferred notification layer later. Upcoming development phases will explore integrating one of the following free, self-hosted, or lightweight delivery methods:
> * **NTFY.sh / Gotify:** Sending instant, anonymous push notifications to your mobile phone via an open-source HTTP POST request.
> * **Telegram Bot API:** Forwarding the reminder details as a private direct message to a personal Telegram channel.
> * **Pushover / Twilio:** Utilizing structured third-party developer APIs to ping your smartphone.
> * **Local Desktop Banners:** Triggering native OS notification flags if running the engine on a local machine.

---

## 📋 Prerequisites

Before running this application, ensure you have the following installed on your machine:
* **Node.js** (v18.0.0 or higher)
* **npm** (comes packaged with Node)

---

## 🔧 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com
   cd whatsapp-reminder-engine
   ```

2. **Install the dependencies:**
   ```bash
   npm install
   ```

3. **Run the script:**
   ```bash
   node index.js
   ```

4. **Link your device:**
   * A QR code will generate directly inside your terminal window.
   * Open WhatsApp on your physical mobile phone.
   * Navigate to **Settings > Linked Devices > Link a Device**.
   * Scan the terminal QR code. Your session data will save locally in a hidden `.wwebjs_auth` directory so you won't need to re-scan on subsequent restarts.

---

## ⚠️ Essential Safety Practices

Because WhatsApp explicitly states in its terms that it does not authorize unofficial third-party automation, using this method carries an account suspension risk. To safeguard your personal number:
* **Never use this script to send automated replies** to people. Only use it as a passive tool to read status parameters.
* **Keep scanning windows large** (30+ minutes). Sweeping your entire inbox every few seconds flags you immediately to automated anti-bot radar.
* **Limit the scope.** By focusing strictly on the top 50 recent active chats instead of digging into thousands of archived chats, the script mimics natural human web browsing habits.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
