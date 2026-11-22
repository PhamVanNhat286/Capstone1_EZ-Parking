'use strict';

// Shared by the PostgreSQL API and the browser's sample-data store.
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.EZ_REVENUE = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const COMMISSION_RATE = 0.05;
  const amount = value => Number(value) || 0;
  const roundMoney = value => Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON) * 100) / 100;

  function withRevenue(row) {
    const received = amount(row.received ?? (amount(row.deposits) + amount(row.finals)));
    const net = roundMoney(received - amount(row.refunds));
    const admin = roundMoney(net * COMMISSION_RATE);
    return { ...row, received, net_received: net, admin_revenue: admin, owner_revenue: roundMoney(net - admin) };
  }

  function withPaymentRevenue(payment) {
    const received = payment.status === 'success' && ['deposit', 'final'].includes(payment.payment_type)
      ? amount(payment.amount) : 0;
    const refunds = payment.payment_type === 'refund' && ['success', 'refunded'].includes(payment.status)
      ? amount(payment.amount) : 0;
    return withRevenue({ ...payment, received, refunds });
  }

  function withReportRevenue(report) {
    return {
      ...report,
      totals: withRevenue(report.totals),
      byLot: report.byLot.map(withRevenue),
      byProvider: report.byProvider.map(withRevenue),
      byVehicle: report.byVehicle.map(withRevenue),
      byDay: report.byDay.map(withRevenue),
      recent: report.recent.map(withPaymentRevenue),
      commission: { rate: COMMISSION_RATE, basis: 'net_received' }
    };
  }

  return { COMMISSION_RATE, withRevenue, withPaymentRevenue, withReportRevenue };
});
