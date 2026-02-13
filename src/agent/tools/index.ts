import type { AgentToolResult } from "agent/types";

export interface ToolExecutionContext {
    channelId: string;
    guildId?: string;
    messages: string[];
    participants: string[];
}

export interface AgentTool<TArgs extends Record<string, unknown> = Record<string, unknown>> {
    name: string;
    schema: Record<string, unknown>;
    execute: (args: TArgs, context: ToolExecutionContext) => Promise<AgentToolResult | Omit<AgentToolResult, "requestId" | "name">>;
}

export { READ_SAFE_TOOLS, getReadSafeToolMap } from "./readTools";
