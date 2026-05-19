import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { canAccess } from '../lib/access';

type ProtectedRouteProps = {
  children: ReactNode;
  roles?: string[];
};

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, isHydrated, session } = useAuth();

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Загружаем рабочее пространство...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !canAccess(session?.user.roles, roles)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-950">Нет доступа</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            У вашей роли нет прав для открытия этого раздела. Обратитесь к администратору, если доступ должен быть выдан.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

