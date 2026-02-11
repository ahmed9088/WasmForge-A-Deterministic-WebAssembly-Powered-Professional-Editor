import init, { KineticEngine } from '../pkg/kinetic_engine';

/**
 * Asynchronously initializes the WASM module.
 * In a production build, the path to the WASM file is usually handled by the bundler.
 */
export async function loadWasmEngine(wasmUrl?: string): Promise<typeof KineticEngine> {
    try {
        await init(wasmUrl);
        console.log('[KineticEngine] WASM Module Loaded Successfully');
        return KineticEngine;
    } catch (error) {
        console.error('[KineticEngine] Failed to load WASM module:', error);
        throw error;
    }
}
