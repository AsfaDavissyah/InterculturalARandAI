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
import { Button } from '../components/ui/button';

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
    <div className="mx-auto w-full max-w-[1600px] space-y-7 px-4 py-6 sm:px-6 lg:px-8">
      {/* Welcome Banner & Quick Actions */}
      <div className="flex flex-col items-start justify-between gap-5 border-b border-border pb-6 xl:flex-row xl:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isAdmin ? 'Admin Console Overview' : 'Lecturer Research Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? 'Real-time overview of canonical scenarios, categories, lecturers, and student practices.'
              : `Welcome back, ${user.name}. Track your connected students and review their speaking practice progress.`}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
          {isAdmin && (
            <>
              <Button
                type="button"
                onClick={() => onNavigate('scenarios', { action: 'create' })}
              >
                <BookOpen className="size-4" />
                New Scenario
              </Button>
              <Button
                type="button"
                onClick={() => onNavigate('categories', { action: 'create' })}
                variant="outline"
              >
                <Layers className="size-4 text-muted-foreground" />
                New Category
              </Button>
              <Button
                type="button"
                onClick={() => onNavigate('lecturers', { action: 'create' })}
                variant="outline"
              >
                <UserPlus className="size-4 text-muted-foreground" />
                Add Lecturer
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        className={`grid grid-cols-2 gap-3 ${
          isAdmin ? 'md:grid-cols-3 xl:grid-cols-6' : 'lg:grid-cols-4'
        }`}
      >
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
              label="Cohort Practices"
              value={summary.total_practices ?? 0}
              icon={BookOpen}
              color="amber"
            />
          </>
        )}
      </div>

      {/* Admin Specific Sections */}
      {isAdmin && (
        <div className="grid grid-cols-1 gap-6">
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

          <RecentPracticePanel sessions={data.recent_sessions} onNavigate={onNavigate} />
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
                      <div className="font-semibold text-xs text-foreground">
                        {st.name || st.student_name || 'Student'}
                      </div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                        {st.reason || 'Low score in recent session'}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {isNumericScore(st.latest_score ?? st.overall_score)
                        ? `${formatScore(st.latest_score ?? st.overall_score)}/5`
                        : '-'}
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
          <RecentPracticePanel sessions={data.recent_sessions} onNavigate={onNavigate} />
        </div>
      )}
    </div>
  );
}

function RecentPracticePanel({ sessions = [], onNavigate }) {
  return (
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

      {sessions.length > 0 ? (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.session_id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/50 p-3"
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-foreground">
                  {session.student_name || 'Student'}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {cleanDisplayText(session.scenario_title, 'Speaking Practice')}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  {isNumericScore(session.overall_score) ? `${formatScore(session.overall_score)}/5` : '-'}
                </span>
                <StatusBadge status={session.status} />
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
  );
}

function KpiCard({ label, value, icon: Icon, color = 'primary', suffix = '', highlight = false }) {
  const colorStyles = {
    emerald: { icon: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20', value: 'text-emerald-700' },
    amber: { icon: 'text-amber-700 bg-amber-500/10 border-amber-500/20', value: 'text-amber-700' },
    blue: { icon: 'text-sky-700 bg-sky-500/10 border-sky-500/20', value: 'text-sky-700' },
    indigo: { icon: 'text-teal-700 bg-teal-500/10 border-teal-500/20', value: 'text-teal-700' },
    purple: { icon: 'text-rose-600 bg-rose-500/10 border-rose-500/20', value: 'text-rose-600' },
    cyan: { icon: 'text-cyan-700 bg-cyan-500/10 border-cyan-500/20', value: 'text-cyan-700' },
  }[color] || { icon: 'text-primary bg-primary/10 border-primary/20', value: 'text-primary' };

  return (
    <div
      className={`min-h-32 rounded-lg border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        highlight ? 'border-amber-500' : 'border-border'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="min-h-8 text-[11px] font-semibold leading-4 text-muted-foreground">
          {label}
        </span>
        <div className={`shrink-0 rounded-md border p-2 ${colorStyles.icon}`}>
          <Icon className="size-3.5" />
        </div>
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className={`text-3xl font-bold ${colorStyles.value}`}>{value}</span>
        {suffix && <span className="text-xs text-muted-foreground font-medium">{suffix}</span>}
      </div>
    </div>
  );
}
