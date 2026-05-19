import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '@bestapp/ui';
import { useAuth } from '../shared/auth/auth-context';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@bestapp.local');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login({ email, password });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выполнить вход');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-200 bg-white/95 p-8 shadow-xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Вход в систему</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Панель типографии</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Используйте рабочий аккаунт, чтобы открыть dashboard, заказы, склад и финансы.
        </p>
      </div>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Email</label>
          <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@bestapp.local" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Пароль</label>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Входим...' : 'Войти'}
        </Button>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
          Дефолтный доступ: <span className="font-semibold text-slate-700">admin@bestapp.local / Admin123!</span>
        </div>
      </form>
    </Card>
  );
}

