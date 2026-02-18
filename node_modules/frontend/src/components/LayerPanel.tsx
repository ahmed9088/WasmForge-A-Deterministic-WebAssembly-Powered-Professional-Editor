import React from 'react';
import { Element } from '../bridge/KineticTypes';
import { Layers, Eye, EyeOff, Lock, Unlock, Square, CircleDot, Image, FolderOpen, MousePointer2, ChevronUp, ChevronDown, Trash2, Copy } from 'lucide-react';

interface LayerPanelProps {
    elements: Record<string, Element>;
    selection: string[];
    onSelect: (id: string) => void;
    onToggleVisibility: (id: string) => void;
    onToggleLock?: (id: string) => void;
    onReorder?: (id: string, direction: 'up' | 'down') => void;
    onDuplicate?: (id: string) => void;
    onDelete?: (id: string) => void;
}

function getShapeIcon(shape: any) {
    if ('Rect' in shape) return <Square size={13} className="text-blue-400" />;
    if ('Circle' in shape) return <CircleDot size={13} className="text-red-400" />;
    if ('Image' in shape) return <Image size={13} className="text-green-400" />;
    if ('Group' in shape) return <FolderOpen size={13} className="text-yellow-500" />;
    return <MousePointer2 size={13} className="text-gray-400" />;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
    elements, selection, onSelect, onToggleVisibility,
    onToggleLock, onReorder, onDuplicate, onDelete
}) => {
    const renderItem = (el: Element, depth = 0) => {
        const isSelected = selection.includes(el.id);

        return (
            <div key={el.id}>
                <div
                    onClick={() => onSelect(el.id)}
                    className={`layer-item group ${isSelected ? 'layer-item-selected' : ''}`}
                    style={{ paddingLeft: `${depth * 15 + 12}px` }}
                >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getShapeIcon(el.shape)}
                        <span className={`text-xs truncate ${isSelected ? 'text-white font-medium' : 'text-gray-400'}`}>
                            {el.name}
                        </span>
                        {el.locked && <Lock size={10} className="text-yellow-500 flex-shrink-0" />}
                    </div>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onReorder && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); onReorder(el.id, 'up'); }}
                                    className="layer-action-btn" title="Move Up">
                                    <ChevronUp size={10} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onReorder(el.id, 'down'); }}
                                    className="layer-action-btn" title="Move Down">
                                    <ChevronDown size={10} />
                                </button>
                            </>
                        )}
                        {onDuplicate && (
                            <button onClick={(e) => { e.stopPropagation(); onDuplicate(el.id); }}
                                className="layer-action-btn" title="Duplicate">
                                <Copy size={10} />
                            </button>
                        )}
                        {onDelete && (
                            <button onClick={(e) => { e.stopPropagation(); onDelete(el.id); }}
                                className="layer-action-btn text-red-500" title="Delete">
                                <Trash2 size={10} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1 ml-1">
                        {onToggleLock && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleLock(el.id); }}
                                className={`layer-toggle-btn ${el.locked ? 'text-yellow-500' : 'text-gray-600'}`}
                                title={el.locked ? 'Unlock' : 'Lock'}
                            >
                                {el.locked ? <Lock size={11} /> : <Unlock size={11} />}
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleVisibility(el.id); }}
                            className={`layer-toggle-btn ${el.visible ? 'text-gray-500' : 'text-gray-700'}`}
                            title={el.visible ? 'Hide' : 'Show'}
                        >
                            {el.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                        </button>
                    </div>
                </div>

                {'Group' in el.shape && (el.shape as any).Group.children.map((childId: string) => (
                    elements[childId] && renderItem(elements[childId], depth + 1)
                ))}
            </div>
        );
    };

    const topLevel = Object.values(elements)
        .filter(el => !el.parentId)
        .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0));

    return (
        <div className="flex flex-col h-full cyber-glass border-r w-64">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers size={16} className="text-blue-500" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Layers</h3>
                </div>
                <span className="text-[9px] text-gray-600 font-mono">{topLevel.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto py-1 custom-scrollbar">
                {topLevel.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-gray-600 italic">
                        <Layers size={24} className="mx-auto mb-2 opacity-20" />
                        No layers yet
                    </div>
                ) : (
                    topLevel.map(el => renderItem(el))
                )}
            </div>
        </div>
    );
};
