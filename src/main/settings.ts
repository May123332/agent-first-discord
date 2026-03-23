/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { migrateAgentSettings } from "agent/policy";
import type { Settings as TSettings, State as TState } from "shared/settings";
import { SettingsStore } from "shared/utils/SettingsStore";

import { DATA_DIR, VENCORD_SETTINGS_FILE } from "./constants";

const SETTINGS_FILE = join(DATA_DIR, "settings.json");
const STATE_FILE = join(DATA_DIR, "state.json");

function migrateSettingsData(file: string, settings: object) {
    if (file !== SETTINGS_FILE) return settings;

    const next = { ...(settings as TSettings) };
    next.agent = migrateAgentSettings(next.agent);
    return next;
}

function loadSettings<T extends object = any>(file: string, name: string) {
    let settings = {} as T;
    try {
        const content = readFileSync(file, "utf8");
        try {
            settings = JSON.parse(content);
        } catch (err) {
            console.error(`Failed to parse ${name}.json:`, err);
        }
    } catch {}

    const migratedSettings = migrateSettingsData(file, settings);
    const store = new SettingsStore(migratedSettings as T);
    store.addGlobalChangeListener(o => {
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, JSON.stringify(o, null, 4));
    });

    if (migratedSettings !== settings) {
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, JSON.stringify(migratedSettings, null, 4));
    }

    return store;
}

export const Settings = loadSettings<TSettings>(SETTINGS_FILE, "Vesktop settings");
export const VencordSettings = loadSettings<any>(VENCORD_SETTINGS_FILE, "Vencord settings");
export const State = loadSettings<TState>(STATE_FILE, "Vesktop state");
