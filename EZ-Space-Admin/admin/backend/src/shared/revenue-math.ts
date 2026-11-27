export const COMMISSION_RATE = 0.05;

interface RevenueInputRow {
  received?: number | string | null;
  deposits?: number | string | null;
  finals?: number | string | null;
  refunds?: number | string | null;
  [key: string]: unknown;
}

type RevenueRow<T extends RevenueInputRow = RevenueInputRow> = T & {
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

export function withRevenue<T extends RevenueInputRow>(
  row: T,
  commissionRate = COMMISSION_RATE
): RevenueRow<T> {
  const received = amount(row.received ?? amount(row.deposits) + amount(row.finals));
  const net = roundMoney(received - amount(row.refunds));
  const admin = roundMoney(net * commissionRate);
  return {
    ...row,
    received,
    net_received: net,
    admin_revenue: admin,
    owner_revenue: roundMoney(net - admin)
  };
}

export function withPaymentRevenue<T extends PaymentLike>(
  payment: T,
  commissionRate = COMMISSION_RATE
): RevenueRow<T & { received: number; refunds: number }> {
  const received =
    payment.status === 'success' && ['deposit', 'final'].includes(payment.payment_type)
      ? amount(payment.amount)
      : 0;
  const refunds =
    payment.payment_type === 'refund' && ['success', 'refunded'].includes(payment.status)
      ? amount(payment.amount)
      : 0;
  return withRevenue({ ...payment, received, refunds }, commissionRate);
}

interface RawRevenueReport<
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
>(
  report: RawRevenueReport<TTotals, TLot, TProvider, TVehicle, TDay, TRecent>,
  commissionRate = COMMISSION_RATE
) {
  return {
    ...report,
    totals: withRevenue(report.totals, commissionRate),
    byLot: report.byLot.map(row => withRevenue(row, commissionRate)),
    byProvider: report.byProvider.map(row => withRevenue(row, commissionRate)),
    byVehicle: report.byVehicle.map(row => withRevenue(row, commissionRate)),
    byDay: report.byDay.map(row => withRevenue(row, commissionRate)),
    recent: report.recent.map(row => withPaymentRevenue(row, commissionRate)),
    commission: { rate: commissionRate, basis: 'net_received' as const }
  };
}
