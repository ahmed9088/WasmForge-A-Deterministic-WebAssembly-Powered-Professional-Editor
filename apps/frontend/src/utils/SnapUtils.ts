export interface SnapGuide {
    type: 'x' | 'y';
    value: number;
}

export const calculateSnaps = (
    movingId: string,
    newX: number,
    newY: number,
    elements: any[],
    threshold = 10
): { snappedX: number; snappedY: number; guides: SnapGuide[] } => {
    let snappedX = newX;
    let snappedY = newY;
    const guides: SnapGuide[] = [];

    const movingEl = elements.find(e => e.id === movingId);
    if (!movingEl || !('Rect' in movingEl.shape)) return { snappedX, snappedY, guides };

    const { width, height } = movingEl.shape.Rect;

    elements.forEach(el => {
        if (el.id === movingId || !('Rect' in el.shape)) return;

        const targetRect = el.shape.Rect;
        const targetsX = [targetRect.origin.x, targetRect.origin.x + targetRect.width / 2, targetRect.origin.x + targetRect.width];
        const targetsY = [targetRect.origin.y, targetRect.origin.y + targetRect.height / 2, targetRect.origin.y + targetRect.height];

        const sourceX = [newX, newX + width / 2, newX + width];
        const sourceY = [newY, newY + height / 2, newY + height];

        targetsX.forEach(tx => {
            sourceX.forEach((sx, i) => {
                if (Math.abs(sx - tx) < threshold) {
                    snappedX = tx - (i === 0 ? 0 : i === 1 ? width / 2 : width);
                    guides.push({ type: 'x', value: tx });
                }
            });
        });

        targetsY.forEach(ty => {
            sourceY.forEach((sy, i) => {
                if (Math.abs(sy - ty) < threshold) {
                    snappedY = ty - (i === 0 ? 0 : i === 1 ? height / 2 : height);
                    guides.push({ type: 'y', value: ty });
                }
            });
        });
    });

    return { snappedX, snappedY, guides };
};
