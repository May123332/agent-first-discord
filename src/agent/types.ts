import type { AgentMode, AgentSettings } from "shared/settings";

export interface AgentChatMessage {
    role: "system" | "user" | "assistant";
    author?: string;
    content: string;
    timestamp?: string;
}

export interface ChannelContext {
    channelId: string;
    channelName: string;
    guildName?: string;
    participants: string[];
}

export interface AgentResponse {
    content: string;
    model?: string;
    traceId?: string;
    traceEvents?: AgentTraceEvent[];
}

export interface AgentClient {
    sendMessage(prompt: string, history: AgentChatMessage[], settings: AgentSettings): Promise<AgentResponse>;
}

export interface AgentStartupChoice {
    mode: AgentMode;
    source: "cli" | "dialog" | "settings";
}

export type AgentTraceEventType =
    | "invocation_received"
    | "policy_blocked"
    | "model_request_start"
    | "model_request_end"
    | "tool_call_start"
    | "tool_call_end"
    | "error";

export type AgentErrorCategory = "policy" | "provider_unavailable" | "network" | "timeout" | "unknown";

export interface AgentTraceEvent {
    traceId: string;
    timestamp: string;
    eventType: AgentTraceEventType;
    provider: string;
    mode: AgentMode;
    retryCount: number;
    latencyMs: number;
    tokenEstimatePrompt: number;
    tokenEstimateCompletion: number;
    tokenEstimateTotal: number;
    errorCategory?: AgentErrorCategory;
    details?: string;
}
