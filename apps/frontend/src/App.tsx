import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from './shared/layout/DashboardLayout';
import { MaterialsPage } from './pages/MaterialsPage';
import { CategoryParametersPage } from './pages/CategoryParametersPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/materials" replace />} />
        <Route path="materials" element={<MaterialsPage />} />
        <Route path="materials/category-parameters" element={<CategoryParametersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/materials" replace />} />
    </Routes>
  );
}
