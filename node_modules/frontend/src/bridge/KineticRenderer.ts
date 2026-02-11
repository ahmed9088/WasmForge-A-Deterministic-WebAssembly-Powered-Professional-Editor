import { EngineState, Rect } from './KineticTypes';

interface RenderOptions {
    selectionId: string | null;
    theme: {
        primary: string;
        secondary: string;
        accent: string;
    };
}

/**
 * High-performance 2D Canvas Renderer for Kinetic Studio.
 * Optimized for frequent redraws driven by WASM state updates.
 */
export class KineticRenderer {
    private ctx: CanvasRenderingContext2D;
    private options: RenderOptions = {
        selectionId: null,
        theme: {
            primary: '#2D3436',
            secondary: '#636E72',
            accent: '#0984E3',
        },
    };

    constructor(private canvas: HTMLCanvasElement) {
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Could not get 2D context');
        this.ctx = context;
    }

    /**
     * Sets the selection focus for highlighting.
     */
    public setSelection(id: string | null) {
        this.options.selectionId = id;
    }

    /**
     * Main render cycle. Clears and redraws the entire state.
     * Optimized by isolating transform calculations from drawing.
     */
    public render(state: EngineState) {
        const { width, height } = this.canvas;
        const { ctx } = this;

        // 1. Clear with base color (alpha: false optimization)
        ctx.fillStyle = this.options.theme.primary;
        ctx.fillRect(0, 0, width, height);

        // 2. Render all elements
        for (const [id, rect] of Object.entries(state.elements)) {
            this.drawElement(id, rect);
        }

        // 3. Render selection overlay if applicable
        if (this.options.selectionId && state.elements[this.options.selectionId]) {
            this.drawSelection(state.elements[this.options.selectionId]);
        }
    }

    /**
     * Internal draw function for a single geometric primitive.
     */
    private drawElement(id: string, rect: Rect) {
        const { ctx } = this;
        const isSelected = id === this.options.selectionId;

        ctx.save();
        ctx.fillStyle = isSelected ? this.options.theme.accent : this.options.theme.secondary;

        // Direct drawing from WASM-normalized coordinates
        ctx.fillRect(
            rect.origin.x,
            rect.origin.y,
            rect.width,
            rect.height
        );

        ctx.restore();
    }

    /**
     * Draws a professional selection highlight/outline.
     */
    private drawSelection(rect: Rect) {
        const { ctx } = this;
        const padding = 2;

        ctx.save();
        ctx.strokeStyle = this.options.theme.accent;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]); // Cinematic dashed stroke

        ctx.strokeRect(
            rect.origin.x - padding,
            rect.origin.y - padding,
            rect.width + padding * 2,
            rect.height + padding * 2
        );

        ctx.restore();
    }

    /**
     * Adjusts canvas resolution for High DPI displays (Retina).
     */
    public resize(width: number, height: number, dpr: number = window.devicePixelRatio) {
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.ctx.scale(dpr, dpr);
    }
}
