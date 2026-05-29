const axios = require('axios');
const redis = require('redis');

const REDIS_URL = process.env.REDIS_URL || null;
let redisClient = null;
if (REDIS_URL) {
  redisClient = redis.createClient({ url: REDIS_URL });
  redisClient.connect().catch(err => {
    console.warn('Redis connection failed, continuing without cache:', err.message);
    redisClient = null;
  });
}

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!API_KEY) {
  console.warn('GOOGLE_MAPS_API_KEY not set — Google Maps requests will fail if used.');
}

async function _cacheGet(key) {
  if (!redisClient) return null;
  try {
    const v = await redisClient.get(key);
    return v ? JSON.parse(v) : null;
  } catch (e) {
    return null;
  }
}

async function _cacheSet(key, value, ttlSeconds = 3600) {
  if (!redisClient) return;
  try {
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (e) {
    // ignore
  }
}

function _encodeForUrl(obj) {
  return encodeURIComponent(typeof obj === 'string' ? obj : `${obj.lat},${obj.lng}`);
}

async function geocode(address) {
  if (!address) return null;
  const key = `geocode:${address}`;
  const cached = await _cacheGet(key);
  if (cached) return cached;

  if (!API_KEY) throw new Error('Missing Google Maps API key');

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;
  const res = await axios.get(url, { timeout: 8000 });
  if (!res.data || !res.data.results || res.data.results.length === 0) return null;
  const location = res.data.results[0].geometry.location;
  await _cacheSet(key, location, 60 * 60 * 24);
  return location;
}

async function getDistanceAndDuration(origin, destination) {
  // origin/destination can be strings (address) or {lat,lng}
  const originKey = typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`;
  const destKey = typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`;
  const cacheKey = `dist:${originKey}|${destKey}`;
  const cached = await _cacheGet(cacheKey);
  if (cached) return cached;

  if (!API_KEY) throw new Error('Missing Google Maps API key');

  const origins = _encodeForUrl(origin);
  const destinations = _encodeForUrl(destination);
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${API_KEY}&units=metric`;

  const res = await axios.get(url, { timeout: 8000 });
  if (!res.data || !res.data.rows || res.data.rows.length === 0) throw new Error('No distance matrix result');
  const element = res.data.rows[0].elements[0];
  if (!element || element.status !== 'OK') throw new Error('Distance element unavailable');

  const result = {
    distanceMeters: element.distance.value,
    durationSeconds: element.duration.value,
    distanceText: element.distance.text,
    durationText: element.duration.text
  };

  await _cacheSet(cacheKey, result, 60 * 30);
  return result;
}

module.exports = {
  geocode,
  getDistanceAndDuration
};
