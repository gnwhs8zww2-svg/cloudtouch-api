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

    const userId = String(data.user_id || '');
    const action = data.action || '';

    const accessData = await loadCloudtouchAccess();

    let response;
    if (action === 'grant') {
      if (!(userId in accessData)) {
        accessData[userId] = {
          granted_at: new Date().toISOString(),
          granted_by: 'discord_bot',
          download_link: data.download_link || ''
        };
        await saveCloudtouchAccess(accessData);
        response = { status: 'granted' };
      } else {
        response = { status: 'already_granted' };
      }
    } else if (action === 'revoke') {
      if (userId in accessData) {
        delete accessData[userId];
        await saveCloudtouchAccess(accessData);
        response = { status: 'revoked' };
      } else {
        response = { status: 'not_found' };
      }
    } else {
      response = { status: 'no_change' };
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