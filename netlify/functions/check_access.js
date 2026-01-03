const { Redis } = require('@upstash/redis');

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

// Load CloudTouch access data
async function loadCloudtouchAccess() {
  const redis = initRedis();
  if (redis) {
    try {
      const data = await redis.get('cloudtouch_access');
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }
  return {};
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

    const accessData = await loadCloudtouchAccess();
    const hasAccess = discordId in accessData;

    let response;
    if (hasAccess) {
      response = {
        access: true,
        granted_at: accessData[discordId].granted_at || 'Unknown'
      };
    } else {
      response = {
        access: false,
        message: 'Access denied. Purchase access using /cloudtouch-payment in Discord.'
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response)
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