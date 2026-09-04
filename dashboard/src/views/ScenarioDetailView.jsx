import React, { useEffect, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  BookOpen,
  Bot,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit3,
  Layers,
  RotateCcw,
  Send,
  Sparkles,
  Target,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { requestJson } from '../lib/api-client';
import {
  ConfirmModal,
  ErrorBanner,
  LoadingSkeleton,
  StatusBadge,
} from '../components/CommonUI';

export function ScenarioDetailView({ scenarioId, user, onBack, onEdit, onRefreshList }) {
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [reviewComment, setReviewComment] = useState('');

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await requestJson(`/api/dashboard/scenarios/${scenarioId}`);
      setScenario(res);
    } catch (err) {
      setError(err.message || 'Failed to load scenario details.');
      toast.error('Failed to load scenario details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (scenarioId) fetchDetail();
  }, [scenarioId]);

  const handleAction = async (actionType) => {
    try {
      let res;
      if (actionType === 'publish') {
        res = await requestJson(`/api/dashboard/scenarios/${scenarioId}/publish`, { method: 'POST' });
        toast.success('Scenario published successfully!');
      } else if (actionType === 'submit') {
        res = await requestJson(`/api/dashboard/scenarios/${scenarioId}/submit`, { method: 'POST' });
        toast.success('Scenario submitted for review.');
      } else if (actionType === 'request-changes') {
        res = await requestJson(`/api/dashboard/scenarios/${scenarioId}/request-changes`, {
          method: 'POST',
          body: JSON.stringify({ comment: reviewComment.trim() }),
        });
        toast.success('Scenario returned to Draft with review notes.');
      } else if (actionType === 'deactivate') {
        res = await requestJson(`/api/dashboard/scenarios/${scenarioId}/deactivate`, { method: 'POST' });
        toast.success('Scenario marked inactive.');
      } else if (actionType === 'archive') {
        res = await requestJson(`/api/dashboard/scenarios/${scenarioId}/archive`, { method: 'POST' });
        toast.success('Scenario archived.');
      } else if (actionType === 'restore') {
        res = await requestJson(`/api/dashboard/scenarios/${scenarioId}/restore`, { method: 'POST' });
        toast.success('Scenario restored.');
      } else if (actionType === 'duplicate') {
        res = await requestJson(`/api/dashboard/scenarios/${scenarioId}/duplicate`, { method: 'POST' });
        toast.success('Scenario duplicated as Draft!');
        if (onEdit && res.scenario_id) {
          onEdit(res.scenario_id);
          return;
        }
      }
      setActionModal(null);
      setReviewComment('');
      fetchDetail();
      if (onRefreshList) onRefreshList();
    } catch (err) {
      toast.error(err.message || 'Action failed.');
    }
  };

  if (loading) {
    return <LoadingSkeleton rows={8} className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8" />;
  }

  if (error || !scenario) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to Scenarios
        </button>
        <ErrorBanner message={error || 'Scenario not found.'} onRetry={fetchDetail} />
      </div>
    );
  }

  const isAdmin = user.role === 'admin';
  const isOwner = String(scenario.owner?.user_id) === String(user.userId);
  const canEdit = isAdmin || (isOwner && scenario.status === 'draft');

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Top Navigation & Status Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all cursor-pointer"
            title="Back to Scenarios"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {scenario.title}
              </h1>
              <StatusBadge status={scenario.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              ID: {scenario.scenario_id} • Version {scenario.version || 1} • Owner:{' '}
              {scenario.owner?.display_name || 'System Admin'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit(scenario.scenario_id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
            >
              <Edit3 className="size-3.5" />
              Edit Scenario
            </button>
          )}

          <button
            type="button"
            onClick={() => handleAction('duplicate')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-background hover:bg-muted font-semibold text-xs text-foreground transition-all cursor-pointer"
          >
            <Copy className="size-3.5 text-muted-foreground" />
            Duplicate
          </button>

          {/* Role specific lifecycle buttons */}
          {!isAdmin && scenario.status === 'draft' && isOwner && (
            <button
              type="button"
              onClick={() => setActionModal({ type: 'submit', title: 'Submit for Review', desc: 'Submit this scenario for Admin review and publishing.' })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-white font-semibold text-xs shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
            >
              <Send className="size-3.5" />
              Submit for Review
            </button>
          )}

          {isAdmin && scenario.status !== 'published' && scenario.status !== 'archived' && (
            <button
              type="button"
              onClick={() => setActionModal({ type: 'publish', title: 'Publish Scenario', desc: 'Publish this canonical scenario to make it available to mobile learners.' })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-xs shadow-xs hover:bg-emerald-700 transition-all cursor-pointer"
            >
              <CheckCircle className="size-3.5" />
              Publish
            </button>
          )}

          {isAdmin && scenario.status === 'in_review' && (
            <button
              type="button"
              onClick={() => {
                setReviewComment('');
                setActionModal({
                  type: 'request-changes',
                  title: 'Request Changes',
                  desc: 'Explain what the Lecturer needs to revise. The scenario will return to Draft.',
                });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-amber-500/40 text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 font-semibold text-xs transition-all cursor-pointer"
            >
              Request Changes
            </button>
          )}

          {isAdmin && scenario.status === 'published' && (
            <button
              type="button"
              onClick={() => setActionModal({ type: 'deactivate', title: 'Mark Inactive', desc: 'Deactivating this scenario will hide it from mobile learners without deleting history.' })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-background hover:bg-muted font-semibold text-xs text-foreground transition-all cursor-pointer"
            >
              Deactivate
            </button>
          )}

          {isAdmin && scenario.status !== 'archived' && (
            <button
              type="button"
              onClick={() => setActionModal({ type: 'archive', title: 'Archive Scenario', desc: 'Archive this scenario. It can be restored at any time.', isDestructive: true })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 font-semibold text-xs transition-all cursor-pointer"
            >
              <Archive className="size-3.5" />
              Archive
            </button>
          )}

          {isAdmin && scenario.status === 'archived' && (
            <button
              type="button"
              onClick={() => setActionModal({ type: 'restore', title: 'Restore Scenario', desc: 'Restore this scenario back to Draft state.' })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-500/30 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 font-semibold text-xs transition-all cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              Restore
            </button>
          )}
        </div>
      </div>

      {/* Main Content: 2 Column Layout (Left: Structured Cards, Right: Compact Metadata) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Practice Briefing */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <BookOpen className="size-4 text-primary" /> Practice Briefing
            </h2>
            <p className="text-sm sm:text-base text-foreground font-medium leading-relaxed">
              {scenario.briefing}
            </p>
          </div>

          {/* Student Task */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Target className="size-4 text-emerald-500" /> Student Task Instruction
            </h2>
            <p className="text-sm text-foreground leading-relaxed font-normal bg-muted/40 p-3.5 rounded-lg border border-border/60">
              {scenario.student_task}
            </p>
          </div>

          {/* AI Partner & Roles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Bot className="size-4 text-indigo-500" /> AI Conversation Partner
              </h2>
              <div className="space-y-1.5">
                <div className="text-base font-bold text-foreground">
                  {scenario.ai_partner?.display_name || 'AI Character'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Role: <span className="text-foreground font-medium">{scenario.ai_partner?.role}</span>
                </div>
                {scenario.ai_partner?.culture && (
                  <div className="text-xs text-muted-foreground">
                    Culture: <span className="text-foreground font-medium">{scenario.ai_partner?.culture}</span>
                  </div>
                )}
                <div className="text-[11px] text-muted-foreground font-mono mt-2">
                  Voice: {scenario.ai_partner?.voice_profile || 'female'} • Profile: {scenario.ai_partner?.profile_id}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <User className="size-4 text-blue-500" /> Student Role
              </h2>
              <div className="space-y-1.5">
                <div className="text-base font-bold text-foreground">
                  {scenario.student_role}
                </div>
                <div className="text-xs text-muted-foreground">
                  Practice Location:{' '}
                  <span className="text-foreground font-medium">{scenario.practice_location}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Difficulty Level:{' '}
                  <span className="text-foreground font-medium">{scenario.level || 'B1'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced AI Settings Accordion (Admin Only or Read-Only for Lecturer) */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="w-full flex items-center justify-between p-4.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="size-4 text-primary" />
                <div>
                  <div className="text-sm font-semibold text-foreground">Advanced AI Settings & Rubric</div>
                  <div className="text-xs text-muted-foreground">
                    Deterministic stages, boundaries, cues, and scoring criteria
                  </div>
                </div>
              </div>
              {advancedOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
            </button>

            {advancedOpen && (
              <div className="p-5 space-y-5 border-t border-border bg-background/50 text-xs">
                {/* Learning Goal */}
                {scenario.advanced?.learning_goal && (
                  <div>
                    <span className="font-semibold text-foreground">Learning Goal:</span>
                    <p className="text-muted-foreground mt-0.5">{scenario.advanced.learning_goal}</p>
                  </div>
                )}

                {/* Conversation Stages */}
                {scenario.advanced?.conversation_stages?.length > 0 && (
                  <div>
                    <span className="font-semibold text-foreground">Conversation Stages:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {scenario.advanced.conversation_stages.map((stage, i) => (
                        <div key={i} className="p-2.5 rounded-lg border border-border/70 bg-card">
                          <div className="font-semibold text-foreground capitalize">
                            {stage.stage_id?.replace(/_/g, ' ') || `Stage ${i + 1}`}
                          </div>
                          <p className="text-muted-foreground mt-0.5 line-clamp-2">{stage.goal}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Constraints & Boundaries */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {scenario.advanced?.constraints?.length > 0 && (
                    <div className="p-3 rounded-lg border border-border/70 bg-card">
                      <span className="font-semibold text-foreground">Constraints:</span>
                      <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-0.5">
                        {scenario.advanced.constraints.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {scenario.advanced?.role_boundaries && (
                    <div className="p-3 rounded-lg border border-border/70 bg-card">
                      <span className="font-semibold text-foreground">Role Boundaries:</span>
                      <p className="text-muted-foreground mt-1">{scenario.advanced.role_boundaries}</p>
                    </div>
                  )}
                </div>

                {/* Rubric Criteria */}
                {scenario.advanced?.assessment_criteria?.length > 0 && (
                  <div>
                    <span className="font-semibold text-foreground">Assessment Rubric:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {scenario.advanced.assessment_criteria.map((cr, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-muted text-foreground border border-border font-medium">
                          {cr.criterion?.replace(/_/g, ' ')} (Weight: {cr.weight || 5})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prompt Override if any */}
                {scenario.advanced?.ai_prompt_override && (
                  <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
                    <span className="font-semibold text-amber-700 dark:text-amber-400">Custom AI System Prompt Override:</span>
                    <pre className="text-[11px] text-foreground mt-1 whitespace-pre-wrap font-mono">
                      {scenario.advanced.ai_prompt_override}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Compact Metadata */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Placement & Categories
            </h3>

            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Appears In:</div>
              <div className="flex flex-wrap gap-1.5">
                {scenario.placements?.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                  >
                    <Layers className="size-3" />
                    {p === 'guided_topics' ? 'Guided Topics' : 'Scenario Library'}
                  </span>
                ))}
              </div>
            </div>

            {scenario.category_ids?.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">Categories:</div>
                <div className="flex flex-wrap gap-1.5">
                  {scenario.category_ids.map((cat) => (
                    <span
                      key={cat}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground border border-border"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-3 text-xs">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Session Rules
            </h3>

            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Target Duration</span>
              <span className="font-semibold text-foreground">{scenario.session_rules?.target_duration_minutes || 5} mins</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Min Responses</span>
              <span className="font-semibold text-foreground">{scenario.session_rules?.minimum_student_responses || 5}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Target Range</span>
              <span className="font-semibold text-foreground">
                {scenario.session_rules?.target_student_responses_min || 6} - {scenario.session_rules?.target_student_responses_max || 8}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Max Responses</span>
              <span className="font-semibold text-foreground">{scenario.session_rules?.maximum_student_responses || 10}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(actionModal)}
        title={actionModal?.title}
        description={actionModal?.desc}
        confirmLabel={actionModal?.title}
        isDestructive={actionModal?.isDestructive}
        onConfirm={() => handleAction(actionModal?.type)}
        onCancel={() => {
          setActionModal(null);
          setReviewComment('');
        }}
        confirmDisabled={actionModal?.type === 'request-changes' && reviewComment.trim().length < 3}
      >
        {actionModal?.type === 'request-changes' && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground" htmlFor="review-comment">Review notes</label>
            <textarea
              id="review-comment"
              rows={4}
              maxLength={500}
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Describe the required changes..."
            />
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
