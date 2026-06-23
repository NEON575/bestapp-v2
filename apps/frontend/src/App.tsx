import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from './shared/layout/DashboardLayout';
import { MaterialsPage } from './pages/MaterialsPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/materials" replace />} />
        <Route path="materials" element={<MaterialsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/materials" replace />} />
    </Routes>
  );
}

