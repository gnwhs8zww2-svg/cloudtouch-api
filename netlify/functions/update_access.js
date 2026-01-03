const fs = require('fs');
const path = require('path');

const DATA_FILE = path.resolve(__dirname, '../../../data/cloudtouch_access.json');

exports.handler = async function(event, context) {
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
        throw new Error("Empty body");
      }
      data = JSON.parse(event.body);
    } catch (e) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON body" }) };
    }

    const userId = (data.user_id || data.discord_id || "").trim();
    const action = (data.action || "").trim().toLowerCase();
    const accessType = (data.details || data.type || "CloudTouch Tool").trim();

    if (!userId || !action) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing user_id or action" }) };
    }

    let db = {};
    if (fs.existsSync(DATA_FILE)) {
      try {
        db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      } catch (e) {
        db = {};
      }
    }

    if (action === "grant") {
      db[userId] = {
        access: true,
        type: accessType,
        timestamp: new Date().toISOString()
      };
    } else if (action === "revoke") {
      if (db[userId]) {
        delete db[userId];
      }
    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid action" }) };
    }

    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Failed to write data", details: e.message }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: "ok", user_id: userId, action })
    };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Internal Server Error", details: error.message }) };
  }
};
