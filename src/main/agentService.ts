import { withAgentDefaults } from "agent/defaults";
import { LocalAgentInvokeService } from "agent/service/localAgentInvokeService";
import type { AgentInvokeRequest } from "agent/service/types";

import { Settings } from "./settings";

const invokeService = new LocalAgentInvokeService(() => Settings.store.agent);

export function getCurrentAgentMode() {
    return withAgentDefaults(Settings.store.agent).mode;
}

export async function invokeAgent(request: AgentInvokeRequest) {
    return invokeService.invoke(request);
}
