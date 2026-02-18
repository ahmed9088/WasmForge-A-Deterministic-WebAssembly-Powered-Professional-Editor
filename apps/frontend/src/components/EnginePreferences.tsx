import React, { useState, useEffect } from 'react';
import { Settings2, X, Magnet, Grid3X3, Zap } from 'lucide-react';
import { SnapOptions } from '../utils/SnapUtils';

interface EngineConfig {
    snapping: SnapOptions;
    gridSize: number;
    showGrid: boolean;
    performanceMode: boolean;
}

const DEFAULT_CONFIG: EngineConfig = {
    snapping: {
        enabled: true,
        snapToEdges: true,
        snapToCenter: true,
        threshold: 10,
    },
    gridSize: 20,
    showGrid: true,
    performanceMode: false,
};

interface EnginePreferencesProps {
    onUpdate: (config: EngineConfig) => void;
    onClose: () => void;
}

const EnginePreferences: React.FC<EnginePreferencesProps> = ({ onUpdate, onClose }) => {
    const [config, setConfig] = useState<EngineConfig>(() => {
        const saved = localStorage.getItem('kinetic-engine-config');
        return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    });

    useEffect(() => {
        onUpdate(config);
        localStorage.setItem('kinetic-engine-config', JSON.stringify(config));
    }, [config, onUpdate]);

    return (
        <div className="absolute top-16 left-4 w-72 cyber-glass border border-white/10 rounded-xl p-4 z-50 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider">Engine Specs</h3>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/60 hover:text-white">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-6">
                {/* Snapping */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-white/50 uppercase font-medium">
                            <Magnet className="w-3 h-3" /> Magnetic Snapping
                        </div>
                        <input
                            type="checkbox"
                            checked={config.snapping.enabled}
                            onChange={(e) => setConfig({ ...config, snapping: { ...config.snapping, enabled: e.target.checked } })}
                            className="w-4 h-4 rounded border-white/10 bg-white/5 accent-purple-500"
                        />
                    </div>

                    {config.snapping.enabled && (
                        <div className="pl-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between text-[10px]">
                                <label className="text-white/40 uppercase">Snap to Edges</label>
                                <input
                                    type="checkbox"
                                    checked={config.snapping.snapToEdges}
                                    onChange={(e) => setConfig({ ...config, snapping: { ...config.snapping, snapToEdges: e.target.checked } })}
                                />
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                                <label className="text-white/40 uppercase">Snap to Center</label>
                                <input
                                    type="checkbox"
                                    checked={config.snapping.snapToCenter}
                                    onChange={(e) => setConfig({ ...config, snapping: { ...config.snapping, snapToCenter: e.target.checked } })}
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[10px]">
                                    <label className="text-white/40 uppercase">Pull Strength</label>
                                    <span className="text-purple-400">{config.snapping.threshold}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="2"
                                    max="30"
                                    value={config.snapping.threshold}
                                    onChange={(e) => setConfig({ ...config, snapping: { ...config.snapping, threshold: parseInt(e.target.value) } })}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                            </div>
                        </div>
                    )}
                </section>

                {/* Grid */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-white/50 uppercase font-medium">
                            <Grid3X3 className="w-3 h-3" /> Grid System
                        </div>
                        <input
                            type="checkbox"
                            checked={config.showGrid}
                            onChange={(e) => setConfig({ ...config, showGrid: e.target.checked })}
                            className="w-4 h-4 rounded border-white/10 bg-white/5 accent-purple-500"
                        />
                    </div>
                    {config.showGrid && (
                        <div className="pl-5 space-y-2">
                            <div className="flex justify-between items-center text-[10px]">
                                <label className="text-white/40 uppercase">Grid Size</label>
                                <span className="text-purple-400">{config.gridSize}px</span>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="100"
                                step="10"
                                value={config.gridSize}
                                onChange={(e) => setConfig({ ...config, gridSize: parseInt(e.target.value) })}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                        </div>
                    )}
                </section>

                {/* Performance */}
                <section className="space-y-3 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-white/50 uppercase font-medium">
                            <Zap className="w-3 h-3" /> Performance Mode
                        </div>
                        <input
                            type="checkbox"
                            checked={config.performanceMode}
                            onChange={(e) => setConfig({ ...config, performanceMode: e.target.checked })}
                            className="w-4 h-4 rounded border-white/10 bg-white/5 accent-yellow-500"
                        />
                    </div>
                    <p className="text-[9px] text-white/30 leading-relaxed">
                        Disables blurs and real-time shadows for 144Hz stability on complex projects.
                    </p>
                </section>
            </div>
        </div>
    );
};

export default EnginePreferences;
