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

// Save CloudTouch access data
async function saveCloudtouchAccess(accessData) {
  const redis = initRedis();
  if (redis) {
    try {
      await redis.set('cloudtouch_access', JSON.stringify(accessData));
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }

  if (event.httpMethod !== 'GET') {
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
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'online' })
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