const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../../../data');
const DATA_FILE = path.resolve(DATA_DIR, 'cloudtouch_access.json');

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
        throw new Error("Empty body");
      }
      data = JSON.parse(event.body);
    } catch (e) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON body" }) };
    }

    const userId = data.user_id || data.discord_id;
    const reqIp = (data.ip || "").trim();
    const action = (data.action || "").trim().toLowerCase();
    const listFlag = !!data.list;

    if (action === "scan" || action === "scan_check") {
      if (!userId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing user_id" }) };
      }
      let foundFiles = [];
      try {
        const files = fs.readdirSync(DATA_DIR);
        for (const f of files) {
          if (!f.toLowerCase().endsWith('.json')) continue;
          const fp = path.resolve(DATA_DIR, f);
          try {
            const content = fs.readFileSync(fp, 'utf8');
            let matched = false;
            try {
              const j = JSON.parse(content);
              if (typeof j === 'object' && j !== null) {
                if (Object.prototype.hasOwnProperty.call(j, userId)) {
                  matched = true;
                } else {
                  const values = JSON.stringify(j);
                  if (values.includes(userId)) matched = true;
                }
              }
            } catch {
              if (content.includes(userId)) matched = true;
            }
            if (matched) foundFiles.push(f);
          } catch {}
        }
      } catch {}
      const foundCount = foundFiles.length > 0 ? 1 : 0;
      const result = {
        status: "ok",
        found_count: foundCount,
        users: foundCount ? [userId] : [],
        files: foundFiles
      };
      return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    // List all access entries (optional type filter)
    if (action === "list" || listFlag) {
      let db = {};
      if (fs.existsSync(DATA_FILE)) {
        try {
          db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        } catch (e) {
          db = {};
        }
      }
      const typeFilter = (data.type || "").trim();
      if (typeFilter) {
        const filtered = {};
        Object.keys(db).forEach(uid => {
          if ((db[uid].type || "").toLowerCase() === typeFilter.toLowerCase()) {
            filtered[uid] = db[uid];
          }
        });
        return { statusCode: 200, headers, body: JSON.stringify({ users: filtered }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ users: db }) };
    }

    if (!userId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing user_id" }) };
    }

    // Load DB
    let db = {};
    if (fs.existsSync(DATA_FILE)) {
      try {
        db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      } catch (e) {
        console.error("DB Read Error", e);
      }
    }

    // Check Access
    let hasAccess = false;
    let accessDetails = { plan: "Free", expiry: "None" };
    
    // Check local DB
    if (db[userId]) {
      // Enforce IP binding if present
      const allowedIp = (db[userId].allowed_ip || "").trim();
      if (allowedIp && reqIp && allowedIp !== reqIp) {
        hasAccess = false;
      } else {
        hasAccess = true;
        accessDetails = {
          plan: (db[userId].type || "Premium"),
          expiry: "Lifetime"
        };
        // Bind first IP if not set and request provided
        if (!allowedIp && reqIp) {
          db[userId].allowed_ip = reqIp;
          try {
            const dir = path.dirname(DATA_FILE);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
          } catch (e) {}
        }
      }
    }
    
    // No external fallback: only file-based data determines access

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        user_id: userId,
        has_access: hasAccess,
        access_details: accessDetails
      })
    };
  } catch (error) {
    console.error("Internal Error:", error);
    return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: "Internal Server Error", details: error.message }) 
    };
  }
};
