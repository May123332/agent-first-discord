/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app, NativeImage, nativeImage } from "electron";

const imgCache = new Map<number, NativeImage>();

function makeBadgeSvg(label: string) {
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="30" fill="#ed4245" />
  <text x="32" y="40" text-anchor="middle" font-family="sans-serif" font-size="28" font-weight="700" fill="#fff">${label}</text>
</svg>`;
}

function svgToNativeImage(svg: string) {
    const data = Buffer.from(svg, "utf8").toString("base64");
    return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${data}`);
}

function loadBadge(index: number) {
    const cached = imgCache.get(index);
    if (cached) return cached;

    const img = svgToNativeImage(makeBadgeSvg(index === 11 ? "•" : String(index)));
    imgCache.set(index, img);

    return img;
}

let lastIndex: null | number = -1;

export function setBadgeCount(count: number) {
    switch (process.platform) {
        case "linux":
            if (count === -1) count = 0;
            app.setBadgeCount(count);
            break;
        case "darwin":
            if (count === 0) {
                app.dock!.setBadge("");
                break;
            }
            app.dock!.setBadge(count === -1 ? "•" : count.toString());
            break;
        case "win32": {
            const [index, description] = getBadgeIndexAndDescription(count);
            if (lastIndex === index) break;

            lastIndex = index;

            // circular import shenanigans
            const { mainWin } = require("./mainWindow") as typeof import("./mainWindow");
            mainWin.setOverlayIcon(index === null ? null : loadBadge(index), description);
            break;
        }
    }
}

function getBadgeIndexAndDescription(count: number): [number | null, string] {
    if (count === -1) return [11, "Unread Messages"];
    if (count === 0) return [null, "No Notifications"];

    const index = Math.max(1, Math.min(count, 10));
    return [index, `${index} Notification`];
}
