import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Clock,
  GraduationCap,
  Layers,
  Plus,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { requestJson } from '../lib/api-client';
import { cleanDisplayText, formatScore, isNumericScore } from '../lib/display-format';
import {
  EmptyState,
  ErrorBanner,
  LoadingSkeleton,
  StatusBadge,
} from '../components/CommonUI';

export function OverviewView({ user, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await requestJson('/api/dashboard/overview');
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load overview data.');
      toast.error('Failed to load overview data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return <LoadingSkeleton rows={6} className="p-6" />;
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorBanner message={error} onRetry={fetchOverview} />
      </div>
    );
  }

  if (!data) return null;

  const isAdmin = data.role === 'admin';
  const summary = data.summary || {};

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isAdmin ? 'Admin Console Overview' : 'Lecturer Research Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? 'Real-time overview of canonical scenarios, categories, lecturers, and student practices.'
              : `Welcome back, ${user.name}. Track your connected student cohort and manage customized practice scenarios.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('scenarios', { action: 'create' })}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
          >
            <Plus className="size-4" />
            New Scenario
          </button>
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => onNavigate('categories', { action: 'create' })}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted font-semibold text-xs text-foreground transition-all cursor-pointer"
              >
                <Layers className="size-4 text-muted-foreground" />
                New Category
              </button>
              <button
                type="button"
                onClick={() => onNavigate('lecturers', { action: 'create' })}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted font-semibold text-xs text-foreground transition-all cursor-pointer"
              >
                <UserPlus className="size-4 text-muted-foreground" />
                Add Lecturer
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {isAdmin ? (
          <>
            <KpiCard
              label="Published Scenarios"
              value={summary.published_scenarios ?? 0}
              icon={BookOpen}
              color="emerald"
            />
            <KpiCard
              label="Drafts In Review"
              value={summary.drafts_awaiting_review ?? 0}
              icon={Clock}
              color="amber"
              highlight={summary.drafts_awaiting_review > 0}
            />
            <KpiCard
              label="Active Categories"
              value={summary.active_categories ?? 0}
              icon={Layers}
              color="blue"
            />
            <KpiCard
              label="Active Lecturers"
              value={summary.active_lecturers ?? 0}
              icon={Users}
              color="indigo"
            />
            <KpiCard
              label="Registered Students"
              value={summary.registered_students ?? 0}
              icon={GraduationCap}
              color="purple"
            />
            <KpiCard
              label="Practices Completed"
              value={summary.completed_practices ?? 0}
              icon={CheckCircle}
              color="cyan"
            />
          </>
        ) : (
          <>
            <KpiCard
              label="Connected Students"
              value={summary.connected_students ?? 0}
              icon={GraduationCap}
              color="purple"
            />
            <KpiCard
              label="Practices This Week"
              value={summary.practices_this_week ?? 0}
              icon={TrendingUp}
              color="emerald"
            />
            <KpiCard
              label="Cohort Avg Score"
              value={formatScore(
                summary.average_cohort_score ?? summary.average_overall_score,
                '0.0',
              )}
              icon={Activity}
              color="blue"
              suffix="/ 5.0"
            />
            <KpiCard
              label="My Draft Scenarios"
              value={summary.own_draft_scenarios ?? 0}
              icon={BookOpen}
              color="amber"
            />
          </>
        )}
      </div>

      {/* Admin Specific Sections */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Drafts Awaiting Review */}
          <div className="border border-border rounded-xl bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-foreground">Drafts Awaiting Review</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('scenarios', { filterStatus: 'draft' })}
                className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                View all <ArrowRight className="size-3" />
              </button>
            </div>

            {data.drafts_awaiting_review?.length > 0 ? (
              <div className="space-y-2">
                {data.drafts_awaiting_review.map((item) => (
                  <div
                    key={item.scenario_id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-background/50 hover:bg-muted/30 transition-all"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-semibold text-xs text-foreground truncate">{item.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        By {item.owner?.display_name || 'Lecturer'} • {item.scenario_id}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('scenarios', { action: 'detail', scenarioId: item.scenario_id })}
                      className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80 shrink-0"
                    >
                      Review
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle}
                title="All caught up"
                description="No draft scenarios currently awaiting review."
                className="py-8"
              />
            )}
          </div>

          {/* Recent Practice Sessions */}
          <div className="border border-border rounded-xl bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Recent Practice Activity</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('practice-results')}
                className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                View all <ArrowRight className="size-3" />
              </button>
            </div>

            {data.recent_sessions?.length > 0 ? (
              <div className="space-y-2">
                {data.recent_sessions.map((sess) => (
                  <div
                    key={sess.session_id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-background/50"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-semibold text-xs text-foreground truncate">{sess.student_name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {cleanDisplayText(sess.scenario_title, 'Speaking Practice')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-foreground">
                        {isNumericScore(sess.overall_score) ? `${formatScore(sess.overall_score)}/5` : '-'}
                      </span>
                      <StatusBadge status={sess.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Activity}
                title="No practice activity yet"
                description="Student practice records will appear here as they complete sessions."
                className="py-8"
              />
            )}
          </div>
        </div>
      )}

      {/* Lecturer Specific Sections */}
      {!isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Students Needing Attention */}
          <div className="border border-border rounded-xl bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-foreground">Students Needing Attention</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('students')}
                className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                View roster <ArrowRight className="size-3" />
              </button>
            </div>

            {data.students_needing_attention?.length > 0 ? (
              <div className="space-y-2">
                {data.students_needing_attention.map((st) => (
                  <div
                    key={st.student_id}
                    className="flex items-center justify-between p-3 rounded-lg border border-amber-500/20 bg-amber-500/5"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-semibold text-xs text-foreground">{st.name}</div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                        {st.reason || 'Low score in recent session'}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {isNumericScore(st.latest_score) ? `${formatScore(st.latest_score)}/5` : '-'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle}
                title="Cohort is performing well"
                description="No students currently flagged for low scores or incomplete sessions."
                className="py-8"
              />
            )}
          </div>

          {/* Lecturer Own Drafts */}
          <div className="border border-border rounded-xl bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">My Draft Scenarios</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('scenarios', { filterOwnership: 'mine' })}
                className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                View all <ArrowRight className="size-3" />
              </button>
            </div>

            {data.own_drafts?.length > 0 ? (
              <div className="space-y-2">
                {data.own_drafts.map((d) => (
                  <div
                    key={d.scenario_id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-background/50"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-semibold text-xs text-foreground truncate">{d.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{d.scenario_id}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('scenarios', { action: 'edit', scenarioId: d.scenario_id })}
                      className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80 shrink-0"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No active drafts"
                description="Create customized practice scenarios for your class."
                actionLabel="Create Scenario"
                onAction={() => onNavigate('scenarios', { action: 'create' })}
                className="py-8"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color = 'primary', suffix = '', highlight = false }) {
  const colorStyles = {
    emerald: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    blue: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
    indigo: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20',
    purple: 'text-purple-600 bg-purple-500/10 border-purple-500/20',
    cyan: 'text-cyan-600 bg-cyan-500/10 border-cyan-500/20',
  }[color] || 'text-primary bg-primary/10 border-primary/20';

  return (
    <div
      className={`p-4 rounded-xl border bg-card transition-all ${
        highlight ? 'border-amber-500 shadow-sm' : 'border-border'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider line-clamp-1">
          {label}
        </span>
        <div className={`p-1.5 rounded-lg border shrink-0 ${colorStyles}`}>
          <Icon className="size-3.5" />
        </div>
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{value}</span>
        {suffix && <span className="text-xs text-muted-foreground font-medium">{suffix}</span>}
      </div>
    </div>
  );
}
