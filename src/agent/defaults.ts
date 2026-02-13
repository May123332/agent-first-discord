import type { AgentSettings } from "shared/settings";

export const DEFAULT_AGENT_SETTINGS: Required<Pick<AgentSettings, "enabled" | "mode" | "localUrl" | "onlineProvider" | "onlineModel" | "localModel" | "temperature" | "maxTokens" | "invocationPrefix" | "mentionName" | "rateLimitPerMinute">> = {
    enabled: true,
    mode: "local",
    localUrl: process.env.LOCAL_LLM_URL ?? "http://localhost:8000/v1/chat/completions",
    onlineProvider: "openai",
    onlineModel: "gpt-4o-mini",
    localModel: "local-model",
    temperature: 0.7,
    maxTokens: 500,
    invocationPrefix: "!agent",
    mentionName: "agent",
    rateLimitPerMinute: 8
};

export function withAgentDefaults(settings?: AgentSettings): AgentSettings {
    return {
        ...DEFAULT_AGENT_SETTINGS,
        ...settings,
        enabledChannels: settings?.enabledChannels ?? []
    };
}
