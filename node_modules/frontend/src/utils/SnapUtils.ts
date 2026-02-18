export interface SnapGuide {
    type: 'x' | 'y';
    value: number;
}

export interface SnapOptions {
    enabled: boolean;
    snapToEdges: boolean;
    snapToCenter: boolean;
    threshold: number;
}

export const calculateSnaps = (
    movingId: string,
    newX: number,
    newY: number,
    elements: any[],
    options: SnapOptions = { enabled: true, snapToEdges: true, snapToCenter: true, threshold: 10 }
): { snappedX: number; snappedY: number; guides: SnapGuide[] } => {
    let snappedX = newX;
    let snappedY = newY;
    const guides: SnapGuide[] = [];

    if (!options.enabled) return { snappedX, snappedY, guides };

    const movingEl = elements.find(e => e.id === movingId);
    if (!movingEl) return { snappedX, snappedY, guides };

    // Get dimensions of moving element
    let mW = 0, mH = 0;
    if ('Rect' in movingEl.shape) {
        mW = movingEl.shape.Rect.width;
        mH = movingEl.shape.Rect.height;
    } else if ('Circle' in movingEl.shape) {
        mW = movingEl.shape.Circle.radius * 2;
        mH = movingEl.shape.Circle.radius * 2;
    } else if ('Image' in movingEl.shape) {
        mW = movingEl.shape.Image.width;
        mH = movingEl.shape.Image.height;
    }

    const sourceX = [newX, newX + mW / 2, newX + mW];
    const sourceY = [newY, newY + mH / 2, newY + mH];

    elements.forEach(el => {
        if (el.id === movingId || !el.visible) return;

        let tX = 0, tY = 0, tW = 0, tH = 0;
        if ('Rect' in el.shape) {
            tX = el.shape.Rect.origin.x;
            tY = el.shape.Rect.origin.y;
            tW = el.shape.Rect.width;
            tH = el.shape.Rect.height;
        } else if ('Circle' in el.shape) {
            tX = el.shape.Circle.center.x - el.shape.Circle.radius;
            tY = el.shape.Circle.center.y - el.shape.Circle.radius;
            tW = el.shape.Circle.radius * 2;
            tH = el.shape.Circle.radius * 2;
        } else if ('Image' in el.shape) {
            tX = el.shape.Image.origin.x;
            tY = el.shape.Image.origin.y;
            tW = el.shape.Image.width;
            tH = el.shape.Image.height;
        } else {
            return;
        }

        const targetsX: number[] = [];
        const targetsY: number[] = [];

        if (options.snapToEdges) {
            targetsX.push(tX, tX + tW);
            targetsY.push(tY, tY + tH);
        }
        if (options.snapToCenter) {
            targetsX.push(tX + tW / 2);
            targetsY.push(tY + tH / 2);
        }

        targetsX.forEach(tx => {
            sourceX.forEach((sx, i) => {
                if (Math.abs(sx - tx) < options.threshold) {
                    snappedX = tx - (i === 0 ? 0 : i === 1 ? mW / 2 : mW);
                    if (!guides.find(g => g.type === 'x' && g.value === tx)) {
                        guides.push({ type: 'x', value: tx });
                    }
                }
            });
        });

        targetsY.forEach(ty => {
            sourceY.forEach((sy, i) => {
                if (Math.abs(sy - ty) < options.threshold) {
                    snappedY = ty - (i === 0 ? 0 : i === 1 ? mH / 2 : mH);
                    if (!guides.find(g => g.type === 'y' && g.value === ty)) {
                        guides.push({ type: 'y', value: ty });
                    }
                }
            });
        });
    });

    return { snappedX, snappedY, guides };
};
