import React from 'react';
import { Element } from '../bridge/KineticTypes';
import { Layers, Eye, EyeOff, FolderOpen, MousePointer2 } from 'lucide-react';

interface LayerPanelProps {
    elements: Record<string, Element>;
    selection: string[];
    onSelect: (id: string) => void;
    onToggleVisibility: (id: string) => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({ elements, selection, onSelect, onToggleVisibility }) => {
    const renderItem = (el: Element, depth = 0) => {
        const isSelected = selection.includes(el.id);

        return (
            <div key={el.id}>
                <div
                    onClick={() => onSelect(el.id)}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-blue-600/20 border-l-2 border-blue-500' : 'hover:bg-[#111]'}`}
                    style={{ paddingLeft: `${depth * 15 + 12}px` }}
                >
                    <div className="flex items-center gap-2">
                        {el.shape.kind === 'Group' ? <FolderOpen size={14} className="text-yellow-500" /> : <MousePointer2 size={14} className="text-gray-400" />}
                        <span className={`text-xs ${isSelected ? 'text-white' : 'text-gray-400'}`}>{el.name}</span>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleVisibility(el.id); }}
                        className="text-gray-500 hover:text-white"
                    >
                        {el.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                </div>
                {el.shape.kind === 'Group' && (el.shape.data as any).children.map((childId: string) => (
                    elements[childId] && renderItem(elements[childId], depth + 1)
                ))}
            </div>
        );
    };

    const topLevel = Object.values(elements).filter(el => !el.parentId);

    return (
        <div className="flex flex-col h-full cyber-glass border-r w-64">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers size={16} className="text-blue-500" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Layers</h3>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
                {topLevel.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-gray-600 italic">No layers yet</div>
                ) : (
                    topLevel.map(el => renderItem(el))
                )}
            </div>
        </div>
    );
};
