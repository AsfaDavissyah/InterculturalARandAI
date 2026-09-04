import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Save,
  Send,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { requestJson } from '../lib/api-client';
import {
  ConfirmModal,
  LoadingSkeleton,
} from '../components/CommonUI';

const APPROVED_PARTNERS = [
  {
    profile_id: 'emma-lecturer',
    display_name: 'Dr Emma Collins',
    role: 'Foreign Lecturer',
    culture: 'United Kingdom',
    avatar_key: 'female_lecturer_v1',
    voice_profile: 'female',
    desc: 'Supportive, academic, formal yet approachable UK lecturer.',
  },
  {
    profile_id: 'sarah-waitress',
    display_name: 'Sarah Bennett',
    role: 'Restaurant Server',
    culture: 'United Kingdom',
    avatar_key: 'female_server_v1',
    voice_profile: 'female',
    desc: 'Courteous, hospitable London dining server.',
  },
  {
    profile_id: 'olivia-barista',
    display_name: 'Olivia Reed',
    role: 'Cafe Barista',
    culture: 'Australia',
    avatar_key: 'female_barista_v1',
    voice_profile: 'female',
    desc: 'Friendly, casual, vibrant Melbourne cafe barista.',
  },
  {
    profile_id: 'michael-hr',
    display_name: 'Michael Harris',
    role: 'HR Interviewer',
    culture: 'United States',
    avatar_key: 'male_hr_v1',
    voice_profile: 'male',
    desc: 'Professional, structured career interviewer.',
  },
  {
    profile_id: 'david-student',
    display_name: 'David',
    role: 'International Exchange Student',
    culture: 'Australia',
    avatar_key: 'male_student_v1',
    voice_profile: 'male',
    desc: 'Casual, peer-level friendly exchange student.',
  },
  {
    profile_id: 'raka-student',
    display_name: 'Raka Pratama',
    role: 'University Student',
    culture: 'Indonesia',
    avatar_key: 'male_student_v1',
    voice_profile: 'male',
    desc: 'Respectful Indonesian peer for local intercultural situations.',
  },
  {
    profile_id: 'daniel-lecturer',
    display_name: 'Dr Daniel Moore',
    role: 'Foreign Lecturer',
    culture: 'United Kingdom',
    avatar_key: 'male_lecturer_v1',
    voice_profile: 'male',
    desc: 'Supportive lecturer for academic Scenario Library practices.',
  },
];

