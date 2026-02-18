import React from 'react';
import { Element } from '../bridge/KineticTypes';
import { Settings2, Move, Palette, Type, Box, Droplets, Monitor, Lock } from 'lucide-react';

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

    const isLocked = element.locked;

    return (
        <div className="w-64 cyber-glass border-l flex flex-col overflow-y-auto custom-scrollbar">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Settings2 size={16} className="text-blue-500" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Properties</h3>
                </div>
                {isLocked && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 rounded text-yellow-500">
                        <Lock size={10} />
                        <span className="text-[9px] font-bold">LOCKED</span>
                    </div>
                )}
            </div>

            <div className="p-6 flex flex-col gap-6">
                {/* Identity */}
                <section>
                    <div className="flex items-center gap-2 mb-3 text-gray-500">
                        <Type size={14} />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Identity</span>
                    </div>
                    <input
                        type="text"
                        value={element.name}
                        className="w-full bg-[#111] border border-[#222] rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500 transition-colors"
                        onChange={(e) => onUpdate(element.id, { name: e.target.value })}
                    />
                </section>

                {/* Appearance */}
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
                        <span className="text-xs font-mono text-gray-400 uppercase">{element.fill}</span>
                    </div>
                </section>

                {/* Geometry — Rect */}
                <section>
                    <div className="flex items-center gap-2 mb-3 text-gray-500">
                        <Box size={14} />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Geometry</span>
                    </div>

                    {'Rect' in element.shape && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[9px] text-gray-600 uppercase">X</label>
                                <input type="number" value={Math.round((element.shape as any).Rect.origin.x)}
                                    className="prop-input"
                                    onChange={(e) => onUpdate(element.id, { shape: { Rect: { ...(element.shape as any).Rect, origin: { ...(element.shape as any).Rect.origin, x: parseFloat(e.target.value) || 0 } } } })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] text-gray-600 uppercase">Y</label>
                                <input type="number" value={Math.round((element.shape as any).Rect.origin.y)}
                                    className="prop-input"
                                    onChange={(e) => onUpdate(element.id, { shape: { Rect: { ...(element.shape as any).Rect, origin: { ...(element.shape as any).Rect.origin, y: parseFloat(e.target.value) || 0 } } } })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] text-gray-600 uppercase">Width</label>
                                <input type="number" value={Math.round((element.shape as any).Rect.width)}
                                    className="prop-input"
                                    onChange={(e) => onUpdate(element.id, { shape: { Rect: { ...(element.shape as any).Rect, width: parseFloat(e.target.value) || 10 } } })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] text-gray-600 uppercase">Height</label>
                                <input type="number" value={Math.round((element.shape as any).Rect.height)}
                                    className="prop-input"
                                    onChange={(e) => onUpdate(element.id, { shape: { Rect: { ...(element.shape as any).Rect, height: parseFloat(e.target.value) || 10 } } })} />
                            </div>
                        </div>
                    )}

                    {'Circle' in element.shape && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[9px] text-gray-600 uppercase">Center X</label>
                                <input type="number" value={Math.round((element.shape as any).Circle.center.x)}
                                    className="prop-input"
                                    onChange={(e) => onUpdate(element.id, { shape: { Circle: { ...(element.shape as any).Circle, center: { ...(element.shape as any).Circle.center, x: parseFloat(e.target.value) || 0 } } } })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] text-gray-600 uppercase">Center Y</label>
                                <input type="number" value={Math.round((element.shape as any).Circle.center.y)}
                                    className="prop-input"
                                    onChange={(e) => onUpdate(element.id, { shape: { Circle: { ...(element.shape as any).Circle, center: { ...(element.shape as any).Circle.center, y: parseFloat(e.target.value) || 0 } } } })} />
                            </div>
                            <div className="space-y-1 col-span-2">
                                <label className="text-[9px] text-gray-600 uppercase">Radius</label>
                                <input type="number" value={Math.round((element.shape as any).Circle.radius)}
                                    className="prop-input"
                                    onChange={(e) => onUpdate(element.id, { shape: { Circle: { ...(element.shape as any).Circle, radius: parseFloat(e.target.value) || 5 } } })} />
                            </div>
                        </div>
                    )}

                    {'Image' in element.shape && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[9px] text-gray-600 uppercase">X</label>
                                <input type="number" value={Math.round((element.shape as any).Image.origin.x)}
                                    className="prop-input"
                                    onChange={(e) => onUpdate(element.id, { shape: { Image: { ...(element.shape as any).Image, origin: { ...(element.shape as any).Image.origin, x: parseFloat(e.target.value) || 0 } } } })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] text-gray-600 uppercase">Y</label>
                                <input type="number" value={Math.round((element.shape as any).Image.origin.y)}
                                    className="prop-input"
                                    onChange={(e) => onUpdate(element.id, { shape: { Image: { ...(element.shape as any).Image, origin: { ...(element.shape as any).Image.origin, y: parseFloat(e.target.value) || 0 } } } })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] text-gray-600 uppercase">Width</label>
                                <input type="number" value={Math.round((element.shape as any).Image.width)}
                                    className="prop-input"
                                    onChange={(e) => onUpdate(element.id, { shape: { Image: { ...(element.shape as any).Image, width: parseFloat(e.target.value) || 10 } } })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] text-gray-600 uppercase">Height</label>
                                <input type="number" value={Math.round((element.shape as any).Image.height)}
                                    className="prop-input"
                                    onChange={(e) => onUpdate(element.id, { shape: { Image: { ...(element.shape as any).Image, height: parseFloat(e.target.value) || 10 } } })} />
                            </div>
                        </div>
                    )}
                </section>

                {/* Styling */}
                <section>
                    <div className="flex items-center gap-2 mb-3 text-gray-500">
                        <Droplets size={14} />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Styling</span>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] text-gray-600 uppercase">Corner Radius</label>
                            <div className="flex items-center gap-2">
                                <input type="range" min="0" max="100"
                                    value={element.cornerRadius || 0}
                                    onChange={(e) => onUpdate(element.id, { cornerRadius: parseInt(e.target.value) })}
                                    className="w-20 accent-blue-500" />
                                <span className="text-[10px] text-gray-500 font-mono w-6 text-right">{element.cornerRadius || 0}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] text-gray-600 uppercase">Stroke Weight</label>
                            <input type="number" min="0" max="20"
                                value={element.strokeWidth || 0}
                                onChange={(e) => onUpdate(element.id, { strokeWidth: parseInt(e.target.value) })}
                                className="w-16 bg-[#111] border border-[#222] rounded px-2 py-0.5 text-xs outline-none focus:border-blue-500" />
                        </div>
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] text-gray-600 uppercase">Stroke Color</label>
                            <input type="color"
                                value={element.stroke || '#000000'}
                                onChange={(e) => onUpdate(element.id, { stroke: e.target.value })}
                                className="w-6 h-6 rounded-full bg-transparent border-none cursor-pointer" />
                        </div>
                    </div>
                </section>

                {/* Shadow */}
                <section>
                    <div className="flex items-center gap-2 mb-3 text-gray-500">
                        <Monitor size={14} />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Shadow</span>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] text-gray-600 uppercase">Blur</label>
                            <input type="number"
                                value={element.shadow?.blur || 0}
                                onChange={(e) => onUpdate(element.id, { shadow: { ...(element.shadow as any), blur: parseInt(e.target.value) } })}
                                className="w-16 bg-[#111] border border-[#222] rounded px-2 py-0.5 text-xs outline-none focus:border-blue-500" />
                        </div>
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] text-gray-600 uppercase">Offset X</label>
                            <input type="number"
                                value={element.shadow?.x || 0}
                                onChange={(e) => onUpdate(element.id, { shadow: { ...(element.shadow as any), x: parseInt(e.target.value) } })}
                                className="w-16 bg-[#111] border border-[#222] rounded px-2 py-0.5 text-xs outline-none focus:border-blue-500" />
                        </div>
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] text-gray-600 uppercase">Offset Y</label>
                            <input type="number"
                                value={element.shadow?.y || 0}
                                onChange={(e) => onUpdate(element.id, { shadow: { ...(element.shadow as any), y: parseInt(e.target.value) } })}
                                className="w-16 bg-[#111] border border-[#222] rounded px-2 py-0.5 text-xs outline-none focus:border-blue-500" />
                        </div>
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] text-gray-600 uppercase">Shadow Color</label>
                            <input type="color"
                                value={element.shadow?.color || '#000000'}
                                onChange={(e) => onUpdate(element.id, { shadow: { ...(element.shadow as any), color: e.target.value } })}
                                className="w-6 h-6 rounded-full bg-transparent border-none cursor-pointer" />
                        </div>
                    </div>
                </section>

                {/* Opacity */}
                <section>
                    <div className="flex items-center gap-2 mb-3 text-gray-500">
                        <Move size={14} />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Layout</span>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] text-gray-600 uppercase">Opacity</label>
                            <div className="flex items-center gap-2">
                                <input type="range" min="0" max="100"
                                    value={Math.round(element.opacity * 100)}
                                    onChange={(e) => onUpdate(element.id, { opacity: parseInt(e.target.value) / 100 })}
                                    className="w-20 accent-blue-500" />
                                <span className="text-[10px] text-gray-500 font-mono w-8 text-right">{Math.round(element.opacity * 100)}%</span>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
