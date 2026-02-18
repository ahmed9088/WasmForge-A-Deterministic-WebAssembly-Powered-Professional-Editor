import { EngineState, Element, Shape, Presence, Transform } from '../bridge/KineticTypes';
import { SnapGuide } from '../utils/SnapUtils';

export interface DragInfo {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    mode: string;
}

export class CanvasRenderer {
    private ctx: CanvasRenderingContext2D;
    private imageCache: Map<string, HTMLImageElement> = new Map();
    private dpr: number = 1;
    private frameCount: number = 0;

    constructor(private canvas: HTMLCanvasElement) {
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get 2D context');
        this.ctx = context;
        this.dpr = window.devicePixelRatio || 1;
    }

    public render(
        state: EngineState,
        guides: SnapGuide[] = [],
        marquee: any = null,
        hoveredId: string | null = null,
        dragInfo: DragInfo | null = null
    ) {
        this.frameCount++;
        // HiDPI scaling
        const dpr = window.devicePixelRatio || 1;
        this.dpr = dpr;
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
        }

        this.ctx.save();
        this.ctx.scale(dpr, dpr);
        this.clear(rect.width, rect.height);

        const { transform } = state;
        this.ctx.translate(transform.x, transform.y);
        this.ctx.scale(transform.scale, transform.scale);

        this.drawGrid(transform);
        this.drawOriginCrosshair(transform);

        // Sort by zIndex for correct layering
        const sortedElements = Object.values(state.elements)
            .filter(el => !el.parentId && el.visible)
            .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

        sortedElements.forEach(el => {
            const isSelected = state.selection.includes(el.id);
            const isHovered = el.id === hoveredId && !isSelected;
            this.drawElement(el, isSelected, isHovered, state.elements);
        });

        this.ctx.restore();

