/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { withAgentDefaults } from "agent/defaults";
import { LocalLlmClient } from "agent/localClient";
import { OnlineLlmClient } from "agent/onlineClient";
import { withAgentDefaults } from "agent/defaults";
import type { AgentPromptTurn } from "agent/types";
import { checkAgentPolicy } from "agent/policy";
import type { AgentChatMessage } from "agent/types";
import type { AgentSettings } from "shared/settings";

import { Settings } from "./settings";

function estimateTokens(text: string) {
    return Math.ceil((text?.length ?? 0) / 4);
}

function enforceTokenBudget(prompt: string, history: AgentChatMessage[], tokenBudget: number) {
    const cappedPrompt = prompt.slice(0, 4000);
    const historyBudget = Math.max(tokenBudget - estimateTokens(cappedPrompt), 200);
    const selected: AgentChatMessage[] = [];
    let used = 0;

    for (let i = history.length - 1; i >= 0; i--) {
        const candidate = history[i];
        const tokens = estimateTokens(`${candidate.role}:${candidate.content}`);
        if (selected.length && used + tokens > historyBudget) break;
        selected.unshift(candidate);
        used += tokens;
    }

    return { prompt: cappedPrompt, history: selected };
}

export function getCurrentAgentMode() {
    return withAgentDefaults(Settings.store.agent).mode;
}

export async function chatWithAgent(
    prompt: string,
    history: AgentChatMessage[],
    settings?: AgentSettings,
    context: AgentInvocationContext = {}
) {
    const effectiveSettings = withAgentDefaults({ ...Settings.store.agent, ...settings });
    const policy = checkAgentPolicy(effectiveSettings, context);

    if (!policy.allowed) {
        return { content: "agent disabled in this channel" };
    }

    const client = effectiveSettings.mode === "online" ? new OnlineLlmClient() : new LocalLlmClient();
          const payload = enforceTokenBudget(prompt, history, Math.max(effectiveSettings.memoryTokenBudget ?? 2400, 600));
            return client.sendMessage(payload.prompt, payload.history, effectiveSettings);
}
