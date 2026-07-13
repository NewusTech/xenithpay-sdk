// ---------------------------------------------------------------------------
// Balance Types
// ---------------------------------------------------------------------------

export interface Balance {
  currency: string;
  amount: number;
  [key: string]: unknown;
}

export type GetBalancesResponse = Balance[];
