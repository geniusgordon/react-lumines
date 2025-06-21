# Product Context - Lumines Game

## Why This Project Exists

Lumines is a beloved puzzle game that combines block-dropping mechanics with rhythm-based clearing. This web implementation aims to recreate the core gameplay experience while adding modern features like deterministic replays and seed sharing.

## Problems It Solves

- **Accessibility**: Web-based version playable without console/installation
- **Deterministic Gaming**: Reproducible gameplay for competitive play and analysis
- **Replay System**: Learn from gameplay, share interesting runs, verify scores
- **Community**: Seed sharing enables standardized challenges

## How It Should Work

### Core Gameplay Loop - The 4-Step Lumines Rhythm

1. **Drop Blocks**: 2×2 colored blocks fall onto the board - position them strategically
2. **Form Patterns**: Same-colored 2×2 squares get marked for clearing (but stay on board)
3. **Timeline Sweep**: A vertical line continuously sweeps left-to-right, clearing marked squares only when it passes through them
4. **Gravity & Repeat**: Remaining blocks fall down, new patterns may form, cycle continues

### The Critical Insight: Timeline Rhythm

The unique Lumines mechanic is the **delay between pattern formation and clearing**:
- Patterns are **marked instantly** when formed
- But only **cleared when the timeline sweep passes through them**
- This creates strategic timing: *"Where will the timeline be when I need this cleared?"*
- Players must think both spatially (where to place blocks) AND temporally (timeline timing)
- The rhythm element that makes Lumines distinctly different from other puzzle games

### User Experience Goals

#### Immediate Feedback

- Smooth, responsive controls with no input lag
- Clear visual distinction between block colors
- **Pattern marking feedback**: Visual indication when 2×2+ patterns form
- **Timeline anticipation**: Clear visual of sweep approaching marked patterns
- Satisfying clearing animation when timeline passes through marked areas

#### Learning Curve

- Intuitive controls following standard puzzle game conventions
- Clear visual feedback for valid moves and rectangle formation
- Progressive difficulty through natural speed increases

#### Replayability

- Seed system enables practice on identical scenarios
- Replay functionality for analyzing and sharing gameplay
- Deterministic behavior ensures fair competition

## Target Users

### Primary

- **Puzzle game enthusiasts** seeking challenging, strategic gameplay
- **Competitive players** wanting reproducible, skill-based competition
- **Content creators** needing replay and sharing capabilities

### Secondary

- **Casual players** enjoying relaxing puzzle solving
- **Retro gaming fans** nostalgic for classic Lumines experience

## User Interface Philosophy

- **Minimalist**: Clean, uncluttered design focusing on gameplay
- **Responsive**: Immediate visual feedback for all actions
- **Accessible**: Clear contrasts, readable text, intuitive controls
- **Efficient**: No unnecessary animations or delays

## Key Differentiators

1. **Web-based**: No installation required, works on any modern browser
2. **Deterministic**: 100% reproducible gameplay from seeds
3. **Replay System**: Full input recording and playback capabilities
4. **Open Source**: Transparent implementation, community contributions welcome
