/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { withAgentDefaults } from "agent/defaults";
import { LocalLlmClient } from "agent/localClient";
import { OnlineLlmClient } from "agent/onlineClient";
import { checkAgentPolicy } from "agent/policy";
import type { AgentChatMessage } from "agent/types";
import type { AgentSettings } from "shared/settings";

import { Settings } from "./settings";

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
    return client.sendMessage(prompt, history, effectiveSettings);
}
