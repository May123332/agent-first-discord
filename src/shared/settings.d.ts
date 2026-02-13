/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Rectangle } from "electron";

export interface Settings {
    discordBranch?: "stable" | "canary" | "ptb";
    transparencyOption?: "none" | "mica" | "tabbed" | "acrylic";
    tray?: boolean;
    minimizeToTray?: boolean;
    openLinksWithElectron?: boolean;
    staticTitle?: boolean;
    enableMenu?: boolean;
    disableSmoothScroll?: boolean;
    hardwareAcceleration?: boolean;
    hardwareVideoAcceleration?: boolean;
    arRPC?: boolean;
    appBadge?: boolean;
    disableMinSize?: boolean;
    clickTrayToShowHide?: boolean;
    customTitleBar?: boolean;

    enableSplashScreen?: boolean;
    splashTheming?: boolean;
    splashColor?: string;
    splashBackground?: string;

    spellCheckLanguages?: string[];

    agent?: AgentSettings;

    audio?: {
        workaround?: boolean;

        deviceSelect?: boolean;
        granularSelect?: boolean;

        ignoreVirtual?: boolean;
        ignoreDevices?: boolean;
        ignoreInputMedia?: boolean;

        onlySpeakers?: boolean;
        onlyDefaultSpeakers?: boolean;
    };
}



export type AgentMode = "local" | "online";

export type AgentPolicyPrecedence = "deny" | "allow";

export interface AgentPolicySettings {
    allowedGuildIds?: Record<string, true>;
    deniedGuildIds?: Record<string, true>;
    allowedChannelIds?: Record<string, true>;
    deniedChannelIds?: Record<string, true>;
    requiredInvokerRoles?: Record<string, string[]>;
    precedence?: AgentPolicyPrecedence;
}

export interface AgentSettings {
    enabled?: boolean;
    mode?: AgentMode;
    localUrl?: string;
    onlineProvider?: "openai" | "anthropic";
    onlineModel?: string;
    localModel?: string;
    temperature?: number;
    maxTokens?: number;
    invocationPrefix?: string;
    mentionName?: string;
    /** @deprecated use policy.allowedChannelIds instead */
    enabledChannels?: string[];
    policy?: AgentPolicySettings;
    rateLimitPerMinute?: number;
}

export interface State {
    maximized?: boolean;
    minimized?: boolean;
    windowBounds?: Rectangle;
    displayId: int;

    firstLaunch?: boolean;

    steamOSLayoutVersion?: number;

    vencordDir?: string;
}
