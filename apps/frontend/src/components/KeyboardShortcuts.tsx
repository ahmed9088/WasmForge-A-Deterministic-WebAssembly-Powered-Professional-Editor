import React from 'react';
import { X } from 'lucide-react';

interface KeyboardShortcutsProps {
    isOpen: boolean;
    onClose: () => void;
}

const shortcuts = [
    {
        category: 'Tools', items: [
            { keys: ['V'], description: 'Select tool' },
            { keys: ['H'], description: 'Pan / Hand tool' },
            { keys: ['R'], description: 'Add Rectangle' },
            { keys: ['C'], description: 'Add Circle' },
        ]
    },
    {
        category: 'Actions', items: [
            { keys: ['Ctrl', 'Z'], description: 'Undo' },
            { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
            { keys: ['Ctrl', 'D'], description: 'Duplicate element' },
            { keys: ['Del'], description: 'Delete element' },
            { keys: ['Ctrl', 'P'], description: 'Command Palette' },
        ]
    },
    {
        category: 'Navigation', items: [
            { keys: ['↑', '↓', '←', '→'], description: 'Nudge element (1px)' },
            { keys: ['Shift', '↑↓←→'], description: 'Nudge element (10px)' },
            { keys: ['Scroll'], description: 'Zoom in / out' },
            { keys: ['Space'], description: 'Toggle playback' },
        ]
    },
    {
        category: 'View', items: [
            { keys: ['?'], description: 'Show keyboard shortcuts' },
            { keys: ['Ctrl', '+'], description: 'Zoom in' },
            { keys: ['Ctrl', '-'], description: 'Zoom out' },
        ]
    },
];

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="command-palette-overlay" onClick={onClose}>
            <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
                <div className="shortcuts-header">
                    <h2 className="text-sm font-black tracking-widest uppercase text-gray-300">Keyboard Shortcuts</h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-500 hover:text-white">
                        <X size={16} />
                    </button>
                </div>

                <div className="shortcuts-grid">
                    {shortcuts.map(group => (
                        <div key={group.category} className="shortcuts-group">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-3">{group.category}</h3>
                            <div className="space-y-2">
                                {group.items.map((item, i) => (
                                    <div key={i} className="shortcuts-item">
                                        <span className="text-xs text-gray-400">{item.description}</span>
                                        <div className="flex gap-1">
                                            {item.keys.map((key, j) => (
                                                <kbd key={j} className="shortcut-key">{key}</kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
