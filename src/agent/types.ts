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
    toolRequests?: AgentToolRequest[];
}

export interface AgentClient {
    sendMessage(turn: AgentPromptTurn): Promise<AgentResponse>;
}

export interface AgentStartupChoice {
    mode: AgentMode;
    source: "cli" | "dialog" | "settings";
}
