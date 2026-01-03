const { Redis } = require('@upstash/redis');
const https = require('https');

let redis = null;

// Initialize Redis
function initRedis() {
  if (!redis && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

// Verify HMAC signature
function verifySignature(data, signature) {
  const crypto = require('crypto');
  const secret = process.env.CLOUDTOUCH_API_SECRET || 'MySecretKey123!@#';
  const expected = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// Load user data
async function loadUserData() {
  const redis = initRedis();
  if (redis) {
    try {
      const data = await redis.get('user_data');
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }
  return {};
}

// Save user data
async function saveUserData(userData) {
  const redis = initRedis();
  if (redis) {
    try {
      await redis.set('user_data', JSON.stringify(userData));
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
}

exports.handler = async (event, context) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    let data;
    if (event.body) {
      if (typeof event.body === 'string') {
        data = JSON.parse(event.body);
      } else {
        data = event.body;
      }
    } else {
      data = {};
    }

    const discordId = String(data.discord_id || '');
    const signature = data.signature || '';
    const userInfo = data.user_info || {};

    // Verify signature
    if (!verifySignature(discordId, signature)) {
      return {
        statusCode: 403,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Invalid signature' })
      };
    }

    // Update user data
    const userData = await loadUserData();
    const userIdStr = String(discordId);

    if (!(userIdStr in userData)) {
      userData[userIdStr] = {
        user_id: userIdStr,
        first_used: new Date().toISOString(),
        usage_count: 0,
        last_used: null,
        hwid: [],
        ip_addresses: [],
        isp_info: [],
        system_info: []
      };
    }

    userData[userIdStr].usage_count = (userData[userIdStr].usage_count || 0) + 1;
    userData[userIdStr].last_used = new Date().toISOString();

    // Track HWID
    if (userInfo.hwid && !userData[userIdStr].hwid.includes(userInfo.hwid)) {
      userData[userIdStr].hwid.push(userInfo.hwid);
    }

    // Track IP
    if (userInfo.ip && !userData[userIdStr].ip_addresses.includes(userInfo.ip)) {
      userData[userIdStr].ip_addresses.push(userInfo.ip);
    }

    // Track ISP info
    const ispData = {};
    ['isp', 'country', 'city', 'org', 'timezone'].forEach(key => {
      if (userInfo[key]) ispData[key] = userInfo[key];
    });
    if (Object.keys(ispData).length > 0 && !userData[userIdStr].isp_info.some(item =>
      JSON.stringify(item) === JSON.stringify(ispData)
    )) {
      userData[userIdStr].isp_info.push(ispData);
    }

    // Track system info
    const sysData = {};
    ['hostname', 'platform', 'processor', 'system'].forEach(key => {
      if (userInfo[key]) sysData[key] = userInfo[key];
    });
    if (Object.keys(sysData).length > 0 && !userData[userIdStr].system_info.some(item =>
      JSON.stringify(item) === JSON.stringify(sysData)
    )) {
      userData[userIdStr].system_info.push(sysData);
    }

    await saveUserData(userData);

    // Log to webhook
    try {
      const timestamp = new Date().toISOString();
      const embedData = {
        title: '📊 CloudTouch: Tool Launched',
        description: `**User ID:** ${discordId}\n**Time:** ${timestamp}`,
        color: 0x00ff00,
        fields: [
          { name: 'HWID', value: userInfo.hwid || 'Unknown', inline: true },
          { name: 'IP', value: userInfo.ip || 'Unknown', inline: true },
          { name: 'ISP', value: userInfo.isp || 'Unknown', inline: true },
          { name: 'Country', value: userInfo.country || 'Unknown', inline: true },
          { name: 'City', value: userInfo.city || 'Unknown', inline: true },
          { name: 'Hostname', value: userInfo.hostname || 'Unknown', inline: true },
          { name: 'Platform', value: userInfo.platform || 'Unknown', inline: true },
          { name: 'Usage Count', value: String(userData[userIdStr].usage_count), inline: true }
        ]
      };

      const payload = { embeds: [embedData] };
      const webhookUrl = process.env.MAIN_WEBHOOK;

      if (webhookUrl) {
        const postData = JSON.stringify(payload);
        const url = new URL(webhookUrl);

        const options = {
          hostname: url.hostname,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const req = https.request(options);
        req.write(postData);
        req.end();
      }
    } catch (e) {
      // Ignore webhook errors
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'logged' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Internal error' })
    };
  }
};