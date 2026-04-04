import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Shield, Eye, EyeOff, Lock, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    void login(email, password).then((result) => {
      setLoading(false);
      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.error || 'Authentication failed.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Back link */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Overview
        </button>

        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/15 mb-4">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Insight-Guardian</h1>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Security Operations Console
          </p>
        </div>

        {/* Restricted Notice */}
        <div className="rounded-md bg-secondary/50 border border-border px-3 py-2.5 mb-6 flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <p className="text-[10px] font-mono text-muted-foreground">
            RESTRICTED — Authorized SOC personnel only
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
              Operator ID
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="operator@insightguardian.io"
              className="w-full h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
              Access Key
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 rounded-md border border-border bg-card px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-xs text-destructive font-mono">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Authenticating…' : 'Authenticate'}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="mt-8 rounded-lg border border-border bg-card/50 p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Demo Credentials</p>
          <div className="space-y-1.5">
            {[
              ['admin@insightguardian.io', 'admin123', 'Administrator'],
              ['analyst@insightguardian.io', 'analyst123', 'Analyst'],
            ].map(([e, p, r]) => (
              <button
                key={e}
                type="button"
                onClick={() => { setEmail(e); setPassword(p); setError(''); }}
                className="w-full text-left px-2 py-1 rounded hover:bg-secondary/50 transition-colors group"
              >
                <span className="text-xs font-mono text-foreground/80 group-hover:text-foreground">{e}</span>
                <span className="text-[10px] font-mono text-muted-foreground ml-2">/ {p}</span>
                <span className="text-[10px] font-mono text-primary ml-2">{r}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-1">
          <p className="text-[10px] font-mono text-muted-foreground/60">© {new Date().getFullYear()} Pranay Mishra</p>
          <p className="text-[10px] font-mono text-muted-foreground/40">Internal security software — not for public distribution</p>
        </div>
      </div>
    </div>
  );
}
