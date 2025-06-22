import { useState, useEffect } from 'react';

interface UseResponsiveScaleOptions {
  baseWidth?: number; // Base width of the game area in pixels
  minScale?: number; // Minimum scale factor
  maxScale?: number; // Maximum scale factor
  padding?: number; // Padding around the game area
}

interface UseResponsiveScaleReturn {
  scale: number;
  scaledWidth: number;
  scaledHeight: number;
  ready: boolean;
}

/**
 * Hook to calculate responsive scale for the game screen based on window width
 * Ensures the game fits within the viewport while maintaining aspect ratio
 */
export const useResponsiveScale = (
  options: UseResponsiveScaleOptions = {}
): UseResponsiveScaleReturn => {
  const {
    baseWidth = 704, // GameBoard (16*32) + Queue/Score areas (3*32 on each side)
    minScale = 0.5,
    maxScale = 2.0,
    padding = 40, // Padding on both sides
  } = options;

  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const calculateScale = () => {
      const windowWidth = window.innerWidth;
      const availableWidth = windowWidth - padding;

      // Calculate scale to fit the game area within available width
      const newScale = Math.min(
        maxScale,
        Math.max(minScale, availableWidth / baseWidth)
      );

      setScale(newScale);
      setReady(true);
    };

    // Calculate initial scale
    calculateScale();

    // Add resize listener
    window.addEventListener('resize', calculateScale);

    return () => window.removeEventListener('resize', calculateScale);
  }, [baseWidth, minScale, maxScale, padding]);

  const scaledWidth = baseWidth * scale;
  const scaledHeight = 320 * scale; // Base GameBoard height (10 * 32px)

  return {
    scale,
    scaledWidth,
    scaledHeight,
    ready,
  };
};
