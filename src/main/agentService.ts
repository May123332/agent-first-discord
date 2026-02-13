import { randomUUID } from "crypto";
import type { AgentSettings } from "shared/settings";

import { LocalLlmClient } from "agent/localClient";
import { OnlineLlmClient } from "agent/onlineClient";
import { withAgentDefaults } from "agent/defaults";
import type { AgentChatMessage, AgentErrorCategory, AgentTraceEvent } from "agent/types";

import { Settings } from "./settings";

function estimateTokens(text: string) {
    return Math.max(1, Math.ceil(text.length / 4));
}

function getProvider(mode: "local" | "online", settings: AgentSettings) {
    return mode === "online" ? settings.onlineProvider ?? "openai" : "local";
}

function getErrorCategory(err: unknown): AgentErrorCategory {
    const message = String((err as Error | undefined)?.message ?? err).toLowerCase();
    if (message.includes("missing environment variable")) return "provider_unavailable";
    if (message.includes("timeout")) return "timeout";
    if (message.includes("failed to reach") || message.includes("network") || message.includes("fetch")) return "network";
    return "unknown";
}

export function getCurrentAgentMode() {
    return withAgentDefaults(Settings.store.agent).mode;
}

export async function chatWithAgent(prompt: string, history: AgentChatMessage[], settings?: AgentSettings) {
    const traceId = randomUUID();
    const startedAt = Date.now();
    const effectiveSettings = withAgentDefaults({ ...Settings.store.agent, ...settings });
    const mode = effectiveSettings.mode ?? "local";
    const client = mode === "online" ? new OnlineLlmClient() : new LocalLlmClient();
    const traceEvents: AgentTraceEvent[] = [];
    const basePromptTokens = estimateTokens(prompt) + history.reduce((sum, entry) => sum + estimateTokens(entry.content), 0);

    traceEvents.push({
        traceId,
        timestamp: new Date().toISOString(),
        eventType: "model_request_start",
        provider: getProvider(mode, effectiveSettings),
        mode,
        retryCount: 0,
        latencyMs: 0,
        tokenEstimatePrompt: basePromptTokens,
        tokenEstimateCompletion: 0,
        tokenEstimateTotal: basePromptTokens
    });

    try {
        const response = await client.sendMessage(prompt, history, effectiveSettings);
        const completionTokens = estimateTokens(response.content ?? "");
        const latencyMs = Date.now() - startedAt;

        traceEvents.push({
            traceId,
            timestamp: new Date().toISOString(),
            eventType: "model_request_end",
            provider: getProvider(mode, effectiveSettings),
            mode,
            retryCount: 0,
            latencyMs,
            tokenEstimatePrompt: basePromptTokens,
            tokenEstimateCompletion: completionTokens,
            tokenEstimateTotal: basePromptTokens + completionTokens
        });

        return {
            ...response,
            traceId,
            traceEvents
        };
    } catch (err) {
        traceEvents.push({
            traceId,
            timestamp: new Date().toISOString(),
            eventType: "error",
            provider: getProvider(mode, effectiveSettings),
            mode,
            retryCount: 0,
            latencyMs: Date.now() - startedAt,
            tokenEstimatePrompt: basePromptTokens,
            tokenEstimateCompletion: 0,
            tokenEstimateTotal: basePromptTokens,
            errorCategory: getErrorCategory(err),
            details: String((err as Error | undefined)?.message ?? err)
        });
        throw Object.assign(err instanceof Error ? err : new Error(String(err)), {
            traceId,
            traceEvents
        });
    }
}
