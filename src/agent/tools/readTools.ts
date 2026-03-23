import type { AgentTool } from "./index";

const fetchRecentChannelMessages: AgentTool<{ limit?: number; }> = {
    name: "fetch_recent_channel_messages",
    schema: {
        type: "object",
        properties: {
            limit: {
                type: "number",
                minimum: 1,
                maximum: 30,
                description: "How many recent messages to fetch"
            }
        },
        required: [],
        additionalProperties: false
    },
    async execute(args, context) {
        const limit = typeof args.limit === "number" ? Math.min(30, Math.max(1, Math.floor(args.limit))) : 12;
        return {
            content: JSON.stringify({ messages: context.messages.slice(-limit) })
        };
    }
};

const summarizeThread: AgentTool<{ limit?: number; }> = {
    name: "summarize_thread",
    schema: {
        type: "object",
        properties: {
            limit: {
                type: "number",
                minimum: 3,
                maximum: 40,
                description: "How many recent messages to include in the summary"
            }
        },
        required: [],
        additionalProperties: false
    },
    async execute(args, context) {
        const limit = typeof args.limit === "number" ? Math.min(40, Math.max(3, Math.floor(args.limit))) : 20;
        const scope = context.messages.slice(-limit);
        const bulletList = scope.map((message, index) => `${index + 1}. ${message}`).join("\n");
        return {
            content: `Thread digest (${scope.length} messages):\n${bulletList}`
        };
    }
};

const listParticipants: AgentTool = {
    name: "list_participants",
    schema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
    },
    async execute(_, context) {
        return {
            content: JSON.stringify({ participants: context.participants })
        };
    }
};

export const READ_SAFE_TOOLS = [fetchRecentChannelMessages, summarizeThread, listParticipants] as const;

export function getReadSafeToolMap() {
    return new Map(READ_SAFE_TOOLS.map(tool => [tool.name, tool]));
}
