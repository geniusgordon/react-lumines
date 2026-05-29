import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ReplayAnalytics } from '@/types/replay';

import { StatsGrid } from '../StatsGrid';

function fixtureAnalytics(
  overrides: Partial<ReplayAnalytics> = {}
): ReplayAnalytics {
  return {
    scoreTimeline: [],
    peakChainLength: 5,
    peakChainFrame: 100,
    boardEfficiency: 0.4,
    keyMoments: [],
    columnHeatmap: { counts: new Array(16).fill(0), max: 0 },
    scoreDistribution: { small: 0, medium: 0, large: 0 },
    sweepYield: { total: 12, mean: 4, payouts: 3 },
    ...overrides,
  };
}

describe('StatsGrid — sweep yield', () => {
  it('renders mean and payout count', () => {
    const { getByText } = render(
      <StatsGrid analytics={fixtureAnalytics()} finalScore={500} />
    );
    expect(getByText('4.0')).toBeInTheDocument(); // mean (one decimal)
    expect(getByText(/3 payouts/i)).toBeInTheDocument();
  });

  it('renders total cells cleared', () => {
    const { getByText } = render(
      <StatsGrid analytics={fixtureAnalytics()} finalScore={500} />
    );
    expect(getByText('12')).toBeInTheDocument();
  });
});
