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
}

export interface AgentClient {
    sendMessage(prompt: string, history: AgentChatMessage[], settings: AgentSettings): Promise<AgentResponse>;
}

export interface AgentStartupChoice {
    mode: AgentMode;
    source: "cli" | "dialog" | "settings";
}
