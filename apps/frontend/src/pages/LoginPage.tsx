import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/auth/auth-context';
import { Button, Card, Input } from '@bestapp/ui';

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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login({ email, password });
      navigate('/');
    } catch (err) {
      setError('Login failed. Check credentials and backend availability.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-200/80 bg-white/95 p-8 shadow-soft">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Sign in</p>
        <h2 className="mt-2 text-3xl font-semibold">Access ERP dashboard</h2>
        <p className="mt-2 text-sm text-slate-500">
          Enter your credentials to continue into the production workspace.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </Card>
  );
}

