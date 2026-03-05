# Lumines Design System — MASTER

**Style:** Clean Modern Dark
**Stack:** React + TypeScript + Tailwind v4 + shadcn/ui

---

## Color Palette

### Base (CSS custom properties — `:root`)

| Token | Value | Hex | Usage |
|-------|-------|-----|-------|
| `--background` | `oklch(0.32 0 0)` | #424242 | Page/app background |
| `--foreground` | `oklch(0.97 0 0)` | #fafafa | Body text |
| `--card` | `oklch(0.27 0 0)` | #383838 | Card/panel surfaces |
| `--card-foreground` | `oklch(0.97 0 0)` | #fafafa | Card text |
| `--popover` | `oklch(0.27 0 0)` | #383838 | Popover/dropdown backgrounds |
| `--popover-foreground` | `oklch(0.97 0 0)` | #fafafa | Popover text |
| `--primary` | `oklch(0.73 0.175 55)` | #ff9800 | CTA buttons, highlights |
| `--primary-foreground` | `oklch(0.15 0 0)` | #1a1a1a | Text on orange |
| `--secondary` | `oklch(0.44 0 0)` | #616161 | Secondary buttons/surfaces |
| `--secondary-foreground` | `oklch(0.97 0 0)` | #fafafa | Secondary text |
| `--muted` | `oklch(0.40 0 0)` | #575757 | Muted surfaces |
| `--muted-foreground` | `oklch(0.72 0 0)` | #aaaaaa | Subdued labels |
| `--accent` | `oklch(0.44 0 0)` | #616161 | Hover states |
| `--accent-foreground` | `oklch(0.97 0 0)` | #fafafa | Accent text |
| `--destructive` | `oklch(0.577 0.245 27.325)` | red-orange | Error/delete actions |
| `--success` | `oklch(0.65 0.15 145)` | green | Success states, connected, enabled |
| `--success-foreground` | `oklch(0.97 0 0)` | near-white | Text on success backgrounds |
| `--warning` | `oklch(0.78 0.14 70)` | yellow/amber | Warning states, degraded, connecting |
| `--warning-foreground` | `oklch(0.15 0 0)` | near-black | Text on warning backgrounds |
| `--border` | `oklch(1 0 0 / 12%)` | white 12% | Subtle dividers |
| `--input` | `oklch(1 0 0 / 15%)` | white 15% | Input field borders |
| `--ring` | `oklch(0.73 0.175 55)` | #ff9800 | Focus rings |

### `.dark` variant (deeper, used when `.dark` class applied)

| Token | Value | Hex |
|-------|-------|-----|
| `--background` | `oklch(0.22 0 0)` | #2a2a2a |
| `--card` | `oklch(0.18 0 0)` | #222222 |
| `--primary` | `oklch(0.73 0.175 55)` | #ff9800 (same) |

### Game-specific tokens (`@theme` — do not change)

These drive rendering logic and must remain stable:

| Token | Value | Purpose |
|-------|-------|---------|
| `--color-block-light` | #fafafa | White game blocks |
| `--color-block-dark` | #ff9800 | Orange game blocks |
| `--color-block-dark-detected` | #ffb74d | Detected orange blocks |
| `--color-block-light-detected` | #e0e0e0 | Detected white blocks |
| `--color-block-marked` | #757575 | Blocks queued for clearing |
| `--color-block-shadow` | #03a9f4 | Ghost/shadow blocks |
| `--color-game-empty` | #424242 | Empty cell background |
| `--color-game-grid` | #616161 | Grid lines |
| `--color-game-timeline` | #ffffff | Timeline sweep |
| `--color-game-background` | #424242 | Game canvas background |
| `--color-game-text` | #fafafa | In-game UI text |
| `--color-game-ui` | #757575 | In-game UI elements |

---

## Typography

**Stack:** `system-ui, -apple-system, sans-serif`
No external fonts. Keeps bundle small and renders crisply on all platforms.

| Use | Size | Weight |
|-----|------|--------|
| Display/Score | `text-4xl–6xl` | 700 |
| Heading | `text-xl–2xl` | 600 |
| Body | `text-sm–base` | 400 |
| Label/Caption | `text-xs` | 400–500 |

---

## Spacing

**Block unit:** `--spacing-block-size: 32px` — each game cell is 32×32px.

UI spacing uses standard Tailwind scale (4px base). Avoid fractional values.

---

## Border Radius

Uses shadcn/ui radius system anchored at `--radius: 0.625rem` (10px):

| Token | Value |
|-------|-------|
| `--radius-sm` | 6px |
| `--radius-md` | 8px |
| `--radius-lg` | 10px |
| `--radius-xl` | 14px |

---

## Effects

- **Borders:** 1px, `border-border` (white 12% alpha) — subtle, not harsh
- **Shadows:** `shadow-sm` or `shadow-md` max — no colored glow
- **Backgrounds:** Always dark gray family. No white surfaces.
- **Transitions:** `transition-colors duration-150` for interactive elements

---

## Components (shadcn/ui)

All shadcn components inherit the dark palette automatically via CSS variables.

| Component | Notes |
|-----------|-------|
| Button (default) | Uses `--primary` → orange background, dark text |
| Button (secondary) | Uses `--secondary` → gray #616161 |
| Button (ghost) | Transparent, hover uses `--accent` |
| Dialog/Modal | `--popover` background (#383838), `--border` border |
| Card | `--card` background (#383838) |
| Input | `--input` border (white 15%), `--background` fill |
| Badge | Orange primary or muted gray |

---

## Anti-Patterns

Never use these in this project:

- **Light/white backgrounds** for UI surfaces — breaks dark theme cohesion
- **Pixel/retro fonts** — not part of the clean modern aesthetic
- **Neon glow effects** — avoid `drop-shadow` with vivid colors on UI chrome
- **Hardcoded hex** in component files — use CSS tokens or Tailwind utility classes
- **Inline `style` for colors** — defeats the design system
- **Changing game `@theme` tokens** — they're rendering constants, not design tokens

---

## Decision Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-03-06 | Set `:root --background` to #424242 | Unify shadcn components with game's native dark background |
| 2026-03-06 | Orange (#ff9800) as `--primary` | Reuse existing game block color as brand accent |
| 2026-03-06 | Keep `.dark` as deeper #2a2a2a | Allow opt-in deeper dark without breaking base theme |
| 2026-03-06 | Add `--success` (green) and `--warning` (yellow/amber) | Semantic tokens for FPS status, connection state, import feedback |
