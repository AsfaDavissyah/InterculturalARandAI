import React, { useEffect, useState } from 'react';
import { Bot, Clock, Flag, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { requestJson } from '../lib/api-client';
import {
  ErrorBanner,
  LoadingSkeleton,
  StatusBadge,
} from '../components/CommonUI';

export function SystemSettingsView() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await requestJson('/api/dashboard/system-settings');
      setSettings(res);
    } catch (err) {
      setError(err.message || 'Failed to load system settings.');
      toast.error('Failed to load system settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) {
    return <LoadingSkeleton rows={6} className="p-6 max-w-5xl mx-auto" />;
  }

  if (error || !settings) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <ErrorBanner message={error || 'Settings unavailable.'} onRetry={fetchSettings} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">System Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Global Engora defaults, approved AI partners, rubric definitions, and platform feature flags.
        </p>
      </div>

      {/* Feature Flags Banner */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Flag className="size-4 text-primary" /> Active Platform Feature Flags
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
            <div>
              <div className="text-xs font-bold text-foreground">Modules Feature</div>
              <div className="text-[11px] text-muted-foreground">Printed Workbook Module Hierarchy</div>
            </div>
            <StatusBadge status={settings.feature_flags?.modules ? 'active' : 'inactive'} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
            <div>
              <div className="text-xs font-bold text-foreground">QR Launch Feature</div>
              <div className="text-[11px] text-muted-foreground">One-time scannable QR tokens</div>
            </div>
            <StatusBadge status={settings.feature_flags?.qr ? 'active' : 'inactive'} />
          </div>
        </div>
      </div>

      {/* Approved AI Conversation Partners */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Bot className="size-4 text-indigo-500" /> Approved AI Conversation Partners
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {settings.approved_ai_partners?.map((p) => (
            <div key={p.profile_id} className="p-3.5 rounded-xl border border-border bg-background space-y-1.5">
              <div className="font-bold text-xs text-foreground">{p.display_name}</div>
              <div className="text-[11px] text-muted-foreground">Role: <strong className="text-foreground">{p.role}</strong></div>
              <div className="text-[11px] text-muted-foreground">Culture: <strong className="text-foreground">{p.culture || 'International'}</strong></div>
              <div className="text-[10px] text-muted-foreground font-mono mt-1">
                Profile ID: {p.profile_id} • Voice: {p.voice_profile || 'female'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Default Session Rules & Rubric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Default Session Rules */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Clock className="size-4 text-emerald-500" /> Default Session Rules
          </h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Target Duration</span>
              <span className="font-semibold text-foreground">{settings.default_session_rules?.target_duration_minutes || 5} minutes</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Minimum Student Responses</span>
              <span className="font-semibold text-foreground">{settings.default_session_rules?.minimum_student_responses || 5} responses</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Target Response Range</span>
              <span className="font-semibold text-foreground">
                {settings.default_session_rules?.target_student_responses_min || 6} - {settings.default_session_rules?.target_student_responses_max || 8}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Maximum Responses</span>
              <span className="font-semibold text-foreground">{settings.default_session_rules?.maximum_student_responses || 10} responses</span>
            </div>
          </div>
        </div>

        {/* Standard Assessment Criteria */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> Standard Assessment Rubric
          </h2>
          <div className="space-y-2 text-xs">
            {settings.default_criteria?.map((c) => (
              <div key={c.criterion} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                <span className="font-medium text-foreground capitalize">{c.criterion.replace(/_/g, ' ')}</span>
                <span className="text-[11px] text-muted-foreground font-semibold">Weight: {c.weight || 5}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