        // Screen-space overlays
        this.ctx.save();
        this.ctx.scale(dpr, dpr);
        this.drawPresence(state.presence, transform);
        this.drawGuides(guides, transform, rect.width, rect.height);
        this.drawMarquee(marquee, transform);
        this.drawDragInfo(dragInfo, transform);
        this.drawTimelineOverlay(state, rect.width);
        this.ctx.restore();
    }

    private clear(width: number, height: number) {
        this.ctx.clearRect(0, 0, width, height);
    }

    // ─── Grid with sub-divisions at high zoom ─────────────────────
    private drawGrid(transform: Transform) {
        const logicalW = this.canvas.width / this.dpr;
        const logicalH = this.canvas.height / this.dpr;
        const startX = -transform.x / transform.scale;
        const startY = -transform.y / transform.scale;
        const width = logicalW / transform.scale;
        const height = logicalH / transform.scale;

        // Base grid
        const step = 50;
        this.ctx.lineWidth = 1 / transform.scale;

        for (let x = Math.floor(startX / step) * step; x < startX + width; x += step) {
            this.ctx.strokeStyle = Math.abs(x) < 1 ? '#333' : '#111';
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, startY + height);
            this.ctx.stroke();
        }
        for (let y = Math.floor(startY / step) * step; y < startY + height; y += step) {
            this.ctx.strokeStyle = Math.abs(y) < 1 ? '#333' : '#111';
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(startX + width, y);
            this.ctx.stroke();
        }

        // Sub-grid at zoom >= 2x
        if (transform.scale >= 2) {
            const subStep = 10;
            this.ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            this.ctx.lineWidth = 0.5 / transform.scale;
            for (let x = Math.floor(startX / subStep) * subStep; x < startX + width; x += subStep) {
                if (x % step === 0) continue;
                this.ctx.beginPath();
                this.ctx.moveTo(x, startY);
                this.ctx.lineTo(x, startY + height);
                this.ctx.stroke();
            }
            for (let y = Math.floor(startY / subStep) * subStep; y < startY + height; y += subStep) {
                if (y % step === 0) continue;
                this.ctx.beginPath();
                this.ctx.moveTo(startX, y);
                this.ctx.lineTo(startX + width, y);
                this.ctx.stroke();
            }
        }
    }

    // ─── Crosshair at world origin ────────────────────────────────
    private drawOriginCrosshair(transform: Transform) {
        const logicalW = this.canvas.width / this.dpr;
        const logicalH = this.canvas.height / this.dpr;
        const startX = -transform.x / transform.scale;
        const startY = -transform.y / transform.scale;
        const width = logicalW / transform.scale;
        const height = logicalH / transform.scale;

        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(59,130,246,0.3)';
        this.ctx.lineWidth = 1.5 / transform.scale;

        // Vertical axis
        this.ctx.beginPath();
        this.ctx.moveTo(0, startY);
        this.ctx.lineTo(0, startY + height);
        this.ctx.stroke();

        // Horizontal axis
        this.ctx.beginPath();
        this.ctx.moveTo(startX, 0);
        this.ctx.lineTo(startX + width, 0);
        this.ctx.stroke();

        // Origin dot
        const dotR = 4 / transform.scale;
        this.ctx.fillStyle = 'rgba(59,130,246,0.6)';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, dotR, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    // ─── Element rendering with hover support ─────────────────────
    private drawElement(el: Element, isSelected: boolean, isHovered: boolean, elements: Record<string, Element>) {
        const { shape, fill, stroke, strokeWidth, cornerRadius, shadow, opacity } = el;

        this.ctx.save();
        this.ctx.globalAlpha = opacity;

        // Shadow
        if (shadow && shadow.color !== 'transparent' && shadow.blur > 0) {
            this.ctx.shadowColor = shadow.color;
            this.ctx.shadowBlur = shadow.blur;
            this.ctx.shadowOffsetX = shadow.x;
            this.ctx.shadowOffsetY = shadow.y;
        }

        this.ctx.fillStyle = fill;
        this.ctx.strokeStyle = stroke;
        this.ctx.lineWidth = strokeWidth;

        if ('Rect' in shape) {
            const { origin, width, height } = (shape as any).Rect;
            this.ctx.beginPath();
            this.ctx.roundRect(origin.x, origin.y, width, height, cornerRadius);
            this.ctx.fill();
            if (strokeWidth > 0 && stroke !== 'transparent') this.ctx.stroke();
            if (isHovered) this.drawHoverHighlight(origin.x, origin.y, width, height);
            if (isSelected) this.drawSelectionOutline(origin.x, origin.y, width, height);
        } else if ('Circle' in shape) {
            const { center, radius } = (shape as any).Circle;
            this.ctx.beginPath();
            this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
            if (strokeWidth > 0 && stroke !== 'transparent') this.ctx.stroke();
            if (isHovered) this.drawHoverHighlight(center.x - radius, center.y - radius, radius * 2, radius * 2);
            if (isSelected) this.drawSelectionOutline(center.x - radius, center.y - radius, radius * 2, radius * 2);
        } else if ('Image' in shape) {
            const { src, width, height, origin } = (shape as any).Image;
            let img = this.imageCache.get(src);
            if (!img) {
                img = new Image();
                img.src = src;
                img.onload = () => { if (img) this.imageCache.set(src, img); };
            }
            if (img && img.complete) {
                this.ctx.drawImage(img, origin.x, origin.y, width, height);
            } else {
                this.ctx.strokeStyle = '#222';
                this.ctx.strokeRect(origin.x, origin.y, width, height);
                this.ctx.fillStyle = '#111';
                this.ctx.fillRect(origin.x, origin.y, width, height);
            }
            if (isHovered) this.drawHoverHighlight(origin.x, origin.y, width, height);
            if (isSelected) this.drawSelectionOutline(origin.x, origin.y, width, height);
        } else if ('Group' in shape) {
            const children = (shape as any).Group.children;
            children.forEach((childId: string) => {
                const child = elements[childId];
                if (child && child.visible) {
                    this.drawElement(child, isSelected, isHovered, elements);
                }
            });
        }

        this.ctx.restore();
    }

    // ─── Hover highlight: subtle glow ─────────────────────────────
    private drawHoverHighlight(x: number, y: number, w: number, h: number) {
        this.ctx.save();
        this.ctx.shadowBlur = 0;
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        const scale = this.ctx.getTransform().a;
        const pad = 3 / scale;

        // Glow effect
        this.ctx.strokeStyle = 'rgba(59,130,246,0.4)';
        this.ctx.lineWidth = 1.5 / scale;
        this.ctx.setLineDash([6 / scale, 3 / scale]);
        this.ctx.strokeRect(x - pad, y - pad, w + pad * 2, h + pad * 2);
        this.ctx.setLineDash([]);

        this.ctx.restore();
    }

    // ─── Selection outline: animated dash + round handles ─────────
    private drawSelectionOutline(x: number, y: number, w: number, h: number) {
        this.ctx.save();
        this.ctx.shadowBlur = 0;
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        const scale = this.ctx.getTransform().a;
        const pad = 2 / scale;

        // Animated marching ants
        const dashOffset = (this.frameCount * 0.5) % 16;
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 1.5 / scale;
        this.ctx.setLineDash([6 / scale, 3 / scale]);
        this.ctx.lineDashOffset = -dashOffset / scale;
        this.ctx.strokeRect(x - pad, y - pad, w + pad * 2, h + pad * 2);
        this.ctx.setLineDash([]);

        // Round handles
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 1.5 / scale;
        const hs = 4 / scale;

        const handlePositions = [
            { x, y }, { x: x + w / 2, y }, { x: x + w, y },
            { x: x + w, y: y + h / 2 }, { x: x + w, y: y + h },
            { x: x + w / 2, y: y + h }, { x, y: y + h }, { x, y: y + h / 2 }
        ];

        handlePositions.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, hs, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        });

        this.ctx.restore();
    }

    // ─── Presence cursors ─────────────────────────────────────────
    private drawPresence(presence: Record<string, Presence>, transform: Transform) {
        Object.values(presence).forEach(p => {
            const screenX = p.cursor.x * transform.scale + transform.x;
            const screenY = p.cursor.y * transform.scale + transform.y;

            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, screenY);
            this.ctx.lineTo(screenX + 15, screenY + 5);
            this.ctx.lineTo(screenX + 5, screenY + 15);
            this.ctx.closePath();
            this.ctx.fill();

            // Label with rounded bg
            this.ctx.save();
            this.ctx.font = '600 10px Inter, sans-serif';
            const tw = this.ctx.measureText(p.userId).width;
            const labelX = screenX + 18;
            const labelY = screenY + 4;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.roundRect(labelX - 2, labelY - 9, tw + 8, 14, 3);
            this.ctx.fill();
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(p.userId, labelX + 2, labelY + 2);
            this.ctx.restore();
        });
    }

    // ─── Snap guides with distance labels ─────────────────────────
    private drawGuides(guides: SnapGuide[], transform: Transform, logicalW: number, logicalH: number) {
        if (guides.length === 0) return;
        this.ctx.save();
        this.ctx.strokeStyle = '#f43f5e';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]);

        guides.forEach(guide => {
            this.ctx.beginPath();
            if (guide.type === 'x') {
                const screenX = guide.value * transform.scale + transform.x;
                this.ctx.moveTo(screenX, 0);
                this.ctx.lineTo(screenX, logicalH);
            } else {
                const screenY = guide.value * transform.scale + transform.y;
                this.ctx.moveTo(0, screenY);
                this.ctx.lineTo(logicalW, screenY);
            }
            this.ctx.stroke();

            // Distance label
            this.ctx.save();
            this.ctx.setLineDash([]);
            this.ctx.font = '600 9px Inter, sans-serif';
            this.ctx.fillStyle = '#f43f5e';
            const label = `${Math.round(guide.value)}`;
            if (guide.type === 'x') {
                const screenX = guide.value * transform.scale + transform.x;
                this.ctx.fillText(label, screenX + 4, 14);
            } else {
                const screenY = guide.value * transform.scale + transform.y;
                this.ctx.fillText(label, 4, screenY - 4);
            }
            this.ctx.restore();
        });

        this.ctx.restore();
    }

    // ─── Marquee selection ────────────────────────────────────────
    private drawMarquee(marquee: any, transform: Transform) {
        if (!marquee) return;
        this.ctx.save();

        const x = marquee.start.x * transform.scale + transform.x;
        const y = marquee.start.y * transform.scale + transform.y;
        const w = (marquee.end.x - marquee.start.x) * transform.scale;
        const h = (marquee.end.y - marquee.start.y) * transform.scale;

        // Animated fill
        this.ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
        this.ctx.fillRect(x, y, w, h);

        // Animated dashed border
        const dashOffset = (this.frameCount * 0.5) % 16;
        this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 4]);
        this.ctx.lineDashOffset = -dashOffset;
        this.ctx.strokeRect(x, y, w, h);

        this.ctx.restore();
    }

    // ─── Live drag info overlay (size/position) ───────────────────
    private drawDragInfo(dragInfo: DragInfo | null, transform: Transform) {
        if (!dragInfo) return;
        this.ctx.save();

        const screenX = dragInfo.x * transform.scale + transform.x;
        const screenY = dragInfo.y * transform.scale + transform.y;
        const screenW = dragInfo.w * transform.scale;

        // Position label above, size label below
        const font = '600 10px Inter, sans-serif';
        this.ctx.font = font;

        if (dragInfo.mode === 'move') {
            // Position overlay
            const posLabel = `X: ${Math.round(dragInfo.x)}  Y: ${Math.round(dragInfo.y)}`;
            const tw = this.ctx.measureText(posLabel).width;
            const lx = screenX + screenW / 2 - tw / 2 - 6;
            const ly = screenY - 28;

            this.ctx.fillStyle = 'rgba(0,0,0,0.85)';
            this.ctx.beginPath();
            this.ctx.roundRect(lx, ly, tw + 12, 20, 4);
            this.ctx.fill();
            this.ctx.fillStyle = '#93c5fd';
            this.ctx.fillText(posLabel, lx + 6, ly + 14);
        } else {
            // Size overlay
            const sizeLabel = `${Math.round(dragInfo.w)} × ${Math.round(dragInfo.h)}`;
            const tw = this.ctx.measureText(sizeLabel).width;
            const screenH = dragInfo.h * transform.scale;
            const lx = screenX + screenW / 2 - tw / 2 - 6;
            const ly = screenY + screenH + 10;

            this.ctx.fillStyle = 'rgba(0,0,0,0.85)';
            this.ctx.beginPath();
            this.ctx.roundRect(lx, ly, tw + 12, 20, 4);
            this.ctx.fill();
            this.ctx.fillStyle = '#86efac';
            this.ctx.fillText(sizeLabel, lx + 6, ly + 14);
        }

        this.ctx.restore();
    }

    // ─── Timeline playback indicator ──────────────────────────────
    private drawTimelineOverlay(state: EngineState, logicalW: number) {
        if (state.isPlaying) {
            this.ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
            this.ctx.fillRect(0, 0, logicalW, 3);

            // Animated progress bar
            const progress = state.duration > 0 ? state.currentTime / state.duration : 0;
            this.ctx.fillStyle = '#3b82f6';
            this.ctx.fillRect(0, 0, logicalW * progress, 3);
        }
    }
}
