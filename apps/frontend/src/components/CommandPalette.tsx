import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Square, Circle, Image, Undo2, Redo2, Play, ZoomIn, ZoomOut, Download, Copy, Trash2, Lock, Keyboard } from 'lucide-react';

interface Command {
    id: string;
    label: string;
    shortcut?: string;
    icon: React.ReactNode;
    category: string;
    action: () => void;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    commands: Command[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const filtered = commands.filter(cmd =>
        cmd.label.toLowerCase().includes(query.toLowerCase()) ||
        cmd.category.toLowerCase().includes(query.toLowerCase())
    );

    const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
        if (!acc[cmd.category]) acc[cmd.category] = [];
        acc[cmd.category].push(cmd);
        return acc;
    }, {});

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filtered[selectedIndex]) {
                filtered[selectedIndex].action();
                onClose();
            }
        }
    }, [filtered, selectedIndex, onClose]);

    if (!isOpen) return null;

    return (
        <div className="command-palette-overlay" onClick={onClose}>
            <div className="command-palette" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
                <div className="command-palette-search">
                    <Search size={16} className="text-gray-500" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                        placeholder="Type a command..."
                        className="command-palette-input"
                    />
                    <kbd className="command-palette-kbd">ESC</kbd>
                </div>

                <div className="command-palette-results">
                    {Object.entries(grouped).length === 0 && (
                        <div className="command-palette-empty">No commands found</div>
                    )}
                    {Object.entries(grouped).map(([category, cmds]) => (
                        <div key={category}>
                            <div className="command-palette-category">{category}</div>
                            {cmds.map((cmd) => {
                                const globalIdx = filtered.indexOf(cmd);
                                return (
                                    <button
                                        key={cmd.id}
                                        className={`command-palette-item ${globalIdx === selectedIndex ? 'active' : ''}`}
                                        onClick={() => { cmd.action(); onClose(); }}
                                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                                    >
                                        <div className="command-palette-item-left">
                                            {cmd.icon}
                                            <span>{cmd.label}</span>
                                        </div>
                                        {cmd.shortcut && <kbd className="command-palette-shortcut">{cmd.shortcut}</kbd>}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
