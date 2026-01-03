# CloudTouch Netlify API

This folder contains the serverless functions for the hosted API on Netlify.

## 🌟 Features
*   **Serverless**: No server management required.
*   **Secure**: Hardcoded owner access + Environment variable allowed list.
*   **Logging**: Centralized logging to Discord Webhook.
*   **Free**: Runs on Netlify's free tier.

## 🚀 Deployment Guide

### Option 1: Automated (Command Line)
1.  Install Netlify CLI:
    ```bash
    npm install netlify-cli -g
    ```
2.  Run the setup script:
    ```bash
    setup_netlify.bat
    ```
3.  Follow the prompts to login and link your site.

### Option 2: Manual (Web UI)
1.  Push this entire `cloudtouch` folder (or just `api-netlify`) to GitHub.
2.  Log in to [Netlify](https://app.netlify.com/).
3.  Click **"Add new site"** > **"Import from Git"**.
4.  Select your repository.
5.  **Build Settings**:
    *   **Base directory**: `api-netlify`
    *   **Build command**: (Leave empty)
    *   **Publish directory**: (Leave empty)
6.  Click **"Deploy site"**.

## ⚙️ Configuration
Go to **Site Settings > Environment Variables** on Netlify and add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `MAIN_WEBHOOK` | `https://discord.com/api/webhooks/...` | Your Discord Webhook for logs. |
| `ALLOWED_USERS` | `123456789,987654321` | Comma-separated list of allowed User IDs. |

## 🔗 Endpoints
Your API URL will be `https://YOUR-SITE-NAME.netlify.app`.

*   `/.netlify/functions/check_access`: POST `{ "user_id": "..." }`
*   `/.netlify/functions/log_usage`: POST `{ "user_id": "...", "action": "..." }`
*   `/.netlify/functions/health`: GET (Returns status)
