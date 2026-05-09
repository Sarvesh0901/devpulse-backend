import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/** Returns cached value if exists and not expired, else null. */
export async function getCached(key) {
  const { data, error } = await supabase
    .from('github_cache')
    .select('data, expires_at')
    .eq('cache_key', key)
    .single();

  if (error || !data) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  return data.data;
}

/** Stores a value in the cache with a TTL in seconds. */
export async function setCache(key, value, ttlSeconds = 300) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await supabase.from('github_cache').upsert(
    { cache_key: key, data: value, expires_at: expiresAt },
    { onConflict: 'cache_key' }
  );
}

/**
 * Cache-aside helper.
 * If cached → return it. Otherwise call fn(), store result, return it.
 */
export async function withCache(key, ttlSeconds, fn) {
  const cached = await getCached(key);
  if (cached !== null) return cached;

  const result = await fn();
  await setCache(key, result, ttlSeconds);
  return result;
}
