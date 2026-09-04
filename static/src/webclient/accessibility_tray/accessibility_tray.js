/** @odoo-module **/
/**
 * Barra de Accesibilidad - SLEP Chinchorro
 * Cumple con: WCAG 2.1 AA · NTS-WEB Chile · Directrices SENADIS
 *
 * Funciones:
 *  - Control de tamaño de texto (80% / 100% / 115% / 130%)
 *  - Modo Alto Contraste (blanco/amarillo sobre negro, ratio 21:1 / 19.6:1)
 *  - Modo Oscuro (fondo oscuro con texto claro, ratio >= 4.5:1)
 *
 * Los modos Alto Contraste y Oscuro son mutuamente excluyentes.
 * El estado se persiste en localStorage entre sesiones.
 */

import { Component, useState, useRef, onMounted, onWillUnmount } from "@odoo/owl";
import { registry } from "@web/core/registry";

const FONT_SIZES   = ["a11y-text-sm", "a11y-text-md", "a11y-text-lg", "a11y-text-xl"];
const FONT_LABELS  = ["Pequeño (80%)", "Normal (100%)", "Grande (115%)", "Muy grande (130%)"];
const DEFAULT_FONT = 1;

export class AccessibilityTray extends Component {
    static template = "code_backend_theme.AccessibilityTray";
    static props    = {};

    setup() {
        this.rootRef = useRef("root");

        const savedFont = parseInt(localStorage.getItem("a11y_font_size"));
        this.state = useState({
            isOpen:        false,
            fontSizeIndex: isNaN(savedFont)
                ? DEFAULT_FONT
                : Math.min(Math.max(savedFont, 0), FONT_SIZES.length - 1),
            highContrast:  localStorage.getItem("a11y_high_contrast") === "true",
            darkMode:      localStorage.getItem("a11y_dark_mode")      === "true",
        });

        const onOutsideClick = (ev) => {
            if (this.rootRef.el && !this.rootRef.el.contains(ev.target)) {
                this.state.isOpen = false;
            }
        };
        const onKeyDown = (ev) => {
            if (ev.key === "Escape" && this.state.isOpen) {
                this.state.isOpen = false;
            }
        };

        onMounted(() => {
            this._applyAll();
            document.addEventListener("click",   onOutsideClick);
            document.addEventListener("keydown",  onKeyDown);
        });

        onWillUnmount(() => {
            document.removeEventListener("click",   onOutsideClick);
            document.removeEventListener("keydown",  onKeyDown);
        });
    }

    // ── Aplicadores de estado ──────────────────────────────────────────────

    _applyAll() {
        this._applyFontSize();
        this._applyHighContrast();
        this._applyDarkMode();
    }

    _applyFontSize() {
        FONT_SIZES.forEach((cls) => document.body.classList.remove(cls));
        document.body.classList.add(FONT_SIZES[this.state.fontSizeIndex]);
    }

    _applyHighContrast() {
        document.body.classList.toggle("a11y-high-contrast", this.state.highContrast);
    }

    _applyDarkMode() {
        document.body.classList.toggle("a11y-dark-mode", this.state.darkMode);
    }

    // ── Handlers del panel ─────────────────────────────────────────────────

    togglePanel(ev) {
        ev.stopPropagation();
        this.state.isOpen = !this.state.isOpen;
    }

    // ── Tamaño de texto ────────────────────────────────────────────────────

    increaseFontSize() {
        if (this.state.fontSizeIndex < FONT_SIZES.length - 1) {
            this.state.fontSizeIndex++;
            localStorage.setItem("a11y_font_size", this.state.fontSizeIndex);
            this._applyFontSize();
        }
    }

    decreaseFontSize() {
        if (this.state.fontSizeIndex > 0) {
            this.state.fontSizeIndex--;
            localStorage.setItem("a11y_font_size", this.state.fontSizeIndex);
            this._applyFontSize();
        }
    }

    resetFontSize() {
        this.state.fontSizeIndex = DEFAULT_FONT;
        localStorage.setItem("a11y_font_size", DEFAULT_FONT);
        this._applyFontSize();
    }

    // ── Alto Contraste ─────────────────────────────────────────────────────

    toggleHighContrast() {
        this.state.highContrast = !this.state.highContrast;
        localStorage.setItem("a11y_high_contrast", this.state.highContrast);
        if (this.state.highContrast && this.state.darkMode) {
            this.state.darkMode = false;
            localStorage.setItem("a11y_dark_mode", false);
            this._applyDarkMode();
        }
        this._applyHighContrast();
    }

    // ── Modo Oscuro ────────────────────────────────────────────────────────

    toggleDarkMode() {
        this.state.darkMode = !this.state.darkMode;
        localStorage.setItem("a11y_dark_mode", this.state.darkMode);
        if (this.state.darkMode && this.state.highContrast) {
            this.state.highContrast = false;
            localStorage.setItem("a11y_high_contrast", false);
            this._applyHighContrast();
        }
        this._applyDarkMode();
    }

    // ── Getters para template ──────────────────────────────────────────────

    get currentFontLabel() {
        return FONT_LABELS[this.state.fontSizeIndex];
    }

    get canIncrease() {
        return this.state.fontSizeIndex < FONT_SIZES.length - 1;
    }

    get canDecrease() {
        return this.state.fontSizeIndex > 0;
    }
}

// Secuencia 500 → aparece primero (más a la izquierda) dentro del systray.
// El NavBar invierte el orden, por lo que mayor secuencia = posición más a la izquierda.
registry.category("systray").add(
    "code_backend_theme.AccessibilityTray",
    { Component: AccessibilityTray },
    { sequence: 500 }
);
