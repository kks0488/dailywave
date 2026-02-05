import asyncio
import os
import time
from dataclasses import dataclass
from typing import Optional, Tuple


def _parse_int_env(name: str, default: int) -> int:
    raw = os.getenv(name, "")
    try:
        value = int(raw)
        return value if value > 0 else default
    except Exception:
        return default


def _get_ai_limits() -> Tuple[int, int]:
    per_minute = _parse_int_env("AI_RATE_LIMIT_PER_MINUTE", 30)
    per_hour = _parse_int_env("AI_RATE_LIMIT_PER_HOUR", 300)
    return per_minute, per_hour


@dataclass(frozen=True)
class RateLimitDecision:
    allowed: bool
    retry_after_seconds: int
    limit_per_minute: int
    limit_per_hour: int
    enforced: bool = True


class _InMemoryDualTokenBucket:
    def __init__(self):
        self._lock = asyncio.Lock()
        self._state = {}

    async def consume(self, key: str, per_minute: int, per_hour: int, cost: int = 1) -> RateLimitDecision:
        # Token bucket: minute + hour buckets; both must allow.
        cap_m = float(per_minute)
        cap_h = float(per_hour)
        rate_m = cap_m / 60.0
        rate_h = cap_h / 3600.0

        now = time.monotonic()

        async with self._lock:
            st = self._state.get(key) or {
                "m_tokens": cap_m,
                "m_last": now,
                "h_tokens": cap_h,
                "h_last": now,
            }

            # Refill minute
            m_last = float(st.get("m_last") or now)
            m_tokens_raw = st.get("m_tokens")
            m_tokens = float(m_tokens_raw) if isinstance(m_tokens_raw, (int, float)) else cap_m
            m_delta = max(0.0, now - m_last)
            m_tokens = min(cap_m, m_tokens + (m_delta * rate_m))

            # Refill hour
            h_last = float(st.get("h_last") or now)
            h_tokens_raw = st.get("h_tokens")
            h_tokens = float(h_tokens_raw) if isinstance(h_tokens_raw, (int, float)) else cap_h
            h_delta = max(0.0, now - h_last)
            h_tokens = min(cap_h, h_tokens + (h_delta * rate_h))

            # Save refilled state baseline
            st.update({"m_tokens": m_tokens, "m_last": now, "h_tokens": h_tokens, "h_last": now})

            if m_tokens < cost or h_tokens < cost:
                retry_m = int(((cost - m_tokens) / rate_m) + 0.999) if m_tokens < cost else 0
                retry_h = int(((cost - h_tokens) / rate_h) + 0.999) if h_tokens < cost else 0
                self._state[key] = st
                return RateLimitDecision(
                    allowed=False,
                    retry_after_seconds=max(retry_m, retry_h, 1),
                    limit_per_minute=per_minute,
                    limit_per_hour=per_hour,
                )

            # Consume
            st["m_tokens"] = m_tokens - cost
            st["h_tokens"] = h_tokens - cost
            self._state[key] = st
            return RateLimitDecision(
                allowed=True,
                retry_after_seconds=0,
                limit_per_minute=per_minute,
                limit_per_hour=per_hour,
            )


_REDIS_SCRIPT = r"""
-- Dual token bucket (minute + hour) in one hash.
-- KEYS[1] = key
-- ARGV[1] = cap_m
-- ARGV[2] = rate_m (tokens/sec)
-- ARGV[3] = cap_h
-- ARGV[4] = rate_h (tokens/sec)
-- ARGV[5] = now_ms
-- ARGV[6] = cost
-- ARGV[7] = ttl_seconds
local cap_m = tonumber(ARGV[1])
local rate_m = tonumber(ARGV[2])
local cap_h = tonumber(ARGV[3])
local rate_h = tonumber(ARGV[4])
local now_ms = tonumber(ARGV[5])
local cost = tonumber(ARGV[6])
local ttl = tonumber(ARGV[7])

local data = redis.call('HMGET', KEYS[1], 'm_tokens', 'm_last_ms', 'h_tokens', 'h_last_ms')
local m_tokens = tonumber(data[1])
local m_last = tonumber(data[2])
local h_tokens = tonumber(data[3])
local h_last = tonumber(data[4])

if m_tokens == nil then m_tokens = cap_m end
if h_tokens == nil then h_tokens = cap_h end
if m_last == nil then m_last = now_ms end
if h_last == nil then h_last = now_ms end

local m_delta = now_ms - m_last
if m_delta < 0 then m_delta = 0 end
local h_delta = now_ms - h_last
if h_delta < 0 then h_delta = 0 end

m_tokens = math.min(cap_m, m_tokens + (m_delta / 1000.0) * rate_m)
h_tokens = math.min(cap_h, h_tokens + (h_delta / 1000.0) * rate_h)

-- Store refilled baseline
redis.call('HMSET', KEYS[1], 'm_tokens', m_tokens, 'm_last_ms', now_ms, 'h_tokens', h_tokens, 'h_last_ms', now_ms)
redis.call('EXPIRE', KEYS[1], ttl)

local allowed = 1
local retry_after = 0

if m_tokens < cost then
  allowed = 0
  retry_after = math.ceil((cost - m_tokens) / rate_m)
end
if h_tokens < cost then
  allowed = 0
  local rh = math.ceil((cost - h_tokens) / rate_h)
  if rh > retry_after then retry_after = rh end
end

if allowed == 0 then
  if retry_after < 1 then retry_after = 1 end
  return {0, retry_after}
end

-- Consume from both
m_tokens = m_tokens - cost
h_tokens = h_tokens - cost
redis.call('HMSET', KEYS[1], 'm_tokens', m_tokens, 'h_tokens', h_tokens)
return {1, 0}
"""


