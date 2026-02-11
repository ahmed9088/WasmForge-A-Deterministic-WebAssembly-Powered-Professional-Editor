import React from 'react';
import { Element } from '../bridge/KineticTypes';
import { Settings2, Move, Palette, Type } from 'lucide-react';

interface PropertyInspectorProps {
    element: Element | null;
    onUpdate: (id: string, updates: Partial<any>) => void;
}

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({ element, onUpdate }) => {
    if (!element) {
        return (
            <div className="w-64 cyber-glass border-l flex flex-col p-6 text-center text-gray-600">
                <Settings2 size={32} className="mx-auto mb-4 opacity-20" />
                <p className="text-xs italic">Select an element to edit properties</p>
            </div>
        );
    }

    return (
        <div className="w-64 cyber-glass border-l flex flex-col overflow-y-auto">
            <div className="p-4 border-b border-white/5 flex items-center gap-2">
                <Settings2 size={16} className="text-blue-500" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Properties</h3>
            </div>

            <div className="p-6 flex flex-col gap-6">
                <section>
                    <div className="flex items-center gap-2 mb-3 text-gray-500">
                        <Type size={14} />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Identity</span>
                    </div>
                    <input
                        type="text"
                        value={element.name}
                        className="w-full bg-[#111] border border-[#222] rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                        onChange={(e) => onUpdate(element.id, { name: e.target.value })}
                    />
                </section>

                <section>
                    <div className="flex items-center gap-2 mb-3 text-gray-500">
                        <Palette size={14} />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Appearance</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            value={element.fill}
                            className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
                            onChange={(e) => onUpdate(element.id, { fill: e.target.value })}
                        />
                        <span className="text-xs font-mono text-gray-400 capitalize">{element.fill}</span>
                    </div>
                </section>

                <section>
                    <div className="flex items-center gap-2 mb-3 text-gray-500">
                        <Move size={14} />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Layout</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-[#111] p-2 rounded border border-[#222]">
                            <div className="text-[9px] text-gray-600 mb-1">OPACITY</div>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="1"
                                value={element.opacity}
                                className="bg-transparent text-xs w-full outline-none"
                                onChange={(e) => onUpdate(element.id, { opacity: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
