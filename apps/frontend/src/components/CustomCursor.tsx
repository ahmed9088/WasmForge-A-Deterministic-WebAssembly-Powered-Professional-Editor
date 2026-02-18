import React, { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

interface CustomCursorProps {
    hoverState?: 'default' | 'pointer' | 'grab' | 'text' | 'resize';
}

export const CustomCursor: React.FC<CustomCursorProps> = ({ hoverState = 'default' }) => {
    const [isVisible, setIsVisible] = useState(false);

    // High-performance motion values for precise tracking
    const mouseX = useMotionValue(-100);
    const mouseY = useMotionValue(-100);

    // Smooth springs for the trailing ring
    const springConfig = { damping: 25, stiffness: 200 };
    const trailX = useSpring(mouseX, springConfig);
    const trailY = useSpring(mouseY, springConfig);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
            if (!isVisible) setIsVisible(true);
        };

        const handleMouseEnter = () => setIsVisible(true);
        const handleMouseLeave = () => setIsVisible(false);

        window.addEventListener('mousemove', handleMouseMove);
        document.body.addEventListener('mouseenter', handleMouseEnter);
        document.body.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            document.body.removeEventListener('mouseenter', handleMouseEnter);
            document.body.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [isVisible, mouseX, mouseY]);

    if (!isVisible) return null;

    const isPointer = hoverState === 'pointer' || hoverState === 'grab' || hoverState === 'resize';

    return (
        <>
            {/* Precise Central Dot */}
            <motion.div
                className="fixed top-0 left-0 w-1.5 h-1.5 bg-white rounded-full pointer-events-none z-[9999] mix-blend-difference"
                style={{
                    x: mouseX,
                    y: mouseY,
                    translateX: '-50%',
                    translateY: '-50%',
                }}
            />

            {/* Trailing Ring */}
            <motion.div
                className="fixed top-0 left-0 rounded-full border border-white/30 pointer-events-none z-[9998] mix-blend-difference"
                style={{
                    x: trailX,
                    y: trailY,
                    translateX: '-50%',
                    translateY: '-50%',
                    width: isPointer ? 40 : 20,
                    height: isPointer ? 40 : 20,
                    backgroundColor: isPointer ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                }}
                animate={{
                    scale: isPointer ? 1.2 : 1,
                    opacity: 1,
                }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            />
        </>
    );
};
