const https = require('https');

exports.handler = async function(event, context) {
  // Allow CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Method Not Allowed" };
  }

  try {
    let data;
    try {
        if (!event.body) {
             return { statusCode: 200, headers, body: JSON.stringify({ status: "skipped", reason: "empty body" }) };
        }
        data = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const userId = data.user_id || data.discord_id;
    const action = data.action || "System Log";
    let details = data.details || data.user_info || "No details provided";

    if (typeof details === 'object') {
        try {
            details = JSON.stringify(details, null, 2);
        } catch (e) {
            details = "[Complex Object]";
        }
    }

    // Validate input
    if (!userId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing user_id" }) };
    }

    // DISCORD WEBHOOK URL (Set this in your Netlify Environment Variables)
    const webhookUrl = process.env.MAIN_WEBHOOK;

    if (webhookUrl) {
      // Truncate details if too long for Discord (limit is usually 2000 chars for content, but we embed or split)
      // Here we just truncate to be safe
      const safeDetails = details.length > 1500 ? details.substring(0, 1500) + "..." : details;

      const payload = JSON.stringify({
        content: `📝 **Log Entry**\n**User:** \`${userId}\`\n**Action:** \`${action}\`\n**Details:**\n\`\`\`json\n${safeDetails}\n\`\`\`\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
      });

      const url = new URL(webhookUrl);
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      try {
          await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
              resolve(res);
            });
            req.on('error', (e) => {
              console.error("Webhook Error:", e);
              resolve(); 
            });
            req.write(payload);
            req.end();
          });
      } catch (e) {
          console.error("Webhook Promise Error:", e);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: "logged", service: "Netlify" })
    };
  } catch (error) {
    console.error("Log Usage Error:", error);
    return { statusCode: 200, headers, body: JSON.stringify({ status: "error", message: error.message }) };
  }
};