class _RedisDualTokenBucket:
    def __init__(self, redis_url: str):
        self._redis_url = redis_url
        self._redis = None
        self._script_sha = None
        self._lock = asyncio.Lock()

    async def _get_redis(self):
        if self._redis is not None:
            return self._redis

        try:
            import redis.asyncio as redis  # type: ignore
        except Exception:
            return None

        self._redis = redis.from_url(self._redis_url)
        return self._redis

    async def _ensure_script(self):
        if self._script_sha:
            return self._script_sha

        async with self._lock:
            if self._script_sha:
                return self._script_sha
            r = await self._get_redis()
            if not r:
                return None
            try:
                self._script_sha = await r.script_load(_REDIS_SCRIPT)
                return self._script_sha
            except Exception:
                return None

    async def consume(self, key: str, per_minute: int, per_hour: int, cost: int = 1) -> RateLimitDecision:
        r = await self._get_redis()
        if not r:
            # fallback to allow (or caller will fallback to memory limiter)
            return RateLimitDecision(True, 0, per_minute, per_hour, enforced=False)

        sha = await self._ensure_script()
        if not sha:
            return RateLimitDecision(True, 0, per_minute, per_hour, enforced=False)

        cap_m = float(per_minute)
        cap_h = float(per_hour)
        rate_m = cap_m / 60.0
        rate_h = cap_h / 3600.0
        now_ms = int(time.time() * 1000)
        ttl_seconds = 2 * 3600

        try:
            allowed, retry_after = await r.evalsha(
                sha,
                1,
                key,
                cap_m,
                rate_m,
                cap_h,
                rate_h,
                now_ms,
                int(cost),
                int(ttl_seconds),
            )
            allowed_bool = bool(int(allowed))
            retry = int(retry_after) if not allowed_bool else 0
            return RateLimitDecision(allowed_bool, retry, per_minute, per_hour)
        except Exception:
            return RateLimitDecision(True, 0, per_minute, per_hour, enforced=False)


class RateLimiter:
    def __init__(self):
        self._memory = _InMemoryDualTokenBucket()
        self._redis_limiter: Optional[_RedisDualTokenBucket] = None

    def _get_redis_limiter(self) -> Optional[_RedisDualTokenBucket]:
        redis_url = os.getenv("REDIS_URL", "").strip()
        if not redis_url:
            return None
        if self._redis_limiter is None or self._redis_limiter._redis_url != redis_url:
            self._redis_limiter = _RedisDualTokenBucket(redis_url)
        return self._redis_limiter

    async def consume_ai(self, key: str, cost: int = 1) -> RateLimitDecision:
        per_minute, per_hour = _get_ai_limits()

        redis_limiter = self._get_redis_limiter()
        if redis_limiter:
            decision = await redis_limiter.consume(f"dailywave:ai:{key}", per_minute, per_hour, cost=cost)
            if decision.enforced:
                return decision
            # If Redis is misconfigured/unavailable, fall through to in-memory.

        return await self._memory.consume(f"dailywave:ai:{key}", per_minute, per_hour, cost=cost)


_GLOBAL_LIMITER: Optional[RateLimiter] = None


def get_rate_limiter() -> RateLimiter:
    global _GLOBAL_LIMITER
    if _GLOBAL_LIMITER is None:
        _GLOBAL_LIMITER = RateLimiter()
    return _GLOBAL_LIMITER
