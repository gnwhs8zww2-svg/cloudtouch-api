# CloudTouch Netlify API

This directory contains the serverless API functions for CloudTouch, designed to run on Netlify Functions.

## Files Structure

```
api-netlify/
├── netlify/
│   ├── functions/
│   │   ├── health.js          # Health check endpoint
│   │   ├── check_access.js    # Access verification with HMAC
│   │   ├── log_usage.js       # Usage logging and Discord webhooks
│   │   └── update_access.js   # Grant/revoke user access
│   └── toml                   # Netlify configuration
├── public/
│   └── index.html             # Simple status page
└── package.json               # Dependencies
```

## Deployment

### Manual Deployment (Recommended)

1. **Create GitHub Repository:**
   - Go to https://github.com/ and create a new repository
   - Name it something like "cloudtouch-api"
   - Make it public or private (your choice)
   - DON'T initialize with README, .gitignore, or license

2. **Upload Files:**
   - Copy all files from this `api-netlify` folder
   - Drag and drop them into your new GitHub repository
   - Commit the files with message "Initial API deployment"

3. **Connect to Netlify:**
   - Go to https://netlify.com/ and sign up/login
   - Click "Add new site" → "Import an existing project"
   - Choose "Deploy with GitHub"
   - Select your "cloudtouch-api" repository
   - Configure build settings:
     - Branch: main (or your default branch)
     - Build command: (leave empty)
     - Publish directory: (leave empty - Netlify Functions don't need this)
   - Click "Deploy site"

4. **Set Environment Variables:**
   In Netlify dashboard → Site settings → Environment variables:
   - `CLOUDTOUCH_API_SECRET`: Your API secret key
   - `MAIN_WEBHOOK`: Discord webhook URL for logging
   - `UPSTASH_REDIS_REST_URL`: Upstash Redis REST URL
   - `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis REST token

   **⚠️ Never commit actual secret values to the repository!**

### Alternative: Netlify CLI (Advanced)

If you prefer using command line:

```bash
npm install -g netlify-cli
netlify login
cd api-netlify
netlify deploy --prod
```

Then set environment variables in Netlify dashboard as described above.

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/check_access` - Verify user access
- `POST /api/log_usage` - Log user activity
- `POST /api/update_access` - Manage user access

## Environment Variables

All functions require these environment variables to be set in Netlify:

- `CLOUDTOUCH_API_SECRET`: Secret key for HMAC verification
- `MAIN_WEBHOOK`: Discord webhook URL for activity logging
- `UPSTASH_REDIS_REST_URL`: Redis REST API URL
- `UPSTASH_REDIS_REST_TOKEN`: Redis REST API token

## Testing

After deployment, test the health endpoint:
```
https://your-site.netlify.app/api/health
```

Should return: `{"status":"online"}`