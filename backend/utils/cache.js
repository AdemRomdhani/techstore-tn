const cache = new Map();
const TTL_DEFAULT = 60 * 1000;

const cacheMiddleware = (keyFn, ttl = TTL_DEFAULT) => {
  return (req, res, next) => {
    const key = typeof keyFn === 'function' ? keyFn(req) : keyFn;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < cached.ttl) {
      return res.json(cached.data);
    }
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      cache.set(key, { data, ts: Date.now(), ttl });
      return originalJson(data);
    };
    next();
  };
};

const invalidate = (pattern) => {
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) cache.delete(key);
  }
};

const invalidateAll = () => {
  cache.clear();
};

module.exports = { cacheMiddleware, invalidate, invalidateAll };
