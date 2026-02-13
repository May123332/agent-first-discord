import { withAgentDefaults } from "agent/defaults";
import { LocalLlmClient } from "agent/localClient";
import { OnlineLlmClient } from "agent/onlineClient";
import type { AgentClient } from "agent/types";
import type { AgentSettings } from "shared/settings";

import type { AgentInvokeRequest, AgentInvokeResponse, AgentInvokeService } from "./types";

export class LocalAgentInvokeService implements AgentInvokeService {
    private readonly clients: Record<"local" | "online", AgentClient> = {
        local: new LocalLlmClient(),
        online: new OnlineLlmClient()
    };

    constructor(private readonly getDefaultSettings: () => AgentSettings | undefined) {}

    async invoke(request: AgentInvokeRequest): Promise<AgentInvokeResponse> {
        const settings = withAgentDefaults({ ...this.getDefaultSettings(), ...request.settings });
        const client = this.clients[settings.mode === "online" ? "online" : "local"];
        const response = await client.sendMessage(request.prompt, request.history, settings);

        return {
            ...response,
            sessionId: request.session.sessionId
        };
    }
}
