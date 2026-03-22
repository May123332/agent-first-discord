/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@vencord/types/webpack/common";

import { SettingsComponent } from "./Settings";

export const RateRepoButton: SettingsComponent = () => {
    return (
        <Button onClick={() => window.open("https://github.com/May123332/agent-first-discord", "_blank")}>
            Rate the repo
        </Button>
    );
};
