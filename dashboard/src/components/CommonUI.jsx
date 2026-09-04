import React from 'react';
import { AlertCircle, Check, Copy, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { formatStatusLabel } from '../lib/display-format';

export function LoadingSkeleton({ rows = 5, className = '' }) {
  return (
    <div className={`space-y-3 animate-pulse ${className}`} data-testid="loading-skeleton">
      <div className="h-8 bg-muted rounded-md w-1/3" />
      <div className="h-4 bg-muted/70 rounded-md w-2/3" />
      <div className="space-y-2 pt-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 bg-muted/50 rounded-lg w-full" />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Search,
  title = 'No items found',
  description = 'Try adjusting your filters or search query.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center border border-dashed border-border bg-card/50 p-6 text-center sm:p-10 ${className}`}>
      <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground shadow-sm">
        <Icon className="size-7" />
      </div>
      <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
      <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mt-1.5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorBanner({ message = 'An unexpected error occurred.', onRetry, className = '' }) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm ${className}`}>
      <div className="flex items-center gap-3">
        <AlertCircle className="size-5 shrink-0" />
        <span className="font-medium text-xs sm:text-sm">{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-destructive/15 hover:bg-destructive/25 text-destructive transition-all shrink-0"
        >
          <RefreshCw className="size-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}

export function StatusBadge({ status }) {
  const normalized = String(status || '').trim().toLowerCase();
  const config = {
    published: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    draft: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    in_review: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
    inactive: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
    archived: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    completed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    ended_manually: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
    abandoned: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    in_progress: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  }[normalized] || 'bg-muted text-muted-foreground border-border';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${config} select-none`}>
      {formatStatusLabel(status)}
    </span>
  );
}

export function CopyableCode({ code, label = 'Copy' }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="inline-flex items-center gap-1.5 bg-muted/60 border border-border/80 px-2.5 py-1 rounded-md font-mono text-xs font-semibold text-foreground">
      <span>{code}</span>
      <button
        type="button"
        onClick={handleCopy}
        title={label}
        className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
      >
        {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}

export function ConfirmModal({
  isOpen,
  title = 'Confirm Action',
  description = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
  children,
  confirmDisabled = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border shadow-xl rounded-2xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-start gap-3">
          {isDestructive && (
            <div className="size-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
              <ShieldAlert className="size-5" />
            </div>
          )}
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>
        </div>
        {children}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isDestructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
