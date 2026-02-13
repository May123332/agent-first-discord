export interface AgentLogEntry {
    timestamp: string;
    channelId: string;
    guildId?: string;
    toolName: string;
    summary: string;
    status: "ok" | "error" | "blocked";
}

const maxEntries = 100;
const entries: AgentLogEntry[] = [];
const listeners = new Set<() => void>();

export function logAgentTool(entry: AgentLogEntry) {
    entries.unshift(entry);
    if (entries.length > maxEntries) entries.length = maxEntries;
    listeners.forEach(cb => cb());
}

export function getAgentToolLog() {
    return entries;
}

export function subscribeAgentToolLog(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}
