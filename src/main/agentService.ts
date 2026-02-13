import type { AgentSettings } from "shared/settings";

import { withAgentDefaults } from "agent/defaults";
import { LocalLlmClient } from "agent/localClient";
import { OnlineLlmClient } from "agent/onlineClient";
import { checkAgentPolicy } from "agent/policy";
import type { AgentChatMessage, AgentInvocationContext } from "agent/types";

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
