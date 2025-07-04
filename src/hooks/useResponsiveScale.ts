import { useState, useEffect } from 'react';

import { BLOCK_SIZE, BOARD_HEIGHT, BOARD_WIDTH } from '../constants';

interface UseResponsiveScaleOptions {
  baseWidth?: number; // Base width of the game area in pixels
  baseHeight?: number; // Base height of the game area in pixels
  minScale?: number; // Minimum scale factor
  maxScale?: number; // Maximum scale factor
  padding?: number; // Padding around the game area
  headerHeight?: number; // Height of header elements that reduce available space
  footerHeight?: number; // Height of footer elements that reduce available space
}

export interface UseResponsiveScaleReturn {
  scale: number;
  scaledWidth: number;
  scaledHeight: number;
  ready: boolean;
}

/**
 * Hook to calculate responsive scale for the game screen based on viewport size
 * Ensures the game fits within the viewport while maintaining aspect ratio
 * Considers both width and height constraints, including header elements
 */
export const useResponsiveScale = (
  options: UseResponsiveScaleOptions = {}
): UseResponsiveScaleReturn => {
  const {
    baseWidth = BOARD_WIDTH * BLOCK_SIZE + 3 * BLOCK_SIZE + 3 * BLOCK_SIZE, // GameBoard (16*32) + Queue/Score areas (3*32 on each side)
    baseHeight = (BOARD_HEIGHT + 4) * BLOCK_SIZE, // GameBoard height (10 * 32px) + buffer
    minScale = 0.5,
    maxScale = 2.0,
    padding = 40, // Padding on both sides
    headerHeight = 96, // Height reserved for header elements (ReplayHeader is ~74px)
    footerHeight = 140,
  } = options;

  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const calculateScale = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      const availableWidth = windowWidth - padding;
      const availableHeight =
        windowHeight - headerHeight - footerHeight - padding;

      // Calculate scale based on both width and height constraints
      const widthScale = availableWidth / baseWidth;
      const heightScale = availableHeight / baseHeight;

      // Use the most restrictive dimension (smallest scale)
      const newScale = Math.min(
        maxScale,
        Math.max(minScale, Math.min(widthScale, heightScale))
      );

      setScale(newScale);
      setReady(true);
    };

    // Calculate initial scale
    calculateScale();

    // Add resize listener
    window.addEventListener('resize', calculateScale);

    return () => window.removeEventListener('resize', calculateScale);
  }, [
    baseWidth,
    baseHeight,
    minScale,
    maxScale,
    padding,
    headerHeight,
    footerHeight,
  ]);

  const scaledWidth = baseWidth * scale;
  const scaledHeight = baseHeight * scale;

  return {
    scale,
    scaledWidth,
    scaledHeight,
    ready,
  };
};