export function ScenarioEditorView({ scenarioId, user, onBack, onSaved }) {
  const isEditMode = Boolean(scenarioId);
  const isAdmin = user.role === 'admin';

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: '',
    placements: ['guided_topics'],
    category_ids: ['academic-communication'],
    briefing: '',
    student_role: 'International student',
    ai_partner: APPROVED_PARTNERS[0],
    student_task: '',
    practice_location: '',
    level: 'B1',
    session_rules: {
      target_duration_minutes: 5,
      minimum_student_responses: 5,
      target_student_responses_min: 6,
      target_student_responses_max: 8,
      maximum_student_responses: 10,
    },
    advanced: {
      learning_goal: '',
      ai_prompt_override: '',
    },
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    async function init() {
      try {
        const catRes = await requestJson('/api/dashboard/categories');
        setCategories(catRes || []);

        if (isEditMode) {
          const scn = await requestJson(`/api/dashboard/scenarios/${scenarioId}`);
          setForm({
            title: scn.title || '',
            placements: scn.placements?.length ? scn.placements : ['guided_topics'],
            category_ids: scn.category_ids?.length ? scn.category_ids : ['academic-communication'],
            briefing: scn.briefing || '',
            student_role: scn.student_role || '',
            ai_partner: scn.ai_partner?.profile_id
              ? APPROVED_PARTNERS.find((p) => p.profile_id === scn.ai_partner.profile_id) || scn.ai_partner
              : APPROVED_PARTNERS[0],
            student_task: scn.student_task || '',
            practice_location: scn.practice_location || '',
            level: scn.level || 'B1',
            session_rules: scn.session_rules || {
              target_duration_minutes: 5,
              minimum_student_responses: 5,
              target_student_responses_min: 6,
              target_student_responses_max: 8,
              maximum_student_responses: 10,
            },
            advanced: {
              learning_goal: scn.advanced?.learning_goal || '',
              ai_prompt_override: scn.advanced?.ai_prompt_override || '',
            },
          });
        }
      } catch (err) {
        toast.error(err.message || 'Failed to initialize editor.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [scenarioId, isEditMode]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const togglePlacement = (placementKey) => {
    let next;
    if (form.placements.includes(placementKey)) {
      if (form.placements.length === 1) {
        toast.error('At least one placement must remain selected.');
        return;
      }
      next = form.placements.filter((p) => p !== placementKey);
    } else {
      next = [...form.placements, placementKey];
    }
    updateField('placements', next);
  };

  const validate = ({ release = false } = {}) => {
    const errs = {};
    if (!form.title.trim() || form.title.trim().length < 3 || form.title.trim().length > 100) {
      errs.title = 'Title must be between 3 and 100 characters.';
    }
    if (release && !form.placements.length) {
      errs.placements = 'Select at least one placement location.';
    }
    if (release && form.placements.includes('guided_topics') && !form.category_ids.length) {
      errs.category_ids = 'Please select a Category for Guided Topics placement.';
    }
    if (release && (!form.briefing.trim() || form.briefing.trim().length < 20 || form.briefing.trim().length > 500)) {
      errs.briefing = 'Practice Briefing must be between 20 and 500 characters.';
    }
    if (release && (!form.student_role.trim() || form.student_role.trim().length < 5 || form.student_role.trim().length > 240)) {
      errs.student_role = 'Student Role is required (5-240 characters).';
    }
    if (release && (!form.student_task.trim() || form.student_task.trim().length < 20 || form.student_task.trim().length > 500)) {
      errs.student_task = 'Student Task instruction must be between 20 and 500 characters.';
    }
    if (release && (!form.practice_location.trim() || form.practice_location.trim().length < 2 || form.practice_location.trim().length > 120)) {
      errs.practice_location = 'Practice Location is required (2-120 characters).';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (submitOrPublishAction = null) => {
    const isRelease = submitOrPublishAction === 'publish' || submitOrPublishAction === 'submit';
    if (!validate({ release: isRelease })) {
      toast.error(isRelease
        ? 'Complete the required details before submitting or publishing.'
        : 'Add a title before saving this Draft.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        placements: form.placements,
        category_ids: form.placements.includes('guided_topics') ? form.category_ids : [],
        briefing: form.briefing.trim(),
        student_role: form.student_role.trim(),
        ai_partner: {
          profile_id: form.ai_partner.profile_id,
          display_name: form.ai_partner.display_name,
          role: form.ai_partner.role,
          culture: form.ai_partner.culture,
          avatar_key: form.ai_partner.avatar_key,
          voice_profile: form.ai_partner.voice_profile,
        },
        student_task: form.student_task.trim(),
        practice_location: form.practice_location.trim(),
        level: form.level,
        session_rules: form.session_rules,
        advanced: {
          ...(form.advanced?.learning_goal ? { learning_goal: form.advanced.learning_goal } : {}),
          ...(form.advanced?.ai_prompt_override ? { ai_prompt_override: form.advanced.ai_prompt_override } : {}),
        },
      };

      let savedScenario;
      if (isEditMode) {
        savedScenario = await requestJson(`/api/dashboard/scenarios/${scenarioId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Scenario changes saved successfully.');
      } else {
        savedScenario = await requestJson('/api/dashboard/scenarios', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Draft scenario created successfully.');
      }

      // Handle follow up action if requested (Publish / Submit)
      const targetId = savedScenario.scenario_id || scenarioId;
      if (submitOrPublishAction === 'publish' && isAdmin) {
        await requestJson(`/api/dashboard/scenarios/${targetId}/publish`, { method: 'POST' });
        toast.success('Scenario published!');
      } else if (submitOrPublishAction === 'submit' && !isAdmin) {
        await requestJson(`/api/dashboard/scenarios/${targetId}/submit`, { method: 'POST' });
        toast.success('Scenario submitted for Admin review.');
      }

      setIsDirty(false);
      if (onSaved) {
        onSaved(targetId);
      } else {
        onBack();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save scenario.');
    } finally {
      setSaving(false);
    }
  };

  const handleBackClick = () => {
    if (isDirty) {
      setShowExitModal(true);
    } else {
      onBack();
    }
  };

  if (loading) {
    return <LoadingSkeleton rows={10} className="p-6 max-w-4xl mx-auto" />;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackClick}
            className="p-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all cursor-pointer"
            title="Cancel"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {isEditMode ? 'Edit Scenario' : 'Create New Scenario'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Fill in the scenario briefing, roles, and AI partner. Advanced AI prompts and boundaries are generated automatically.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(null)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted font-semibold text-xs text-foreground transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="size-3.5 text-muted-foreground" />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          {isAdmin ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('publish')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-xs shadow-xs hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="size-3.5" />
              {saving ? 'Publishing...' : 'Save & Publish'}
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('submit')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="size-3.5" />
              {saving ? 'Submitting...' : 'Submit for Review'}
            </button>
          )}
        </div>
      </div>

      {/* Form Fields Card */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground">
            Scenario Title <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="e.g. Asking for an Assignment Extension"
            className={`w-full px-3.5 py-2.5 rounded-lg border text-sm bg-background text-foreground transition-colors ${
              errors.title ? 'border-destructive focus:ring-destructive' : 'border-border focus:border-primary'
            }`}
          />
          {errors.title ? (
            <p className="text-xs text-destructive">{errors.title}</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">Clear, recognizable title shown to learners (3-100 characters).</p>
          )}
        </div>

        {/* Placements & Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-lg bg-muted/30 border border-border/70">
          {/* Placements */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              Where will this appear? <span className="text-destructive">*</span>
            </label>
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={form.placements.includes('guided_topics')}
                  onChange={() => togglePlacement('guided_topics')}
                  className="size-4 rounded border-border text-primary focus:ring-primary"
                />
                <span>Guided Topics (Structured 3D/AR Practice)</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={form.placements.includes('scenario_library')}
                  onChange={() => togglePlacement('scenario_library')}
                  className="size-4 rounded border-border text-primary focus:ring-primary"
                />
                <span>Scenario Library (Open Roleplay Catalog)</span>
              </label>
            </div>
            {errors.placements && <p className="text-xs text-destructive">{errors.placements}</p>}
          </div>

          {/* Category Selector (if Guided Topics) */}
          {form.placements.includes('guided_topics') && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                Category <span className="text-destructive">*</span>
              </label>
              <select
                value={form.category_ids[0] || 'academic-communication'}
                onChange={(e) => updateField('category_ids', [e.target.value])}
                className="w-full px-3 py-2 rounded-lg border border-border text-xs bg-background text-foreground font-medium"
              >
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">Assigns the topic category in Guided Practice.</p>
            </div>
          )}
        </div>

        {/* Practice Briefing */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground">
            Practice Briefing <span className="text-destructive">*</span>
          </label>
          <textarea
            rows={3}
            value={form.briefing}
            onChange={(e) => updateField('briefing', e.target.value)}
            placeholder="Describe the context: who you are, what the setting is, and the communication context..."
            className={`w-full px-3.5 py-2.5 rounded-lg border text-sm bg-background text-foreground transition-colors ${
              errors.briefing ? 'border-destructive' : 'border-border'
            }`}
          />
          {errors.briefing ? (
            <p className="text-xs text-destructive">{errors.briefing}</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Visible to student before starting (20-500 characters). Length: {form.briefing.length}/500
            </p>
          )}
        </div>

        {/* Student Task */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground">
            Student Task Instruction <span className="text-destructive">*</span>
          </label>
          <textarea
            rows={2}
            value={form.student_task}
            onChange={(e) => updateField('student_task', e.target.value)}
            placeholder="State exactly what the learner is expected to achieve in this conversation..."
            className={`w-full px-3.5 py-2.5 rounded-lg border text-sm bg-background text-foreground transition-colors ${
              errors.student_task ? 'border-destructive' : 'border-border'
            }`}
          />
          {errors.student_task ? (
            <p className="text-xs text-destructive">{errors.student_task}</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Clear learning instructions for student (20-500 characters).
            </p>
          )}
        </div>

        {/* Student Role & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              Student Role <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.student_role}
              onChange={(e) => updateField('student_role', e.target.value)}
              placeholder="e.g. Postgraduate student"
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm bg-background text-foreground ${
                errors.student_role ? 'border-destructive' : 'border-border'
              }`}
            />
            {errors.student_role && <p className="text-xs text-destructive">{errors.student_role}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              Practice Location <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.practice_location}
              onChange={(e) => updateField('practice_location', e.target.value)}
              placeholder="e.g. Lecturer's Office, Building B"
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm bg-background text-foreground ${
                errors.practice_location ? 'border-destructive' : 'border-border'
              }`}
            />
            {errors.practice_location && <p className="text-xs text-destructive">{errors.practice_location}</p>}
          </div>
        </div>

        {/* AI Conversation Partner Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Bot className="size-4 text-indigo-500" /> Choose AI Conversation Partner <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {APPROVED_PARTNERS.map((partner) => {
              const isSelected = form.ai_partner?.profile_id === partner.profile_id;
              return (
                <div
                  key={partner.profile_id}
                  onClick={() => updateField('ai_partner', partner)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        {partner.display_name}
                        {isSelected && <Check className="size-3.5 text-primary" />}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{partner.role}</div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{partner.culture}</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{partner.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Collapsible Advanced AI Settings for Admin */}
        {isAdmin && (
          <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Advanced AI Customization (Optional)
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Deterministic stages, rules, and rubric are automatically generated unless overridden here.
                  </div>
                </div>
              </div>
              {advancedOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
            </button>

            {advancedOpen && (
              <div className="p-4.5 space-y-4 border-t border-border bg-background">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Specific Learning Goal Override</label>
                  <input
                    type="text"
                    value={form.advanced?.learning_goal || ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        advanced: { ...prev.advanced, learning_goal: e.target.value },
                      }))
                    }
                    placeholder="Leave blank to use default generated goal"
                    className="w-full px-3 py-2 rounded-lg border border-border text-xs bg-background text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Custom AI System Prompt Override</label>
                  <textarea
                    rows={4}
                    value={form.advanced?.ai_prompt_override || ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        advanced: { ...prev.advanced, ai_prompt_override: e.target.value },
                      }))
                    }
                    placeholder="Leave empty to use Engora Tone Engine deterministic character system prompts..."
                    className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono bg-background text-foreground"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    When provided, this replaces the auto-generated persona prompt during OpenAI turns.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation on Exit with Unsaved Changes */}
      <ConfirmModal
        isOpen={showExitModal}
        title="Unsaved Changes"
        description="You have unsaved changes in this scenario. Are you sure you want to discard them?"
        confirmLabel="Discard & Leave"
        cancelLabel="Keep Editing"
        isDestructive={true}
        onConfirm={() => {
          setShowExitModal(false);
          onBack();
        }}
        onCancel={() => setShowExitModal(false)}
      />
    </div>
  );
}
