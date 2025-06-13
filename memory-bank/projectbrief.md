# Lumines Game - Project Brief

## Project Overview
Build a web-based Lumines puzzle game using React that captures the core block-dropping and clearing mechanics of the original game, with emphasis on deterministic gameplay and replay functionality.

## Core Requirements

### Game Mechanics
- **Grid**: 16x10 game board (16 columns, 10 rows)
- **Blocks**: 2x2 tetrominoes with two colors (light/dark squares)
- **Controls**: Arrow keys for movement, Z/X for rotation, Space for hard drop, Down for soft drop
- **Rectangle Detection**: Detect and clear same-colored rectangles (minimum 2x2)
- **Timeline Sweep**: Vertical line moves left-to-right to clear rectangles
- **Gravity**: Blocks fall after clearing

### Technical Requirements
- **React Architecture**: Functional components with hooks
- **Deterministic System**: Seeded RNG, integer-only positioning, fixed timesteps
- **Game Loop**: Fixed 60 FPS with 16ms intervals
- **Replay System**: Input recording, save/load functionality, seed sharing

### Key Constraints
- Built with React (functional components only)
- No external game engines
- Modern browser support (ES6+)
- No backend required for MVP
- 100% deterministic gameplay

## Success Criteria
- Playable Lumines game with core mechanics
- Smooth 60 FPS performance with fixed timesteps
- Accurate rectangle detection and clearing
- Functional replay system with save/load
- Deterministic behavior (same seed = same results)

## Project Status
- **Phase**: Initialization
- **Setup**: Vite React TypeScript template + Storybook
- **Next**: Architecture design and core component structure 