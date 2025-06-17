# Technical Context - Lumines Game

## Technology Stack

### Core Technologies

- **React 18**: Functional components with hooks
- **TypeScript**: Type safety and better development experience
- **Vite**: Fast development server and build tool
- **Storybook**: Component development and documentation

### Development Environment

- **Node.js**: Latest LTS version
- **pnpm**: Package manager (faster than npm)
- **ESLint**: Code linting and style enforcement (with import plugin)
- **Modern browser**: ES6+ features required

## Project Structure

```
react-lumines/
├── src/
│   ├── components/          # React components
│   │   ├── GameBoard/
│   │   ├── Block/
│   │   ├── Timeline/
│   │   └── Controls/
│   ├── hooks/              # Custom React hooks
│   │   ├── useGameLoop.ts
│   │   ├── useControls.ts
│   │   ├── useSeededRNG.ts
│   │   └── useReplay.ts
│   ├── utils/              # Utility functions
│   │   ├── gameLogic.ts
│   │   ├── collision.ts
│   │   └── seededRNG.ts
│   ├── types/              # TypeScript type definitions
│   │   ├── game.ts
│   │   └── replay.ts
│   └── constants/          # Game constants
│       └── gameConfig.ts
├── public/                 # Static assets
├── .storybook/            # Storybook configuration
└── memory-bank/           # Project documentation
```

## Import Alias Configuration

### @ Alias Setup

The project uses `@/` as an alias for the `src/` directory to enable cleaner imports.

**Usage Examples:**
```typescript
// Instead of: import { BOARD_WIDTH } from '../../constants/gameConfig';
import { BOARD_WIDTH } from '@/constants/gameConfig';

// Instead of: import type { GameState } from '../../../types/game';
import type { GameState } from '@/types/game';
```

**Configuration Files:**

1. **TypeScript (`tsconfig.app.json`)**:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

2. **Vite (`vite.config.ts`)**:
```typescript
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
});
```

3. **ESLint (`eslint.config.js`)**:
```javascript
settings: {
  'import/resolver': {
    'typescript': {
      'alwaysTryTypes': true,
      'project': './tsconfig.json'
    },
    'alias': {
      'map': [['@', './src']],
      'extensions': ['.ts', '.tsx', '.js', '.jsx']
    }
  }
}
```

## Dependencies

### Production Dependencies

```json
{
  "react": "^18.x",
  "react-dom": "^18.x"
}
```

### Development Dependencies

```json
{
  "@types/react": "^18.x",
  "@types/react-dom": "^18.x",
  "@types/node": "^24.x",
  "@vitejs/plugin-react": "^4.x",
  "typescript": "^5.x",
  "vite": "^5.x",
  "eslint": "^8.x",
  "eslint-plugin-import": "^2.x",
  "eslint-import-resolver-typescript": "^4.x",
  "@storybook/react": "^7.x"
}
```

## Technical Constraints

### Browser Support

- **Modern browsers**: Chrome 90+, Firefox 88+, Safari 14+
- **ES6+ features**: Arrow functions, destructuring, modules
- **No polyfills**: Assumes modern JavaScript support
- **Desktop focus**: Keyboard controls only (no mobile touch)

### Performance Requirements

- **60 FPS**: Fixed timestep game loop
- **Input lag**: < 16ms response time
- **Memory usage**: Efficient state management
- **Bundle size**: Keep under 1MB for fast loading

### Development Constraints

- **No external game engines**: Pure React implementation
- **No backend**: Client-side only for MVP
- **Functional components**: No class components
- **TypeScript strict mode**: Full type safety

## Build Configuration

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});
```

### TypeScript Configuration

- **Strict mode**: Enabled for maximum type safety
- **Module resolution**: Node.js style
- **Target**: ES2020 for modern browser features
- **JSX**: React 18 automatic runtime

## Tool Usage Patterns

### Development Workflow

1. **Storybook**: Component development in isolation
2. **Hot reload**: Instant feedback during development
3. **TypeScript**: Compile-time error checking
4. **ESLint**: Code quality and consistency

### Testing Strategy (Future)

- **Unit tests**: Jest + React Testing Library
- **Component tests**: Storybook interaction tests
- **E2E tests**: Playwright for full game scenarios
- **Replay verification**: Deterministic behavior validation

## Code Quality Standards

### TypeScript Usage

- **Strict types**: No `any` types allowed
- **Interface definitions**: Clear contracts for all data structures
- **Generic types**: Flexible, reusable code
- **Type guards**: Runtime type checking where needed

### React Best Practices

- **Functional components**: Use hooks for state and effects
- **Custom hooks**: Extract reusable logic
- **Memoization**: React.memo for performance optimization
- **Error boundaries**: Graceful error handling

### File Organization

- **Feature-based**: Group related files together
- **Index exports**: Clean import statements
- **Consistent naming**: PascalCase for components, camelCase for functions
- **Type definitions**: Separate files for complex types

## Performance Considerations

### Game Loop Implementation

- **requestAnimationFrame**: Browser-optimized timing
- **Fixed timesteps**: Deterministic updates
- **Frame skipping**: Maintain target FPS
- **Efficient rendering**: Only update changed elements

### Memory Management

- **Avoid memory leaks**: Proper cleanup in useEffect
- **Minimize re-renders**: Careful dependency arrays
- **Object pooling**: Reuse objects where possible
- **Garbage collection**: Minimize object creation in hot paths

## Code Quality Configuration

### ESLint with Import Plugin

The project uses `eslint-plugin-import` for import management:

- **Import ordering**: Enforced with alphabetical sorting and grouping
- **No unresolved imports**: Catches broken import paths
- **No duplicate imports**: Prevents redundant imports  
- **Alias resolution**: TypeScript-aware import resolution

**Import Order Groups:**
1. Built-in Node modules
2. External libraries
3. Internal modules (using @ alias)
4. Parent directory imports
5. Sibling file imports
6. Index file imports
