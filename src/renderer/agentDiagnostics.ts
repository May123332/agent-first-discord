import type { AgentTraceEvent } from "agent/types";

const MAX_TRACE_EVENTS = 150;
const listeners = new Set<() => void>();
const events: AgentTraceEvent[] = [];

export function addAgentTraceEvent(event: AgentTraceEvent) {
    events.unshift(event);
    if (events.length > MAX_TRACE_EVENTS) {
        events.splice(MAX_TRACE_EVENTS);
    }
    listeners.forEach(listener => listener());
}

export function addAgentTraceEvents(nextEvents: AgentTraceEvent[] | undefined) {
    if (!nextEvents?.length) return;
    for (const event of nextEvents) addAgentTraceEvent(event);
}

export function getAgentTraceEvents() {
    return [...events];
}

export function subscribeAgentTraceEvents(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function formatAgentTraceEvents() {
    return JSON.stringify(events, null, 2);
}
