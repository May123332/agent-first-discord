export function nowMinuteWindow(times: number[], maxPerMinute: number) {
    const cutoff = Date.now() - 60_000;
    const next = times.filter(t => t >= cutoff);
    if (next.length >= maxPerMinute) return { allowed: false, times: next };
    next.push(Date.now());
    return { allowed: true, times: next };
}

export function shouldInvokeFromMessage(content: string, mentionName: string, prefix: string) {
    const lowered = content.toLowerCase();
    return lowered.includes(`@${mentionName.toLowerCase()}`) || lowered.trimStart().startsWith(prefix.toLowerCase());
}

export function contentAllowed(content: string) {
    const blocked = ["token:", "password", "credit card"];
    return !blocked.some(s => content.toLowerCase().includes(s));
}
