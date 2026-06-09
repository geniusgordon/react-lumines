// Shared cell glyphs for board diagrams printed by the strategy scripts.
// Matches the notation used in docs/strategy:
//   · empty   ○ light   ● dark   ◌/◍ = light/dark cell cleared this sweep
// Placed-by-drop cells are conventionally shown with a trailing `*`.
export function cellGlyph(v: number, cleared = false): string {
  if (v === 0) {
    return '·';
  }
  if (v === 1) {
    return cleared ? '◌' : '○';
  }
  return cleared ? '◍' : '●';
}
