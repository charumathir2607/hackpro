import { ReactNode } from 'react';
import { AlertTriangle, WifiOff } from 'lucide-react';

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const isNetwork = error.includes('Cannot reach') || error.includes('backend');

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
        {isNetwork ? (
          <WifiOff className="h-6 w-6 text-rose-400" />
        ) : (
          <AlertTriangle className="h-6 w-6 text-rose-400" />
        )}
      </div>
      <div>
        <p className="text-slate-200 font-semibold mb-1">
          {isNetwork ? 'Backend Unavailable' : 'Something went wrong'}
        </p>
        <p className="text-slate-500 text-sm max-w-md">{error}</p>
        {isNetwork && (
          <p className="text-slate-500 text-xs mt-2">
            Start the backend: <code className="font-mono text-cyan-accent/80">cd backend && python app.py</code>
          </p>
        )}
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary">
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, icon: Icon }: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-navy-700/60 flex items-center justify-center">
          <Icon className="h-5 w-5 text-slate-500" />
        </div>
      )}
      <div>
        <p className="text-slate-300 font-medium">{title}</p>
        {description && <p className="text-slate-500 text-sm mt-1">{description}</p>}
      </div>
    </div>
  );
}
