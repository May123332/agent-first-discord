import type { AgentChatMessage } from "agent/types";

export interface ChannelMessageSnapshot {
    content: string;
    author?: string;
}

export function buildChannelMemory(messages: ChannelMessageSnapshot[], limit = 12): AgentChatMessage[] {
    return messages.slice(-limit).map(message => ({
        role: "user",
        author: message.author,
        content: message.content.slice(0, 1200)
    }));
}
