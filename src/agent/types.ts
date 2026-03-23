/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { AgentMode, AgentSettings } from "shared/settings";

export interface AgentChatMessage {
    role: "system" | "user" | "assistant";
    author?: string;
    content: string;
    timestamp?: string;
}

export interface AgentToolDefinition {
    name: string;
    schema: Record<string, unknown>;
}

export interface AgentToolRequest {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}

export interface AgentToolResult {
    requestId: string;
    name: string;
    content: string;
    isError?: boolean;
}

export interface AgentPromptTurn {
    prompt: string;
    history: AgentChatMessage[];
    settings: AgentSettings;
    tools?: AgentToolDefinition[];
    toolResults?: AgentToolResult[];
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
    toolRequests?: AgentToolRequest[];
}

export interface AgentInvocationContext {
    guildId?: string;
    channelId?: string;
    invokerRoleIds?: string[];
}

export interface AgentClient {
    sendMessage(turn: AgentPromptTurn): Promise<AgentResponse>;
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
