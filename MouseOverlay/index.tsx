/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

import definePlugin, { OptionType } from "../../utils/types";
import { Settings } from "../../api/Settings";

interface MouseOverlaySettings {
    cursorSize: number;
    cursorColor: string;
    trailEnabled: boolean;
    trailColor: string;
    trailLength: number;
    cursorStyle: string;
}

const CURSOR_URL = "https://github.com/Aitoner/MouseOverlay-Cursors/blob/main/Cursors/ntts.png?raw=true";

const defaultSettings: MouseOverlaySettings = {
    cursorSize: 20,
    cursorColor: "#ffffff",
    trailEnabled: false,
    trailColor: "#ffffff",
    trailLength: 5,
    cursorStyle: "circle"
};

const CURSOR_STYLES = {
    circle: "Circle",
    custom: "NTTS Cursor (NO COLOR CUSTOMIZATION, ONLY SIZE)",
};

let style: HTMLStyleElement | null = null;
let cursor: HTMLDivElement | null = null;
let trail: HTMLDivElement[] = [];
let boundUpdateMousePosition: ((e: MouseEvent) => void) | null = null;

export default definePlugin({
    name: "MouseOverlay",
    description: "Adds a customizable mouse overlay to Discord.",
    authors: [{
        name: "MrGoodWill",
        id: 835771517672620063n
    }],

    options: {
        cursorStyle: {
            type: OptionType.SELECT,
            description: "Style of the cursor",
            options: Object.entries(CURSOR_STYLES).map(([value, label]) => ({ label, value })),
            default: defaultSettings.cursorStyle,
            onChange: function() { this.updateStyles(); }
        },
        cursorSize: {
            type: OptionType.NUMBER,
            description: "Size of the cursor (in pixels)",
            default: defaultSettings.cursorSize,
            onChange: function() { this.updateStyles(); }
        },
        cursorColor: {
            type: OptionType.STRING,
            description: "Color of the cursor (hex code, only for circle style)",
            default: defaultSettings.cursorColor,
            onChange: function() { this.updateStyles(); }
        },
        trailEnabled: {
            type: OptionType.BOOLEAN,
            description: "Enable mouse trail effect",
            default: defaultSettings.trailEnabled
        },
        trailColor: {
            type: OptionType.STRING,
            description: "Color of the mouse trail (hex code)",
            default: defaultSettings.trailColor,
            onChange: function() { this.updateStyles(); }
        },
        trailLength: {
            type: OptionType.NUMBER,
            description: "Length of the mouse trail",
            default: defaultSettings.trailLength
        }
    },

    updateStyles() {
        if (!style) return;

        const settings = Settings.plugins.MouseOverlay;
        if (!settings) return;

        const cursorSize = settings.cursorSize ?? defaultSettings.cursorSize;
        const cursorColor = settings.cursorColor ?? defaultSettings.cursorColor;
        const trailColor = settings.trailColor ?? defaultSettings.trailColor;
        const cursorStyle = settings.cursorStyle ?? defaultSettings.cursorStyle;

        style.textContent = `
            * {
                cursor: none !important;
            }
            a, button, [role="button"], [class*="clickable"], [class*="interactive"],
            [class*="control"], input, textarea, select, [class*="slider"],
            [class*="scrollbar"], [class*="icon"], [class*="menu"],
            [class*="option"], [class*="item"], [class*="attachment"],
            [class*="card"], [class*="container"], [class*="wrapper"] {
                cursor: none !important;
            }
            #vencord-mouse-overlay {
                position: fixed;
                width: ${cursorSize}px;
                height: ${cursorSize}px;
                pointer-events: none;
                z-index: 999999;
                transition: transform 0.1s ease;
                will-change: transform;
                ${cursorStyle === 'circle' ? `
                    background-color: ${cursorColor};
                    border-radius: 50%;
                ` : `
                    background-image: url('${CURSOR_URL}');
                    background-size: contain;
                    background-repeat: no-repeat;
                    background-position: center;
                `}
            }
            .mouse-trail {
                position: fixed;
                width: ${cursorSize * 0.5}px;
                height: ${cursorSize * 0.5}px;
                background-color: ${trailColor};
                border-radius: 50%;
                pointer-events: none;
                z-index: 999998;
                opacity: 0.5;
            }
        `;
    },

    updateMousePosition(e: MouseEvent) {
        if (!cursor) return;

        const settings = Settings.plugins.MouseOverlay;
        if (!settings) return;

        const cursorSize = settings.cursorSize ?? defaultSettings.cursorSize;
        cursor.style.transform = `translate(${e.clientX - cursorSize / 2}px, ${e.clientY - cursorSize / 2}px)`;

        if (settings.trailEnabled) {
            const dot = document.createElement("div");
            dot.className = "mouse-trail";
            dot.style.left = `${e.clientX - cursorSize / 4}px`;
            dot.style.top = `${e.clientY - cursorSize / 4}px`;
            document.body.appendChild(dot);
            trail.push(dot);

            if (trail.length > (settings.trailLength ?? defaultSettings.trailLength)) {
                if (trail[0]?.parentNode) {
                    trail[0].remove();
                }
                trail.shift();
            }

            setTimeout(() => {
                if (dot?.parentNode) {
                    dot.remove();
                }
                trail = trail.filter(d => d !== dot);
            }, 100);
        }
    },

    start() {
        if (!document.body) return;

        // Create elements
        style = document.createElement("style");
        cursor = document.createElement("div");
        cursor.id = "vencord-mouse-overlay";

        // Add elements to DOM
        document.head.appendChild(style);
        document.body.appendChild(cursor);

        // Initialize styles
        this.updateStyles();

        // Bind the event handler and store it for cleanup
        boundUpdateMousePosition = this.updateMousePosition.bind(this);
        if (boundUpdateMousePosition) {
            document.addEventListener("mousemove", boundUpdateMousePosition);
        }
    },

    stop() {
        if (boundUpdateMousePosition) {
            document.removeEventListener("mousemove", boundUpdateMousePosition);
            boundUpdateMousePosition = null;
        }

        if (style?.parentNode) style.remove();
        if (cursor?.parentNode) cursor.remove();

        trail.forEach(dot => dot?.parentNode?.removeChild(dot));
        trail = [];

        style = null;
        cursor = null;
    }
});
