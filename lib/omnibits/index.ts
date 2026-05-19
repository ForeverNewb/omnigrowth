// OmniBits metering wrapper stub. All OpenRouter calls and render jobs flow
// through this to convert raw cost into the user-facing OmniBits currency.
// Economy decisions are deferred (see docs/features/omnibits-economy.md).

export type OmniBitsBalance = {
  total: number;
  used: number;
  remaining: number;
  cycleEnd: string;
};

const MOCK_BALANCE: OmniBitsBalance = {
  total: 10_000,
  used: 3_840,
  remaining: 6_160,
  cycleEnd: "2026-06-01",
};

export function getBalance(): OmniBitsBalance {
  return MOCK_BALANCE;
}

export function estimateCost(_kind: "draft" | "image" | "video" | "carousel"): number {
  // Placeholder. Real conversion rate is deferred.
  return 1;
}
