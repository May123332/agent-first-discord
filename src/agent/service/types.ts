import type { AgentSettings } from "shared/settings";

import type { AgentChatMessage, AgentResponse } from "agent/types";

export type AgentInvokeTransport = "ipc-local" | "http-remote";

export interface AgentSession {
    sessionId: string;
    channelId: string;
    workspaceId?: string;
    userId: string;
}

export interface AgentAuthContext {
    actorId: string;
    actorDisplayName?: string;
    channelRole?: "owner" | "member" | "viewer";
    token?: string;
}

export interface AgentInvokeRequest {
    prompt: string;
    history: AgentChatMessage[];
    settings?: AgentSettings;
    session: AgentSession;
    auth: AgentAuthContext;
    transport?: AgentInvokeTransport;
}

export interface AgentInvokeResponse extends AgentResponse {
    sessionId: string;
}

export interface AgentInvokeService {
    invoke(request: AgentInvokeRequest): Promise<AgentInvokeResponse>;
}
