/**
 * Asynchronously initializes the WASM module.
 * In a production build, the path to the WASM file is usually handled by the bundler.
 * This module uses dynamic import to avoid compile-time errors when the WASM pkg is not built.
 */
export async function loadWasmEngine(wasmUrl?: string): Promise<any> {
    try {
        // Dynamic import so TypeScript doesn't error if the pkg directory doesn't exist yet
        const wasmModule = await import(/* @vite-ignore */ '../pkg/kinetic_engine');
        await wasmModule.default(wasmUrl);
        console.log('[KineticEngine] WASM Module Loaded Successfully');
        return wasmModule.KineticEngine;
    } catch (error) {
        console.error('[KineticEngine] Failed to load WASM module:', error);
        console.warn('[KineticEngine] Falling back to MockKineticEngine');
        // Return null so callers can fall back to MockKineticEngine
        return null;
    }
}
