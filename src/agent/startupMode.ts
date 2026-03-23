/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { dialog } from "electron";
import { Settings } from "main/settings";
import type { AgentMode } from "shared/settings";

import type { AgentStartupChoice } from "./types";

const CLI_ARG = "--agent-mode=";

export async function resolveAgentMode(): Promise<AgentStartupChoice> {
    const cliMode = process.argv.find(arg => arg.startsWith(CLI_ARG))?.slice(CLI_ARG.length);
    if (cliMode === "local" || cliMode === "online") {
        Settings.store.agent = {
            ...(Settings.store.agent ?? {}),
            mode: cliMode
        };
        return { mode: cliMode, source: "cli" };
    }

    const existingMode = Settings.store.agent?.mode;
    if (existingMode === "local" || existingMode === "online") {
        return { mode: existingMode, source: "settings" };
    }

    const result = await dialog.showMessageBox({
        type: "question",
        title: "Choose LLM Mode",
        message: "Select an AI backend for this session.",
        detail: "Local uses a model on your machine. Online uses a cloud provider API key.",
        buttons: ["Local", "Online"],
        cancelId: 0,
        defaultId: 0,
        noLink: true
    });

    const mode: AgentMode = result.response === 1 ? "online" : "local";
    Settings.store.agent = {
        ...(Settings.store.agent ?? {}),
        mode
    };

    return { mode, source: "dialog" };
}
