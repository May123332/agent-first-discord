export interface RateLimitResult {
    allowed: boolean;
    nextBucket: number[];
}

export function applyMinuteRateLimit(times: number[], maxPerMinute: number, now = Date.now()): RateLimitResult {
    const cutoff = now - 60_000;
    const nextBucket = times.filter(timestamp => timestamp >= cutoff);
    if (nextBucket.length >= maxPerMinute) return { allowed: false, nextBucket };

    nextBucket.push(now);
    return { allowed: true, nextBucket };
}
