export interface DashboardSummaryInput {
  totalOrders: number;
  ordersInProduction: number;
  readyOrders: number;
  overdueOrders: number;
  totalRevenue: number;
  totalPaid: number;
  totalDebt: number;
  cashboxBalance: number;
  lowStockMaterials: number;
  todayPayments: number;
  monthRevenue: number;
  monthProfit: number;
  topCustomers: Array<{ id: string; name: string; companyName?: string | null; totalAmount: number }>;
  recentOrders: unknown[];
  recentPayments: unknown[];
}

export function calculateDashboardSummary(input: DashboardSummaryInput) {
  return {
    totalOrders: input.totalOrders,
    ordersInProduction: input.ordersInProduction,
    readyOrders: input.readyOrders,
    overdueOrders: input.overdueOrders,
    totalRevenue: input.totalRevenue,
    totalPaid: input.totalPaid,
    totalDebt: input.totalDebt,
    cashboxBalance: input.cashboxBalance,
    lowStockMaterials: input.lowStockMaterials,
    todayPayments: input.todayPayments,
    monthRevenue: input.monthRevenue,
    monthProfit: input.monthProfit,
    topCustomers: input.topCustomers,
    recentOrders: input.recentOrders,
    recentPayments: input.recentPayments
  };
}
