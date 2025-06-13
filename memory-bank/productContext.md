# Product Context - Lumines Game

## Why This Project Exists
Lumines is a beloved puzzle game that combines block-dropping mechanics with rhythm-based clearing. This web implementation aims to recreate the core gameplay experience while adding modern features like deterministic replays and seed sharing.

## Problems It Solves
- **Accessibility**: Web-based version playable without console/installation
- **Deterministic Gaming**: Reproducible gameplay for competitive play and analysis
- **Replay System**: Learn from gameplay, share interesting runs, verify scores
- **Community**: Seed sharing enables standardized challenges

## How It Should Work

### Core Gameplay Loop
1. **Block Generation**: 2x2 colored blocks fall from top
2. **Player Control**: Move, rotate, and drop blocks strategically
3. **Rectangle Formation**: Same-colored squares form solid rectangles
4. **Timeline Clearing**: Vertical sweep line removes completed rectangles
5. **Gravity & Scoring**: Remaining blocks fall, player scores points

### User Experience Goals

#### Immediate Feedback
- Smooth, responsive controls with no input lag
- Clear visual distinction between block colors
- Satisfying rectangle clearing animation with timeline sweep

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