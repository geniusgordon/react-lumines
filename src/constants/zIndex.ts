/**
 * Z-Index Layer Constants for React Lumines
 *
 * Centralized z-index management to maintain proper visual layering
 * throughout the game interface and prevent stacking conflicts.
 */

/**
 * Game field z-index layers - controls visual stacking within the main game area
 */
export const GAME_FIELD_Z_INDEX = {
  /**
   * Drop shadow/preview for player's current block
   * Shows where the block will land - intentionally below all other elements for subtle guidance
   */
  DROP_SHADOW: 10,

  /**
   * Base game board layer
   * - Settled blocks that are part of the game state
   * - Falling blocks during gravity animations
   */
  BOARD_BASE: 20,

  /**
   * Game effects and feedback layer
   * - Pattern detection borders (white outlines around detected rectangles)
   * - Cell clearing animations and highlights
   * Must be above base blocks to provide visual feedback
   */
  GAME_EFFECTS: 25,

  /**
   * Active gameplay elements
   * - Player's current falling block (highest priority for interaction)
   * - Timeline sweep line (critical game mechanic visibility)
   * Must be above all other game elements for clear player focus
   */
  ACTIVE_ELEMENTS: 30,
} as const;

/**
 * UI overlay z-index layers - controls application-level interface elements
 */
export const UI_Z_INDEX = {
  /**
   * Modal overlays and game state screens
   * - Game over menu
   * - Pause menu
   * - Countdown overlay
   * - Delete confirmation modal
   * Must block game interaction when active
   */
  MODALS: 50,

  /**
   * System-level overlays
   * - Debug panel (development tools)
   * - Replay header (replay mode controls)
   * Highest priority - must appear above all other elements
   */
  SYSTEM_OVERLAY: 60,
} as const;

/**
 * Combined z-index constants for easy access
 */
export const Z_INDEX = {
  ...GAME_FIELD_Z_INDEX,
  ...UI_Z_INDEX,
} as const;

/**
 * Utility function to generate Tailwind z-index class names
 */
export const getZIndexClass = (zIndex: number): string => `z-${zIndex}`;

/**
 * Type definitions for z-index layers
 */
export type GameFieldZIndex =
  (typeof GAME_FIELD_Z_INDEX)[keyof typeof GAME_FIELD_Z_INDEX];
export type UIZIndex = (typeof UI_Z_INDEX)[keyof typeof UI_Z_INDEX];
export type ZIndex = GameFieldZIndex | UIZIndex;
