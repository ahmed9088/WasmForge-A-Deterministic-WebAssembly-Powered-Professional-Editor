type KeyMap = Record<string, string>;

const DEFAULT_KEYS: KeyMap = {
    'Digit1': 'select',
    'Digit2': 'pan',
    'KeyR': 'add_rect',
    'KeyC': 'add_circle',
    'KeyI': 'add_image',
    'KeyP': 'play_toggle',
    'Delete': 'delete_selection',
    'KeyZ': 'undo',
    'KeyY': 'redo',
};

export class HotkeyManager {
    private keyMap: KeyMap;

    constructor() {
        const saved = localStorage.getItem('kinetic-hotkeys');
        this.keyMap = saved ? JSON.parse(saved) : DEFAULT_KEYS;
    }

    getAction(code: string): string | null {
        return this.keyMap[code] || null;
    }

    setHotkey(code: string, action: string) {
        this.keyMap[code] = action;
        localStorage.setItem('kinetic-hotkeys', JSON.stringify(this.keyMap));
    }

    getMap(): KeyMap {
        return { ...this.keyMap };
    }

    reset() {
        this.keyMap = { ...DEFAULT_KEYS };
        localStorage.removeItem('kinetic-hotkeys');
    }
}

export const hotkeyManager = new HotkeyManager();
