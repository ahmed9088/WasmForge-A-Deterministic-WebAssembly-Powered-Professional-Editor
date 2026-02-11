import { EngineState, Element, Shape, Presence, Transform } from '../bridge/KineticTypes';
import { SnapGuide } from '../utils/SnapUtils';

export class CanvasRenderer {
    private ctx: CanvasRenderingContext2D;
    private imageCache: Map<string, HTMLImageElement> = new Map();

    constructor(private canvas: HTMLCanvasElement) {
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get 2D context');
        this.ctx = context;
    }

    public render(state: EngineState, guides: SnapGuide[] = []) {
        this.ctx.save();
        this.clear();

        const { transform } = state;
        this.ctx.translate(transform.x, transform.y);
        this.ctx.scale(transform.scale, transform.scale);

        this.drawGrid(transform);

        Object.values(state.elements).forEach(el => {
            if (!el.parentId && el.visible) {
                this.drawElement(el, state.selection.includes(el.id), state.elements);
            }
        });

        this.ctx.restore();

        // Draw Presence (Screen Space Pointers)
        this.drawPresence(state.presence, transform);
        this.drawGuides(guides, transform);
        this.drawTimelineOverlay(state);
    }

    private clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    private drawGrid(transform: Transform) {
        const step = 50;
        const startX = -transform.x / transform.scale;
        const startY = -transform.y / transform.scale;
        const width = this.canvas.width / transform.scale;
        const height = this.canvas.height / transform.scale;

        this.ctx.strokeStyle = '#111';
        this.ctx.lineWidth = 1 / transform.scale;

        for (let x = Math.floor(startX / step) * step; x < startX + width; x += step) {
            if (Math.abs(x) < 1) this.ctx.strokeStyle = '#333'; else this.ctx.strokeStyle = '#111';
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, startY + height);
            this.ctx.stroke();
        }

        for (let y = Math.floor(startY / step) * step; y < startY + height; y += step) {
            if (Math.abs(y) < 1) this.ctx.strokeStyle = '#333'; else this.ctx.strokeStyle = '#111';
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(startX + width, y);
            this.ctx.stroke();
        }
    }

    private drawElement(el: Element, isSelected: boolean, elements: Record<string, Element>) {
        const { shape, fill, opacity } = el;
        this.ctx.globalAlpha = opacity;
        this.ctx.fillStyle = fill;
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 2 / this.ctx.getTransform().a;

        if ('Rect' in shape) {
            const { origin, width, height } = (shape as any).Rect;
            this.ctx.beginPath();
            this.ctx.roundRect(origin.x, origin.y, width, height, 4); // Added support for rounded rects
            this.ctx.fill();
            if (isSelected) this.ctx.stroke();
        } else if ('Circle' in shape) {
            const { center, radius } = (shape as any).Circle;
            this.ctx.beginPath();
            this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
            if (isSelected) this.ctx.stroke();
        } else if ('Image' in shape) {
            const { src, width, height } = (shape as any).Image;
            const { origin } = (shape as any).Image; // reuse rect origin logic if needed or center
            const drawX = (shape as any).Rect?.origin.x || 0; // fallback to origin
            const drawY = (shape as any).Rect?.origin.y || 0;

            let img = this.imageCache.get(src);
            if (!img) {
                img = new Image();
                img.src = src;
                img.onload = () => { if (img) this.imageCache.set(src, img); };
            }

            if (img && img.complete) {
                this.ctx.drawImage(img, drawX, drawY, width, height);
            } else {
                // Placeholder bridge
                this.ctx.strokeStyle = '#222';
                this.ctx.strokeRect(drawX, drawY, width, height);
                this.ctx.fillStyle = '#111';
                this.ctx.fillRect(drawX, drawY, width, height);
            }
            if (isSelected) this.ctx.stroke();
        } else if ('Group' in shape) {
            const children = (shape as any).Group.children;
            children.forEach((childId: string) => {
                const child = elements[childId];
                if (child && child.visible) {
                    this.drawElement(child, isSelected, elements);
                }
            });
        }

        this.ctx.globalAlpha = 1.0;
    }

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

            this.ctx.font = '10px Inter';
            this.ctx.fillText(p.userId, screenX + 18, screenY + 10);
        });
    }

    private drawGuides(guides: SnapGuide[], transform: Transform) {
        this.ctx.save();
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);

        guides.forEach(guide => {
            this.ctx.beginPath();
            if (guide.type === 'x') {
                const screenX = guide.value * transform.scale + transform.x;
                this.ctx.moveTo(screenX, 0);
                this.ctx.lineTo(screenX, this.canvas.height);
            } else {
                const screenY = guide.value * transform.scale + transform.y;
                this.ctx.moveTo(0, screenY);
                this.ctx.lineTo(this.canvas.width, screenY);
            }
            this.ctx.stroke();
        });
        this.ctx.restore();
    }

    private drawTimelineOverlay(state: EngineState) {
        if (state.isPlaying) {
            this.ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
            this.ctx.fillRect(0, 0, this.canvas.width, 2);
        }
    }
}
