import { KineticBridge } from './KineticBridge';
import { KineticRenderer } from './KineticRenderer';

/**
 * Orchestrates the synchronization between the WASM engine and the Canvas renderer.
 * Manages the high-frequency requestAnimationFrame loop.
 */
export class KineticRenderLoop {
    private active = false;
    private rafId: number | null = null;
    private lastFrameTime = 0;

    // Performance metrics
    public frameCount = 0;
    public averageFrameTime = 0;

    constructor(
        private bridge: KineticBridge,
        private renderer: KineticRenderer
    ) { }

    /**
     * Starts the high-performance render loop.
     */
    public start() {
        if (this.active) return;
        this.active = true;
        this.rafId = requestAnimationFrame(this.tick);
        console.log('[KineticLoop] Started');
    }

    /**
     * Stops the render loop and cancels the next frame.
     */
    public stop() {
        this.active = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        console.log('[KineticLoop] Stopped');
    }

    /**
     * Internal tick function executed at the display's refresh rate.
     */
    private tick = (timestamp: number) => {
        if (!this.active) return;

        const start = performance.now();

        // 1. Fetch deterministic state from WASM
        // Note: getState() is O(1) in the bridge after it's been updated by dispatch
        const state = this.bridge.getState();

        // 2. Execute render pass
        this.renderer.render(state);

        // 3. Update metrics
        const end = performance.now();
        this.updatePerformanceMetrics(end - start);

        this.rafId = requestAnimationFrame(this.tick);
    };

    private updatePerformanceMetrics(duration: number) {
        this.frameCount++;
        this.averageFrameTime = (this.averageFrameTime * 0.9) + (duration * 0.1);

        // Warn if skipping frames (Threshold: 10ms for 60FPS overhead)
        if (duration > 10) {
            console.warn(`[KineticLoop] Frame Budget Exceeded: ${duration.toFixed(2)}ms`);
        }
    }
}
