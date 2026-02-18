export type PanelType = 'layers' | 'properties' | 'canvas';

export interface LayoutConfig {
    order: PanelType[];
    widths: Record<PanelType, number>;
}

const DEFAULT_LAYOUT: LayoutConfig = {
    order: ['layers', 'canvas', 'properties'],
    widths: {
        layers: 240,
        properties: 280,
        canvas: 0, // dynamic
    }
};

export class LayoutManager {
    private config: LayoutConfig;

    constructor() {
        const saved = localStorage.getItem('kinetic-layout');
        this.config = saved ? JSON.parse(saved) : DEFAULT_LAYOUT;
    }

    getConfig(): LayoutConfig {
        return { ...this.config };
    }

    updateOrder(newOrder: PanelType[]) {
        this.config.order = newOrder;
        this.save();
    }

    private save() {
        localStorage.setItem('kinetic-layout', JSON.stringify(this.config));
    }

    reset() {
        this.config = DEFAULT_LAYOUT;
        this.save();
    }
}

export const layoutManager = new LayoutManager();
