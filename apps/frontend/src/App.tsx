import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from './shared/layout/DashboardLayout';
import { MaterialsPage } from './pages/MaterialsPage';
import { CustomersPage } from './pages/CustomersPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { CategoryParametersPage } from './pages/CategoryParametersPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { WarehousePage } from './pages/WarehousePage';
import { CalculationsPage } from './pages/CalculationsPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/materials" replace />} />
        <Route path="materials" element={<MaterialsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="purchases" element={<PurchasesPage />} />
        <Route path="warehouse" element={<WarehousePage />} />
        <Route path="calculations" element={<CalculationsPage />} />
        <Route path="material-category-parameters" element={<CategoryParametersPage />} />
        <Route path="materials/category-parameters" element={<Navigate to="/material-category-parameters" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/materials" replace />} />
    </Routes>
  );
}
