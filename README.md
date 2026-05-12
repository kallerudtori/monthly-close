# Monthly Close Checklist

A shared web app for tracking your team's monthly close process. Everyone uses the same URL and password to access the checklist.

---

## Deploying to Railway (Step-by-Step)

**You'll need:** A free [Railway](https://railway.app) account and a [GitHub](https://github.com) account.

### Step 1 — Push to GitHub

1. Go to [github.com](https://github.com) and create a new repository (e.g. `monthly-close`).
2. On your computer, open Terminal and run:
   ```
   cd /path/to/monthly-close
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/monthly-close.git
   git push -u origin main
   ```

### Step 2 — Create a Railway Project

1. Go to [railway.app](https://railway.app) and sign in.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Connect your GitHub account if prompted, then select your `monthly-close` repo.
4. Railway will detect the project and begin deploying.

### Step 3 — Add a PostgreSQL Database

1. In your Railway project dashboard, click **New** → **Database** → **Add PostgreSQL**.
2. Railway automatically creates a `DATABASE_URL` environment variable that your app will use.

### Step 4 — Set the App Password

1. Click on your web service (the one running the app) in Railway.
2. Go to the **Variables** tab.
3. Click **New Variable** and add:
   - **Name:** `APP_PASSWORD`
   - **Value:** choose a password your team will use to log in (e.g. `closechecklist2026`)
4. Click **Add**.

Railway will automatically redeploy with the new variable.

### Step 5 — Get Your App URL

1. Click on your web service in Railway.
2. Go to the **Settings** tab → find **Domains**.
3. Click **Generate Domain** — Railway gives you a URL like `https://monthly-close-production.up.railway.app`.
4. Share this URL and the password with your team.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (auto-set by Railway when you add a Postgres DB) |
| `APP_PASSWORD` | Yes | Shared password to access the app |
| `PORT` | No | Server port (Railway sets this automatically) |
| `SLACK_WEBHOOK_URL` | No | Slack Incoming Webhook URL for daily reminders (see below) |

---

## Running Locally (Optional)

**Prerequisites:** Node.js 18+, PostgreSQL running locally.

1. Copy the example env file:
   ```
   cp .env.example .env
   ```
2. Edit `.env` with your local database URL and a password.
3. Install dependencies:
   ```
   npm install --prefix backend
   npm install --prefix frontend
   ```
4. Start the backend (it auto-runs migrations and seeds on startup):
   ```
   cd backend && npm start
   ```
5. In a second terminal, start the frontend:
   ```
   cd frontend && npm start
   ```
6. Open [http://localhost:3000](http://localhost:3000).

---

## Setting Up Slack Notifications

Daily reminders fire at 9:00 AM Mountain Time for any task that is due the next day or overdue and not yet complete.

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Name it (e.g. "Monthly Close") and pick your workspace
3. Click **Incoming Webhooks** → toggle **Activate Incoming Webhooks** on
4. Click **Add New Webhook to Workspace** → pick the channel (e.g. `#monthly-close`) → **Allow**
5. Copy the Webhook URL (looks like `https://hooks.slack.com/services/T.../B.../...`)
6. In Railway → web service → Variables → add `SLACK_WEBHOOK_URL` with that value

To test it immediately without waiting for 9am, you can temporarily call the notifier endpoint (or just wait — if any tasks have due dates set it'll fire automatically the next morning).

---

## How It Works

- **Login:** Everyone shares one password. A session token is stored in your browser.
- **Current month:** The app automatically creates a fresh checklist at the start of each month.
- **History:** Past months are preserved and accessible via the month dropdown (read-only).
- **Real-time sync:** The page polls every 30 seconds so all users stay in sync.
- **Settings:** Click the gear icon ⚙️ in the top-right to manage team members.
