export const COMMISSION_RATE = 0.05;

export interface RevenueInputRow {
  received?: number | string | null;
  deposits?: number | string | null;
  finals?: number | string | null;
  refunds?: number | string | null;
  [key: string]: unknown;
}

export type RevenueRow<T extends RevenueInputRow = RevenueInputRow> = T & {
  received: number;
  net_received: number;
  admin_revenue: number;
  owner_revenue: number;
};

export interface PaymentLike {
  status: string;
  payment_type: string;
  amount: number | string;
  [key: string]: unknown;
}

const amount = (value: unknown): number => Number(value) || 0;

const roundMoney = (value: number): number =>
  Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON) * 100) / 100;

export function withRevenue<T extends RevenueInputRow>(row: T): RevenueRow<T> {
  const received = amount(row.received ?? amount(row.deposits) + amount(row.finals));
  const net = roundMoney(received - amount(row.refunds));
  const admin = roundMoney(net * COMMISSION_RATE);
  return {
    ...row,
    received,
    net_received: net,
    admin_revenue: admin,
    owner_revenue: roundMoney(net - admin)
  };
}

export function withPaymentRevenue<T extends PaymentLike>(
  payment: T
): RevenueRow<T & { received: number; refunds: number }> {
  const received =
    payment.status === 'success' && ['deposit', 'final'].includes(payment.payment_type)
      ? amount(payment.amount)
      : 0;
  const refunds =
    payment.payment_type === 'refund' && ['success', 'refunded'].includes(payment.status)
      ? amount(payment.amount)
      : 0;
  return withRevenue({ ...payment, received, refunds });
}

export interface RawRevenueReport<
  TTotals extends RevenueInputRow = RevenueInputRow,
  TLot extends RevenueInputRow = RevenueInputRow,
  TProvider extends RevenueInputRow = RevenueInputRow,
  TVehicle extends RevenueInputRow = RevenueInputRow,
  TDay extends RevenueInputRow = RevenueInputRow,
  TRecent extends PaymentLike = PaymentLike
> {
  range: { from: string; to: string };
  totals: TTotals;
  byLot: TLot[];
  byProvider: TProvider[];
  byVehicle: TVehicle[];
  byDay: TDay[];
  recent: TRecent[];
}

export function withReportRevenue<
  TTotals extends RevenueInputRow,
  TLot extends RevenueInputRow,
  TProvider extends RevenueInputRow,
  TVehicle extends RevenueInputRow,
  TDay extends RevenueInputRow,
  TRecent extends PaymentLike
>(report: RawRevenueReport<TTotals, TLot, TProvider, TVehicle, TDay, TRecent>) {
  return {
    ...report,
    totals: withRevenue(report.totals),
    byLot: report.byLot.map(withRevenue),
    byProvider: report.byProvider.map(withRevenue),
    byVehicle: report.byVehicle.map(withRevenue),
    byDay: report.byDay.map(withRevenue),
    recent: report.recent.map(withPaymentRevenue),
    commission: { rate: COMMISSION_RATE, basis: 'net_received' as const }
  };
}

