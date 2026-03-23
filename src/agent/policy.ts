import type { AgentPolicyPrecedence, AgentPolicySettings, AgentSettings } from "shared/settings";

export interface AgentPolicyContext {
    guildId?: string;
    channelId?: string;
    invokerRoleIds?: string[];
}

export interface AgentPolicyResult {
    allowed: boolean;
    reason?: "guild" | "channel" | "roles";
}

const DEFAULT_PRECEDENCE: AgentPolicyPrecedence = "deny";

function hasKeys(map?: Record<string, true>) {
    return !!map && Object.keys(map).length > 0;
}

function matchesMap(id: string | undefined, map?: Record<string, true>) {
    return !!id && !!map?.[id];
}

function evaluateScope(
    id: string | undefined,
    allowedMap: Record<string, true> | undefined,
    deniedMap: Record<string, true> | undefined,
    precedence: AgentPolicyPrecedence
) {
    const allowlistEnabled = hasKeys(allowedMap);
    const allowed = matchesMap(id, allowedMap);
    const denied = matchesMap(id, deniedMap);

    if (allowed && denied) return precedence === "allow";
    if (denied) return false;

    if (!allowlistEnabled) return true;
    if (!id) return false;

    return allowed;
}

function getRequiredRoles(policy: AgentPolicySettings, context: AgentPolicyContext) {
    const map = policy.requiredInvokerRoles;
    if (!map) return [];

    return map[context.channelId ?? ""] ?? map[context.guildId ?? ""] ?? map["*"] ?? [];
}

function sanitizeTrueMap(map?: Record<string, true>) {
    if (!map) return undefined;

    const entries = Object.entries(map)
        .map(([key, value]) => [key.trim(), value] as const)
        .filter(([key, value]) => Boolean(key) && value === true);

    return Object.fromEntries(entries) as Record<string, true>;
}

function sanitizeRoleMap(map?: Record<string, string[]>) {
    if (!map) return undefined;

    const entries = Object.entries(map)
        .map(([key, roles]) => [
            key.trim(),
            Array.from(new Set((roles ?? []).map(role => role.trim()).filter(Boolean)))
        ] as const)
        .filter(([key, roles]) => Boolean(key) && roles.length > 0);

    return Object.fromEntries(entries) as Record<string, string[]>;
}

export function migrateAgentSettings(agent?: AgentSettings): AgentSettings | undefined {
    if (!agent) return agent;

    const policy = {
        ...(agent.policy ?? {}),
        allowedChannelIds: {
            ...(agent.policy?.allowedChannelIds ?? {}),
            ...Object.fromEntries((agent.enabledChannels ?? []).map(id => [id, true] as const))
        }
    } as AgentPolicySettings;

    return {
        ...agent,
        enabledChannels: undefined,
        policy: {
            ...policy,
            precedence: policy.precedence ?? DEFAULT_PRECEDENCE,
            allowedGuildIds: sanitizeTrueMap(policy.allowedGuildIds),
            deniedGuildIds: sanitizeTrueMap(policy.deniedGuildIds),
            allowedChannelIds: sanitizeTrueMap(policy.allowedChannelIds),
            deniedChannelIds: sanitizeTrueMap(policy.deniedChannelIds),
            requiredInvokerRoles: sanitizeRoleMap(policy.requiredInvokerRoles)
        }
    };
}

export function checkAgentPolicy(settings: AgentSettings, context: AgentPolicyContext): AgentPolicyResult {
    const precedence = settings.policy?.precedence ?? DEFAULT_PRECEDENCE;

    if (!evaluateScope(context.guildId, settings.policy?.allowedGuildIds, settings.policy?.deniedGuildIds, precedence)) {
        return { allowed: false, reason: "guild" };
    }

    if (!evaluateScope(context.channelId, settings.policy?.allowedChannelIds, settings.policy?.deniedChannelIds, precedence)) {
        return { allowed: false, reason: "channel" };
    }

    const requiredRoles = getRequiredRoles(settings.policy ?? {}, context);
    if (!requiredRoles.length) return { allowed: true };

    const invokerRoles = context.invokerRoleIds ?? [];
    const hasRole = requiredRoles.some(role => invokerRoles.includes(role));

    return hasRole ? { allowed: true } : { allowed: false, reason: "roles" };
}
