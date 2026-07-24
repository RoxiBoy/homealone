function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createTokenBucketRateLimiter({
  capacity = 120,
  refillPerMinute = 120,
  keyPrefix = 'global',
  message = 'Too many requests. Please try again shortly.',
} = {}) {
  capacity = positiveNumber(capacity, 120);
  refillPerMinute = positiveNumber(refillPerMinute, 120);

  const buckets = new Map();
  const refillPerMs = refillPerMinute / 60_000;
  const cleanupIntervalMs = 10 * 60 * 1000;
  let lastCleanupAt = Date.now();

  function cleanup(now) {
    if (now - lastCleanupAt < cleanupIntervalMs) {
      return;
    }

    lastCleanupAt = now;
    const staleAfterMs = Math.max(60_000, (capacity / refillPerMs) * 2);
    for (const [key, bucket] of buckets.entries()) {
      if (now - bucket.updatedAt > staleAfterMs) {
        buckets.delete(key);
      }
    }
  }

  return (req, res, next) => {
    const now = Date.now();
    cleanup(now);

    const ip =
      req.ip ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    const key = `${keyPrefix}:${ip}`;
    const bucket = buckets.get(key) || {
      tokens: capacity,
      updatedAt: now,
    };

    const elapsedMs = Math.max(0, now - bucket.updatedAt);
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsedMs * refillPerMs);
    bucket.updatedAt = now;

    if (bucket.tokens < 1) {
      buckets.set(key, bucket);
      const retryAfterSeconds = Math.max(1, Math.ceil((1 - bucket.tokens) / refillPerMs / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      res.set('X-RateLimit-Limit', String(capacity));
      res.set('X-RateLimit-Remaining', '0');
      return res.status(429).json({
        message,
        retryAfterSeconds,
      });
    }

    bucket.tokens -= 1;
    buckets.set(key, bucket);

    res.set('X-RateLimit-Limit', String(capacity));
    res.set('X-RateLimit-Remaining', String(Math.floor(bucket.tokens)));
    return next();
  };
}

const apiRateLimiter = createTokenBucketRateLimiter({
  capacity: positiveNumber(process.env.API_RATE_LIMIT_BURST, 240),
  refillPerMinute: positiveNumber(process.env.API_RATE_LIMIT_PER_MINUTE, 120),
  keyPrefix: 'api',
});

const authRateLimiter = createTokenBucketRateLimiter({
  capacity: positiveNumber(process.env.AUTH_RATE_LIMIT_BURST, 10),
  refillPerMinute: positiveNumber(process.env.AUTH_RATE_LIMIT_PER_MINUTE, 5),
  keyPrefix: 'auth',
  message: 'Too many login attempts. Please wait and try again.',
});

module.exports = {
  apiRateLimiter,
  authRateLimiter,
  createTokenBucketRateLimiter,
};
