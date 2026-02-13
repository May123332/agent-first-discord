import type { AgentSettings } from "shared/settings";

import { LocalLlmClient } from "agent/localClient";
import { OnlineLlmClient } from "agent/onlineClient";
import { withAgentDefaults } from "agent/defaults";
import type { AgentChatMessage } from "agent/types";

import { Settings } from "./settings";

export function getCurrentAgentMode() {
    return withAgentDefaults(Settings.store.agent).mode;
}

export async function chatWithAgent(prompt: string, history: AgentChatMessage[], settings?: AgentSettings) {
    const effectiveSettings = withAgentDefaults({ ...Settings.store.agent, ...settings });
    const client = effectiveSettings.mode === "online" ? new OnlineLlmClient() : new LocalLlmClient();

    return client.sendMessage(prompt, history, effectiveSettings);
}
