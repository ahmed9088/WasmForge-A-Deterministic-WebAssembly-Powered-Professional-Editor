import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Timer, Key } from 'lucide-react';
import { EngineState, Element } from '../bridge/KineticTypes';

interface TimelineProps {
    state: EngineState;
    onSeek: (time: number) => void;
    onTogglePlay: () => void;
    onAddKeyframe: (elId: string, prop: string) => void;
}

export const AnimationTimeline: React.FC<TimelineProps> = ({ state, onSeek, onTogglePlay, onAddKeyframe }) => {
    const { currentTime, duration, isPlaying, elements, selection } = state;
    const progress = (currentTime / duration) * 100;

    const selectedElement = selection[0] ? elements[selection[0]] : null;

    return (
        <div className="h-48 border-t cyber-glass flex flex-col overflow-hidden">
            {/* Controls Bar */}
            <div className="flex items-center justify-between px-6 py-2 border-b border-white/5 bg-white/5 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-blue-500 mr-2">
                        <Timer size={14} />
                        <span className="text-[10px] font-mono">{(currentTime / 1000).toFixed(2)}s / {(duration / 1000).toFixed(2)}s</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => onSeek(0)} className="p-1 hover:bg-[#222] rounded text-gray-500"><SkipBack size={14} /></button>
                        <button
                            onClick={onTogglePlay}
                            className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded text-white transition-all shadow-lg shadow-blue-900/20"
                        >
                            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                        </button>
                        <button onClick={() => onSeek(duration)} className="p-1 hover:bg-[#222] rounded text-gray-500"><SkipForward size={14} /></button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {selectedElement && (
                        <button
                            onClick={() => onAddKeyframe(selectedElement.id, 'x')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] rounded text-[10px] font-bold text-gray-400 hover:text-white transition-all"
                        >
                            <Key size={12} className="text-yellow-500" /> RECORD KEYFRAME
                        </button>
                    )}
                </div>
            </div>

            {/* Timeline Area */}
            <div className="flex-1 overflow-x-auto relative bg-[#050505] scrollbar-hide">
                {/* Playhead Marker */}
                <div
                    className="absolute top-0 bottom-0 w-[2px] bg-blue-500 z-30"
                    style={{ left: `${progress}%` }}
                >
                    <div className="absolute -top-1 -left-[5px] w-3 h-3 bg-blue-500 rounded-full border-2 border-[#050505]"></div>
                </div>

                {/* Channels */}
                <div className="min-w-full">
                    {selectedElement ? (
                        <div className="flex flex-col">
                            {['x', 'y', 'opacity', 'fill'].map(prop => (
                                <div key={prop} className="h-8 border-b border-[#111] flex relative hover:bg-[#0a0a0a] group">
                                    <div className="w-24 px-4 flex items-center bg-[#0d0d0d] border-r border-[#111] sticky left-0 z-20">
                                        <span className="text-[9px] text-gray-600 uppercase font-bold tracking-tighter group-hover:text-gray-400">{prop}</span>
                                    </div>
                                    <div className="flex-1 relative">
                                        {/* Grid lines */}
                                        {[0, 1, 2, 3, 4, 5].map(s => (
                                            <div key={s} className="absolute top-0 bottom-0 border-l border-[#111]" style={{ left: `${(s / 5) * 100}%` }}></div>
                                        ))}

                                        {/* Keyframes */}
                                        {selectedElement.animations[prop]?.map((kf, i) => (
                                            <div
                                                key={i}
                                                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-500 rotate-45 border border-[#000] cursor-pointer hover:scale-150 transition-transform shadow-lg shadow-yellow-900/50"
                                                style={{ left: `${(kf.time / duration) * 100}%` }}
                                            ></div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-700 italic text-xs py-12">
                            Select an element to view animation channels
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
