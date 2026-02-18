import React, { useState, useEffect } from 'react';
import { Palette, X, RefreshCcw, Sun, Moon } from 'lucide-react';

interface ThemeConfig {
    panelBlur: number;
    glassOpacity: number;
    accentColor: string;
    glowIntensity: number;
    borderRadius: number;
}

const DEFAULT_THEME: ThemeConfig = {
    panelBlur: 20,
    glassOpacity: 0.7,
    accentColor: '#3b82f6',
    glowIntensity: 10,
    borderRadius: 8,
};

interface ThemeCustomizerProps {
    onUpdate: (config: ThemeConfig) => void;
    onClose: () => void;
}

const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({ onUpdate, onClose }) => {
    const [config, setConfig] = useState<ThemeConfig>(() => {
        const saved = localStorage.getItem('kinetic-theme');
        return saved ? JSON.parse(saved) : DEFAULT_THEME;
    });

    useEffect(() => {
        onUpdate(config);
        localStorage.setItem('kinetic-theme', JSON.stringify(config));

        // Inject CSS variables
        const root = document.documentElement;
        root.style.setProperty('--panel-bg', `rgba(10, 10, 10, ${config.glassOpacity})`);
        root.style.setProperty('--accent-color', config.accentColor);
        root.style.setProperty('--glass-blur', `${config.panelBlur}px`);
        root.style.setProperty('--glow-strength', `${config.glowIntensity}px`);
        root.style.setProperty('--radius-sm', `${config.borderRadius}px`);
    }, [config, onUpdate]);

    const reset = () => setConfig(DEFAULT_THEME);

    return (
        <div className="absolute top-16 right-4 w-72 cyber-glass border border-white/10 rounded-xl p-4 z-50 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider">Aesthetics</h3>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={reset} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/60 hover:text-white" title="Reset to default">
                        <RefreshCcw className="w-4 h-4" />
                    </button>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/60 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                {/* Accent Color */}
                <div className="space-y-2">
                    <label className="text-xs text-white/50 uppercase font-medium">Accent Color</label>
                    <div className="flex flex-wrap gap-2">
                        {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                            <button
                                key={color}
                                onClick={() => setConfig({ ...config, accentColor: color })}
                                className={`w-6 h-6 rounded-full border-2 transition-transform active:scale-90 ${config.accentColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>

                {/* Sliders */}
                {[
                    { label: 'Glass Blur', key: 'panelBlur', min: 0, max: 40, unit: 'px' },
                    { label: 'Opacity', key: 'glassOpacity', min: 0.1, max: 0.9, step: 0.05, unit: '' },
                    { label: 'Glow Intensity', key: 'glowIntensity', min: 0, max: 30, unit: 'px' },
                    { label: 'Radius', key: 'borderRadius', min: 0, max: 24, unit: 'px' },
                ].map(ctrl => (
                    <div key={ctrl.key} className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <label className="text-white/50 uppercase font-medium">{ctrl.label}</label>
                            <span className="text-blue-400">{(config as any)[ctrl.key]}{ctrl.unit}</span>
                        </div>
                        <input
                            type="range"
                            min={ctrl.min}
                            max={ctrl.max}
                            step={ctrl.step || 1}
                            value={(config as any)[ctrl.key]}
                            onChange={(e) => setConfig({ ...config, [ctrl.key]: parseFloat(e.target.value) })}
                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ThemeCustomizer;
