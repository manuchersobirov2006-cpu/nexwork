import { ReactNode, ButtonHTMLAttributes } from 'react';
import { Loader2, X } from 'lucide-react';

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function Button({ children, loading, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button {...props} disabled={disabled || loading}>
      {loading && <Spinner className="w-4 h-4" />}
      {children}
    </button>
  );
}

export function Modal({ open, onClose, children, title, size = 'md' }: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} card max-h-[90vh] overflow-hidden flex flex-col animate-scale-in`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
            <button onClick={onClose} className="btn-ghost !p-1.5">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto scrollbar-thin flex-1">{children}</div>
      </div>
    </div>
  );
}

export function Badge({ children, color = 'slate', className = '' }: {
  children: ReactNode;
  color?: 'slate' | 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'cyan';
  className?: string;
}) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    blue: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
    green: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
    amber: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
    red: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    cyan: 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300',
  };
  return <span className={`badge ${colors[color]} ${className}`}>{children}</span>;
}

export function Avatar({ src, name, size = 40, className = '' }: {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
}) {
  const initials = (name || 'U').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  if (src) {
    return <img src={src} alt={name} width={size} height={size} className={`rounded-full object-cover ${className}`} style={{ width: size, height: size }} />;
  }
  return (
    <div
      className={`rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20" fill={i <= Math.round(rating) ? '#f59e0b' : 'none'} stroke={i <= Math.round(rating) ? '#f59e0b' : '#cbd5e1'} strokeWidth="1.5">
          <path d="M10 1l2.6 5.3 5.9.9-4.3 4.2 1 5.9L10 14.8l-5.2 2.7 1-5.9L1.5 7.2l5.9-.9L10 1z" />
        </svg>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-5">
      <div className="skeleton h-40 mb-4 rounded-xl" />
      <div className="skeleton h-4 w-3/4 mb-2" />
      <div className="skeleton h-4 w-1/2 mb-4" />
      <div className="flex gap-2">
        <div className="skeleton h-8 w-20" />
        <div className="skeleton h-8 w-20" />
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
      {label && <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>}
    </label>
  );
}

export function Tooltip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="relative group inline-flex">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-slate-900 dark:bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
        {label}
      </div>
    </div>
  );
}
