import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from './shared/layout/DashboardLayout';
import { AuthLayout } from './shared/layout/AuthLayout';
import { ProtectedRoute } from './shared/routing/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersPage } from './pages/OrdersPage';
import { CalculationsPage } from './pages/CalculationsPage';
import { CalculationParametersPage } from './pages/CalculationParametersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { OrderCreatePage } from './pages/OrderCreatePage';
import { CustomersPage } from './pages/CustomersPage';
import { InventoryPage } from './pages/InventoryPage';
import { FinancePage } from './pages/FinancePage';
import { ProductionPage } from './pages/ProductionPage';
import { DebtsPage } from './pages/DebtsPage';
import { SettingsPage } from './pages/SettingsPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { SalesPage } from './pages/SalesPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { CustomerDebtsPage } from './pages/CustomerDebtsPage';
import { SupplierDebtsPage } from './pages/SupplierDebtsPage';
import { SalariesPage } from './pages/SalariesPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { ImportExcelPage } from './pages/ImportExcelPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthLayout />}>
        <Route index element={<LoginPage />} />
      </Route>

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="orders">
          <Route index element={<OrdersPage />} />
          <Route path="new" element={<OrderCreatePage />} />
          <Route path=":id" element={<OrderDetailPage />} />
        </Route>
        <Route path="calculations" element={<CalculationsPage />} />
        <Route path="calculation-parameters" element={<CalculationParametersPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="production" element={<ProductionPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="debts" element={<DebtsPage />} />
        <Route path="customer-debts" element={<CustomerDebtsPage />} />
        <Route path="supplier-debts" element={<SupplierDebtsPage />} />
        <Route path="purchases" element={<PurchasesPage />} />
        <Route path="salaries" element={<SalariesPage />} />
        <Route path="materials" element={<MaterialsPage />} />
        <Route path="papers" element={<Navigate to="/materials" replace />} />
        <Route path="import-excel" element={<ImportExcelPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
