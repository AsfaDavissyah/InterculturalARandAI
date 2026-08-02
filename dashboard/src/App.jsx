import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  Edit2,
  Eye,
  FileText,
  Key,
  Plus,
  Search,
  Settings,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { LoginForm } from './components/login-form';
import { AppSidebar } from './components/app-sidebar';
import { requestJson } from './lib/api-client';
import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
} from './lib/auth-session';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from './components/ui/sidebar';
import './App.css';

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const PAGE_SIZE = 8;

const emptyScenarioBuilder = {
  scenarioId: '',
  title: '',
  type: 'Global Intercultural Campus Conversation',
  level: 'B1',
  arScene: 'Campus',
  sceneDescription: '',
  studentRole: 'Local student volunteer',
  studentTask: '',
  aiRole: 'International student',
  aiBackground: '',
  aiPersonality: 'Friendly, curious, and respectful',
  aiStyle: 'Natural spoken English, 1-2 short sentences per turn',
  learningGoal: '',
  objectivesText: 'greet_politely | Greet and respond politely | hello, hi, nice to meet\nask_information | Ask or answer relevant information | where, how, what, can',
  minResponses: 5,
  targetMin: 6,
  targetMax: 8,
  maxResponses: 10,
  completionConditions: 'The student reaches the main speaking goal and responds at least 5 times.\nThe AI can close naturally after 6-8 student responses.',
  closingInstruction: 'Close warmly and naturally without sounding like an evaluator.',
  locationBoundaries: 'Stay in the selected setting. Do not move the conversation to another place unless the scenario says so.',
  roleBoundaries: 'AI must stay as the assigned character. Do not use scripted names such as David, Rina, or Raka.',
  forbiddenTopics: 'Private family questions, money, politics, sensitive identity questions',
  rubricText: 'grammar | Accuracy and sentence clarity\nvocabulary | Word choice and range\nfluency | Natural flow and completeness\npoliteness | Respectful and appropriate tone\npragmatic_appropriateness | Suitable response for the situation\nintercultural_awareness | Awareness of cultural differences',
  goodExamples: 'Hello, nice to meet you.\nThank you for helping me.',
  poorExamples: 'Yes.\nHey bro.',
  fallbackGood: 'That sounds good. Thank you for explaining it clearly.',
  fallbackAcceptable: 'Thanks. Could you tell me a little more?',
  fallbackUnclear: 'Sorry, I did not catch that. Could you say it again?',
  isActive: true,
  rawJson: '',
};

const scoreLabels = {
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  fluency: 'Fluency',
  politeness: 'Politeness',
  pragmatic_appropriateness: 'Pragmatic',
  intercultural_awareness: 'ICC Awareness',
};

const parseLines = (value) => String(value || '').split('\n').map((line) => line.trim()).filter(Boolean);

const parseObjectives = (value) =>
  parseLines(value).map((line, index) => {
    const [id, description, cues] = line.split('|').map((item) => item?.trim());
    return {
      objective_id: id || `objective_${index + 1}`,
      description: description || line,
      detection_cues: cues ? cues.split(',').map((cue) => cue.trim()).filter(Boolean) : [],
      ai_follow_up: 'Respond naturally and continue the scenario.',
    };
  });

const parseRubric = (value) =>
  parseLines(value).map((line) => {
    const [criterion, description] = line.split('|').map((item) => item?.trim());
    return { criterion: criterion || line, description: description || 'Assess this speaking aspect from 1 to 5.' };
  });

const joinTextList = (value, separator = '\n') => {
  if (Array.isArray(value)) return value.filter(Boolean).join(separator);
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean).join(separator);
  return '';
};

const normalizeCollection = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
};

const includesText = (value, query) => String(value || '').toLowerCase().includes(String(query || '').toLowerCase());

const paginate = (items, page, pageSize = PAGE_SIZE) => {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    page: safePage,
    totalPages,
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
  };
};

const buildScenarioData = (form) => {
  const scenarioId = form.scenarioId.trim().toUpperCase();
  const objectives = parseObjectives(form.objectivesText);
  return {
    schema_version: '2.0',
    version: 1,
    scenario: {
      scenario_id: scenarioId,
      scenario_version: 1,
      title: form.title.trim(),
      scenario_type: form.type.trim(),
      level: form.level.trim(),
      ar_scene: form.arScene.trim(),
      student_role: form.studentRole.trim(),
      ai_role: form.aiRole.trim(),
      learning_goal: form.learningGoal.trim(),
      task_instruction: form.studentTask.trim(),
      ai_character_prompt: `${form.aiRole}. ${form.aiBackground}. ${form.aiPersonality}. ${form.aiStyle}`,
      good_response_examples: parseLines(form.goodExamples),
      poor_response_examples: parseLines(form.poorExamples),
      cultural_note: 'Use polite English and show intercultural awareness.',
    },
    context: {
      scene_title: form.title.trim(),
      setting: form.arScene.trim(),
      situation: form.sceneDescription.trim(),
      boundaries: parseLines(form.locationBoundaries),
      forbidden_terms: parseLines(form.forbiddenTopics).flatMap((line) => line.split(',').map((item) => item.trim())).filter(Boolean),
    },
    characters: [
      { name: 'Student', role: form.studentRole.trim(), profile: 'Logged-in learner from the mobile app.' },
      { name: 'AI Partner', role: form.aiRole.trim(), profile: form.aiBackground.trim() },
    ],
    objectives: {
      learning_goal: form.learningGoal.trim(),
      completion_conditions: parseLines(form.completionConditions),
    },
    conversation_objectives: objectives,
    conversation_stages: objectives.map((objective, index) => ({
      stage_order: index + 1,
      stage: objective.description,
      student_goal: objective.description,
      expected_function: objective.objective_id,
      success_indicator: 'Student responds appropriately in spoken English.',
    })),
    session_rules: {
      minimum_student_responses: Number(form.minResponses) || 5,
      target_student_responses_min: Number(form.targetMin) || 6,
      target_student_responses_max: Number(form.targetMax) || 8,
      maximum_student_responses: Number(form.maxResponses) || 10,
      required_objective_ids: objectives.map((item) => item.objective_id),
      natural_closing_message: form.closingInstruction.trim(),
    },
    boundaries: {
      location: form.locationBoundaries.trim(),
      role: form.roleBoundaries.trim(),
      forbidden_topics: parseLines(form.forbiddenTopics),
    },
    rubric: parseRubric(form.rubricText),
    branching_rules: [
      {
        rule_id: 'GOOD',
        student_response_category: 'GOOD',
        detection_cues: ['polite', 'clear', 'appropriate'],
        ai_response_strategy: 'Continue the role-play naturally.',
        example_ai_response: form.fallbackGood,
        feedback_focus: 'Appropriate response',
        score_impact: '+1',
      },
    ],
    fallback_responses: {
      GOOD: form.fallbackGood,
      ACCEPTABLE: form.fallbackAcceptable,
      TOO_DIRECT: 'I understand. Could you say that a little more politely?',
      STEREOTYPING: 'Let us avoid generalizations and focus on understanding each other.',
      TOO_PERSONAL: 'I would rather keep that private for now.',
      DISMISSIVE: 'Could we continue the conversation more respectfully?',
      SILENCE_OR_UNCLEAR: form.fallbackUnclear,
    },
  };
};

const scenarioToBuilder = (item = {}) => {
  const data = item.data || {};
  const scenario = data.scenario || {};
  const context = data.context || {};
  const rules = data.session_rules || {};
  return {
    ...emptyScenarioBuilder,
    scenarioId: item.scenarioId || scenario.scenario_id || '',
    title: item.title || scenario.title || '',
    type: scenario.scenario_type || emptyScenarioBuilder.type,
    level: scenario.level || 'B1',
    arScene: scenario.ar_scene || context.setting || 'Campus',
    sceneDescription: context.situation || '',
    studentRole: scenario.student_role || emptyScenarioBuilder.studentRole,
    studentTask: scenario.task_instruction || '',
    aiRole: scenario.ai_role || emptyScenarioBuilder.aiRole,
    aiBackground: scenario.ai_character_prompt || '',
    learningGoal: scenario.learning_goal || '',
    objectivesText: normalizeCollection(data.conversation_objectives).map((objective, index) =>
      `${objective?.objective_id || `objective_${index + 1}`} | ${objective?.description || ''} | ${joinTextList(objective?.detection_cues, ', ')}`
    ).join('\n') || emptyScenarioBuilder.objectivesText,
    minResponses: rules.minimum_student_responses || 5,
    targetMin: rules.target_student_responses_min || 6,
    targetMax: rules.target_student_responses_max || 8,
    maxResponses: rules.maximum_student_responses || 10,
    completionConditions: joinTextList(data.objectives?.completion_conditions) || emptyScenarioBuilder.completionConditions,
    closingInstruction: rules.natural_closing_message || emptyScenarioBuilder.closingInstruction,
    locationBoundaries: joinTextList(context.boundaries) || data.boundaries?.location || emptyScenarioBuilder.locationBoundaries,
    roleBoundaries: data.boundaries?.role || emptyScenarioBuilder.roleBoundaries,
    forbiddenTopics: joinTextList(context.forbidden_terms, ', ') || emptyScenarioBuilder.forbiddenTopics,
    rubricText: normalizeCollection(data.rubric).map((item, index) =>
      `${item?.criterion || `criterion_${index + 1}`} | ${item?.description || ''}`
    ).join('\n') || emptyScenarioBuilder.rubricText,
    goodExamples: joinTextList(scenario.good_response_examples) || emptyScenarioBuilder.goodExamples,
    poorExamples: joinTextList(scenario.poor_response_examples) || emptyScenarioBuilder.poorExamples,
    fallbackGood: data.fallback_responses?.GOOD || emptyScenarioBuilder.fallbackGood,
    fallbackAcceptable: data.fallback_responses?.ACCEPTABLE || emptyScenarioBuilder.fallbackAcceptable,
    fallbackUnclear: data.fallback_responses?.SILENCE_OR_UNCLEAR || emptyScenarioBuilder.fallbackUnclear,
    isActive: item.isActive ?? true,
    rawJson: JSON.stringify(data, null, 2),
  };
};

const average = (items, getter) => {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + Number(getter(item) || 0), 0) / items.length;
};

const asArray = (value) => Array.isArray(value) ? value : [];

const getScenarioDocumentId = (scenario) => scenario?._id || scenario?.id || scenario?.scenarioId;

const getScenarioData = (scenario) => scenario?.data || {};

const getScenarioCore = (scenario) => getScenarioData(scenario).scenario || {};

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <section className="metric-card">
      <div className="icon-cell"><Icon size={20} /></div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </section>
  );
}

function ProgressMetric({ label, value }) {
  const percent = Math.min(100, Math.max(0, (Number(value || 0) / 5) * 100));
  return (
    <div className="progress-metric">
      <div><span>{label}</span><strong>{Number(value || 0).toFixed(2)}</strong></div>
      <div className="progress-track"><i style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

function TableStatusRow({ colSpan, loading, emptyText }) {
  return (
    <tr>
      <td colSpan={colSpan} className="empty-cell">
        {loading ? 'Loading data...' : emptyText}
      </td>
    </tr>
  );
}

function PaginationBar({ page, totalPages, totalItems, onPageChange }) {
  if (totalItems <= PAGE_SIZE) return null;
  return (
    <div className="pagination-bar">
      <span>Showing page {page} of {totalPages} - {totalItems} records</span>
      <div>
        <button type="button" className="text-button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
        <button type="button" className="text-button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}

function StudentLongitudinalChart({ history }) {
  const completedSessions = useMemo(() => {
    return (history || [])
      .filter((s) => s.status === 'completed' || s.status === 'ended_manually')
      .sort((a, b) => new Date(a.completed_at || a.createdAt || 0) - new Date(b.completed_at || b.createdAt || 0));
  }, [history]);

  if (!completedSessions.length) {
    return (
      <div className="data-panel longitudinal-panel">
        <div className="panel-heading">
          <h3>Longitudinal Student Progress</h3>
          <span>Score trends per practice session</span>
        </div>
        <p className="empty-note">Belum ada data sesi selesai untuk menampilkan grafik longitudinal.</p>
      </div>
    );
  }

  const width = 600;
  const height = 180;
  const padding = 35;

  const points = completedSessions.map((session, index) => {
    const x = completedSessions.length === 1
      ? width / 2
      : padding + (index / (completedSessions.length - 1)) * (width - padding * 2);
    const score = Number(session.overall_score || 0);
    const y = height - padding - ((score / 5) * (height - padding * 2));
    return { x, y, score, session };
  });

  const pathD = points.length === 1
    ? `M ${padding} ${points[0].y} L ${width - padding} ${points[0].y}`
    : points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');

  return (
    <div className="data-panel longitudinal-panel">
      <div className="panel-heading">
        <h3>Longitudinal Student Progress</h3>
        <span>{completedSessions.length} sessions tracked</span>
      </div>
      <div className="longitudinal-chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="longitudinal-svg">
          {[1, 2, 3, 4, 5].map((val) => {
            const y = height - padding - ((val / 5) * (height - padding * 2));
            return (
              <g key={val}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                <text x={padding - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">{val}.0</text>
              </g>
            );
          })}
          {points.length > 1 && (
            <>
              <path
                d={`${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`}
                fill="url(#scoreGrad)"
                opacity="0.15"
              />
              <path d={pathD} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </linearGradient>
          </defs>
          {points.map((pt, i) => (
            <g key={i} className="chart-point-group">
              <circle cx={pt.x} cy={pt.y} r="5" fill="#ffffff" stroke="#f97316" strokeWidth="2.5" />
              <text x={pt.x} y={pt.y - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a">
                {pt.score.toFixed(1)}
              </text>
              <text x={pt.x} y={height - 8} textAnchor="middle" fontSize="9" fill="#94a3b8">
                Sesi {i + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default function App() {
  const initialAuth = getAuthSession();
  const [token, setToken] = useState(initialAuth.token);
  const [user, setUser] = useState(initialAuth.user);
  const [apiBaseUrl, setApiBaseUrl] = useState(localStorage.getItem('api_base_url') || DEFAULT_API_BASE_URL);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [students, setStudents] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionTab, setSessionTab] = useState('turns');
  const [selectedScenarioForDetail, setSelectedScenarioForDetail] = useState(null);
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);
  const [editingScenarioId, setEditingScenarioId] = useState(null);
  const [builderStep, setBuilderStep] = useState(1);
  const [builder, setBuilder] = useState(emptyScenarioBuilder);
  const [advancedJsonOpen, setAdvancedJsonOpen] = useState(false);
  const [lecturerForm, setLecturerForm] = useState({ name: '', email: '', password: '', gender: 'female' });
  const [createdLecturerCode, setCreatedLecturerCode] = useState('');
  const [loadingSections, setLoadingSections] = useState({});
  const [scenarioSearch, setScenarioSearch] = useState('');
  const [scenarioStatusFilter, setScenarioStatusFilter] = useState('all');
  const [scenarioPage, setScenarioPage] = useState(1);
  const [lecturerSearch, setLecturerSearch] = useState('');
  const [lecturerPage, setLecturerPage] = useState(1);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [historySearch, setHistorySearch] = useState('');
  const [historyScenarioFilter, setHistoryScenarioFilter] = useState('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);

  const callApi = useCallback((endpoint, method = 'GET', body = null, options = {}) =>
    requestJson({
      baseUrl: apiBaseUrl,
      endpoint,
      method,
      body,
      token,
      signal: options.signal,
    }), [apiBaseUrl, token]);

  const notifyRequestError = useCallback((error, fallbackMessage = 'Permintaan gagal diproses.') => {
    if (error?.name === 'AbortError') return;
    toast.error(error?.message || fallbackMessage);
  }, []);

  const saveAuth = (newToken, profile) => {
    setAuthSession(newToken, profile);
    setToken(newToken);
    setUser(profile);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      const data = await callApi('/api/auth/login', 'POST', { email, password });
      if (data.user.role === 'student') throw new Error('Akses web hanya untuk admin dan dosen.');
      saveAuth(data.token, data.user);
    } catch (error) {
      setErrorMessage(error.message);
      notifyRequestError(error, 'Login gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_profile');
    setToken('');
    setUser(null);
  };

  const handleSaveConfig = (value) => {
    const cleaned = value.trim();
    localStorage.setItem('api_base_url', cleaned);
    setApiBaseUrl(cleaned);
    setShowConfig(false);
  };

  const setSectionLoading = (key, value) => {
    setLoadingSections((current) => ({ ...current, [key]: value }));
  };

  const fetchAdminScenarios = useCallback(async (signal) => {
    setSectionLoading('scenarios', true);
    try {
      setScenarios(await callApi('/api/admin/scenarios', 'GET', null, { signal }));
    } catch (error) {
      notifyRequestError(error, 'Skenario tidak dapat dimuat.');
    } finally {
      if (!signal?.aborted) setSectionLoading('scenarios', false);
    }
  }, [callApi, notifyRequestError]);

  const fetchAdminLecturers = useCallback(async (signal) => {
    setSectionLoading('lecturers', true);
    try {
      setLecturers(await callApi('/api/admin/lecturers', 'GET', null, { signal }));
    } catch (error) {
      notifyRequestError(error, 'Daftar dosen tidak dapat dimuat.');
    } finally {
      if (!signal?.aborted) setSectionLoading('lecturers', false);
    }
  }, [callApi, notifyRequestError]);

  const fetchLecturerStudents = useCallback(async (signal) => {
    setSectionLoading('students', true);
    try {
      setStudents(await callApi('/api/lecturer/students', 'GET', null, { signal }));
    } catch (error) {
      notifyRequestError(error, 'Daftar mahasiswa tidak dapat dimuat.');
    } finally {
      if (!signal?.aborted) setSectionLoading('students', false);
    }
  }, [callApi, notifyRequestError]);

  const fetchLecturerHistory = useCallback(async (signal) => {
    setSectionLoading('history', true);
    try {
      setHistory(await callApi('/api/lecturer/history', 'GET', null, { signal }));
    } catch (error) {
      notifyRequestError(error, 'Riwayat latihan tidak dapat dimuat.');
    } finally {
      if (!signal?.aborted) setSectionLoading('history', false);
    }
  }, [callApi, notifyRequestError]);

  const fetchOverviewData = useCallback(async (signal) => {
    await Promise.all([
      fetchLecturerStudents(signal),
      fetchLecturerHistory(signal),
    ]);
  }, [fetchLecturerHistory, fetchLecturerStudents]);

  useEffect(() => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_profile');
  }, []);

  useEffect(() => {
    if (!user) {
      setActiveTab('');
      return;
    }
    setActiveTab(user.role === 'admin' ? 'scenarios' : 'overview');
  }, [user]);

  useEffect(() => {
    if (!token || !activeTab) return undefined;
    const controller = new AbortController();

    if (activeTab === 'scenarios') void fetchAdminScenarios(controller.signal);
    if (activeTab === 'lecturers') void fetchAdminLecturers(controller.signal);
    if (activeTab === 'overview') void fetchOverviewData(controller.signal);
    if (activeTab === 'students') void fetchLecturerStudents(controller.signal);
    if (activeTab === 'history') void fetchLecturerHistory(controller.signal);

    return () => controller.abort();
  }, [
    activeTab,
    fetchAdminLecturers,
    fetchAdminScenarios,
    fetchLecturerHistory,
    fetchLecturerStudents,
    fetchOverviewData,
    token,
  ]);

  useEffect(() => { setScenarioPage(1); }, [scenarioSearch, scenarioStatusFilter]);
  useEffect(() => { setLecturerPage(1); }, [lecturerSearch]);
  useEffect(() => { setStudentPage(1); }, [studentSearch]);
  useEffect(() => { setHistoryPage(1); }, [historySearch, historyScenarioFilter, historyStatusFilter]);

  const dashboardMetrics = useMemo(() => {
    const completed = history.filter((item) => item.status === 'completed' || item.status === 'ended_manually');
    const avgScore = average(completed, (item) => item.overall_score);
    const avgDuration = average(completed, (item) => item.duration_seconds);
    const avgResponses = average(completed, (item) => item.student_response_count);
    const byScenario = completed.reduce((acc, item) => {
      const key = item.scenario?.scenario_id || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const topScenario = Object.entries(byScenario).sort((a, b) => b[1] - a[1])[0];
    const scoreAverages = Object.keys(scoreLabels).reduce((acc, key) => {
      acc[key] = average(completed, (item) => item.average_scores?.[key]);
      return acc;
    }, {});
    return { completed, avgScore, avgDuration, avgResponses, topScenario, scoreAverages };
  }, [history]);

  const filteredScenarios = useMemo(() => scenarios.filter((item) => {
    const scenario = getScenarioCore(item);
    const matchesSearch = !scenarioSearch
      || includesText(item.scenarioId, scenarioSearch)
      || includesText(item.title, scenarioSearch)
      || includesText(scenario.ai_role, scenarioSearch)
      || includesText(scenario.student_role, scenarioSearch);
    const matchesStatus = scenarioStatusFilter === 'all'
      || (scenarioStatusFilter === 'active' ? item.isActive : !item.isActive);
    return matchesSearch && matchesStatus;
  }), [scenarios, scenarioSearch, scenarioStatusFilter]);
  const scenarioPagination = paginate(filteredScenarios, scenarioPage);

  const filteredLecturers = useMemo(() => lecturers.filter((item) =>
    !lecturerSearch
    || includesText(item.name, lecturerSearch)
    || includesText(item.email, lecturerSearch)
    || includesText(item.lecturerCode, lecturerSearch)
  ), [lecturers, lecturerSearch]);
  const lecturerPagination = paginate(filteredLecturers, lecturerPage);

  const filteredStudents = useMemo(() => students.filter((item) =>
    !studentSearch
    || includesText(item.name, studentSearch)
    || includesText(item.email, studentSearch)
    || includesText(item.studentId, studentSearch)
  ), [students, studentSearch]);
  const studentPagination = paginate(filteredStudents, studentPage);

  const historyScenarioOptions = useMemo(() => Array.from(new Set(
    history.map((item) => item.scenario?.scenario_id).filter(Boolean)
  )).sort(), [history]);

  const filteredHistory = useMemo(() => history.filter((item) => {
    const matchesSearch = !historySearch
      || includesText(item.student_details?.student_id, historySearch)
      || includesText(item.student_details?.name, historySearch)
      || includesText(item.scenario?.scenario_id, historySearch)
      || includesText(item.scenario?.title, historySearch);
    const matchesScenario = historyScenarioFilter === 'all' || item.scenario?.scenario_id === historyScenarioFilter;
    const matchesStatus = historyStatusFilter === 'all' || item.status === historyStatusFilter;
    return matchesSearch && matchesScenario && matchesStatus;
  }), [history, historySearch, historyScenarioFilter, historyStatusFilter]);
  const historyPagination = paginate(filteredHistory, historyPage);

  const openNewScenario = () => {
    setEditingScenarioId(null);
    setBuilder(emptyScenarioBuilder);
    setBuilderStep(1);
    setAdvancedJsonOpen(false);
    setErrorMessage('');
    setScenarioModalOpen(true);
  };

  const openEditScenario = (scenario) => {
    try {
      const documentId = getScenarioDocumentId(scenario);
      if (!documentId) {
        setErrorMessage('Scenario document ID tidak ditemukan. Muat ulang dashboard lalu coba lagi.');
        setScenarioModalOpen(true);
        return;
      }
      setEditingScenarioId(documentId);
      setBuilder(scenarioToBuilder(scenario));
      setBuilderStep(1);
      setAdvancedJsonOpen(false);
      setErrorMessage('');
      setScenarioModalOpen(true);
    } catch (error) {
      console.error('Failed to open scenario editor:', error);
      setEditingScenarioId(getScenarioDocumentId(scenario) || null);
      setBuilder({
        ...emptyScenarioBuilder,
        scenarioId: scenario?.scenarioId || scenario?.data?.scenario?.scenario_id || '',
        title: scenario?.title || scenario?.data?.scenario?.title || '',
        isActive: scenario?.isActive ?? true,
        rawJson: JSON.stringify(scenario?.data || {}, null, 2),
      });
      setAdvancedJsonOpen(true);
      setErrorMessage(`Scenario editor dibuka dalam mode JSON karena format data tidak standar: ${error.message}`);
      setScenarioModalOpen(true);
    }
  };

  const handleSaveScenario = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    try {
      let data = buildScenarioData(builder);
      if (advancedJsonOpen && builder.rawJson.trim()) {
        data = JSON.parse(builder.rawJson);
        data.scenario = data.scenario || {};
        data.scenario.scenario_id = builder.scenarioId.trim().toUpperCase();
        data.scenario.title = builder.title.trim();
      }
      const payload = {
        scenarioId: builder.scenarioId.trim().toUpperCase(),
        title: builder.title.trim(),
        isActive: builder.isActive,
        data,
      };
      if (!payload.scenarioId || !payload.title) throw new Error('Scenario ID dan judul wajib diisi.');
      if (editingScenarioId) {
        await callApi(`/api/admin/scenarios/${editingScenarioId}`, 'PUT', payload);
      } else {
        await callApi('/api/admin/scenarios', 'POST', payload);
      }
      setScenarioModalOpen(false);
      toast.success(editingScenarioId ? 'Skenario berhasil diperbarui.' : 'Skenario berhasil dibuat.');
      void fetchAdminScenarios();
    } catch (error) {
      setErrorMessage(error.message || 'Scenario tidak bisa disimpan.');
      notifyRequestError(error, 'Skenario tidak bisa disimpan.');
    }
  };

  const handleDeleteScenario = async (id) => {
    if (!id) return alert('Scenario document ID tidak ditemukan. Muat ulang dashboard lalu coba lagi.');
    if (!confirm('Hapus skenario ini dari database?')) return;
    try {
      await callApi(`/api/admin/scenarios/${id}`, 'DELETE');
      toast.success('Skenario berhasil dihapus.');
      void fetchAdminScenarios();
    } catch (error) {
      notifyRequestError(error, 'Skenario tidak dapat dihapus.');
    }
  };

  const handleToggleScenarioStatus = async (id, currentStatus) => {
    if (!id) return alert('Scenario document ID tidak ditemukan. Muat ulang dashboard lalu coba lagi.');
    try {
      await callApi(`/api/admin/scenarios/${id}`, 'PUT', { isActive: !currentStatus });
      toast.success(!currentStatus ? 'Skenario diaktifkan.' : 'Skenario dinonaktifkan.');
      void fetchAdminScenarios();
    } catch (error) {
      notifyRequestError(error, 'Status skenario tidak dapat diubah.');
    }
  };

  const handleCreateLecturer = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setCreatedLecturerCode('');
    try {
      const data = await callApi('/api/admin/create-lecturer', 'POST', lecturerForm);
      setCreatedLecturerCode(data.lecturer.lecturerCode);
      setLecturerForm({ name: '', email: '', password: '', gender: 'female' });
      toast.success('Akun dosen berhasil dibuat.');
      void fetchAdminLecturers();
    } catch (error) {
      setErrorMessage(error.message);
      notifyRequestError(error, 'Akun dosen tidak dapat dibuat.');
    }
  };

  const exportHistoryToCSV = () => {
    const exportRows = filteredHistory.length ? filteredHistory : history;
    if (!exportRows.length) return alert('Tidak ada data riwayat untuk diekspor.');
    const headers = ['NIM', 'Nama', 'Consent', 'Scenario ID', 'Judul', 'Selesai', 'Durasi', 'Respons', 'Status', 'Skor', ...Object.values(scoreLabels)];
    const rows = exportRows.map((item) => [
      item.student_details?.student_id || '',
      item.student_details?.name || '',
      item.student_details?.consent ? 'YA' : 'TIDAK',
      item.scenario?.scenario_id || '',
      item.scenario?.title || '',
      item.completed_at || '',
      item.duration_seconds || 0,
      item.student_response_count || 0,
      item.status || '',
      item.overall_score || 0,
      ...Object.keys(scoreLabels).map((key) => item.average_scores?.[key] || 0),
    ]);
    const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = `Data_Penelitian_ICC_${user.lecturerCode || 'Lecturer'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!token || !user) {
    return (
      <div className="login-shell">
        <button className="config-button" onClick={() => setShowConfig(!showConfig)}><Settings size={16} /> API Config</button>
        {showConfig && (
          <div className="config-popover">
            <label>Backend API Base URL</label>
            <input defaultValue={apiBaseUrl} onBlur={(event) => handleSaveConfig(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleSaveConfig(event.currentTarget.value)} />
          </div>
        )}
        <LoginForm
          className="animate-fade-in"
          email={email}
          password={password}
          loading={loading}
          errorMessage={errorMessage}
          apiBaseUrl={apiBaseUrl}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={handleLogin}
        />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} activeTab={activeTab} setActiveTab={setActiveTab} handleLogout={handleLogout} />

      <SidebarInset className="dashboard-page">
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <SidebarTrigger className="sidebar-top-trigger" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <h1>{activeTab === 'scenarios' ? 'Scenario Builder' : activeTab === 'lecturers' ? 'Lecturer Accounts' : activeTab === 'overview' ? 'Research Overview' : activeTab === 'students' ? 'Registered Students' : 'Practice History'}</h1>
          </div>
          <div className="search-pill"><Search size={16} /><span>{apiBaseUrl.replace(/^https?:\/\//, '')}</span></div>
        </header>

        {user.role === 'admin' && activeTab === 'scenarios' && (
          <section className="screen-stack">
            <div className="hero-panel">
              <div>
                <span className="eyebrow">Admin Scenario System</span>
                <h2>Manage scenarios without fixed character names.</h2>
                <p>This builder separates context, roles, goals, boundaries, and rubrics so the AI remains in the correct location and character.</p>
              </div>
              <button className="primary-action" onClick={openNewScenario}><Plus size={17} /> Create Scenario</button>
            </div>
            <div className="metric-grid">
              <StatCard icon={BookOpen} label="Total Scenarios" value={scenarios.length} detail="stored in database" />
              <StatCard icon={CheckCircle2} label="Active" value={scenarios.filter((item) => item.isActive).length} detail="live on mobile app" />
              <StatCard icon={FileText} label="Format" value="V2" detail="builder + advanced JSON" />
            </div>
            <div className="data-panel">
              <div className="panel-heading"><h3>Scenarios List</h3><span>{filteredScenarios.length} of {scenarios.length} items</span></div>
              <div className="table-toolbar">
                <label className="toolbar-field">
                  <Search size={15} />
                  <input value={scenarioSearch} onChange={(event) => setScenarioSearch(event.target.value)} placeholder="Search ID, title, or role..." />
                </label>
                <select value={scenarioStatusFilter} onChange={(event) => setScenarioStatusFilter(event.target.value)}>
                  <option value="all">All status</option>
                  <option value="active">Active only</option>
                  <option value="inactive">Inactive only</option>
                </select>
              </div>
              <div className="custom-table-container">
                <table className="custom-table scenario-list-table">
                  <thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {scenarioPagination.items.map((scenario) => (
                      <tr
                        key={getScenarioDocumentId(scenario)}
                        className="clickable-row"
                      >
                        <td>
                          <button
                            type="button"
                            className="scenario-field-button scenario-id-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedScenarioForDetail(scenario);
                            }}
                          >
                            {scenario.scenarioId}
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="scenario-field-button scenario-title-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedScenarioForDetail(scenario);
                            }}
                          >
                            {scenario.title}
                          </button>
                        </td>
                        <td>
                          <button
                            className={`status-pill ${scenario.isActive ? "active" : "inactive"}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleToggleScenarioStatus(getScenarioDocumentId(scenario), scenario.isActive);
                            }}
                          >
                            {scenario.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td
                          className="action-cell"
                          onClick={(event) => event.stopPropagation()}
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          <div className="row-actions">
                            <button
                              type="button"
                              className="btn-table-action"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setSelectedScenarioForDetail(scenario);
                              }}
                              title="View scenario detail"
                            >
                              <Eye size={14} />
                              Detail
                            </button>
                            <button
                              type="button"
                              className="btn-table-action icon-action edit-action"
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setSelectedScenarioForDetail(null);
                                openEditScenario(scenario);
                              }}
                              title="Edit scenario"
                              aria-label={`Edit ${scenario.title}`}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn-table-action icon-action danger"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleDeleteScenario(getScenarioDocumentId(scenario));
                              }}
                              title="Delete scenario"
                              aria-label={`Delete ${scenario.title}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!scenarioPagination.items.length && (
                      <TableStatusRow colSpan={4} loading={loadingSections.scenarios} emptyText="No scenarios match the current filter." />
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={scenarioPagination.page} totalPages={scenarioPagination.totalPages} totalItems={filteredScenarios.length} onPageChange={setScenarioPage} />
            </div>
          </section>
        )}

        {user.role === 'admin' && activeTab === 'lecturers' && (
          <section className="two-column">
            <form className="data-panel form-panel" onSubmit={handleCreateLecturer}>
              <div className="panel-heading"><h3>Create Lecturer Account</h3><Key size={18} /></div>
              {createdLecturerCode && <div className="success-box">New lecturer code: <strong>{createdLecturerCode}</strong></div>}
              {errorMessage && <div className="error-box">{errorMessage}</div>}
              <label>Lecturer name<input required value={lecturerForm.name} onChange={(event) => setLecturerForm({ ...lecturerForm, name: event.target.value })} /></label>
              <label>Email<input required type="email" value={lecturerForm.email} onChange={(event) => setLecturerForm({ ...lecturerForm, email: event.target.value })} /></label>
              <label>Password<input required type="password" value={lecturerForm.password} onChange={(event) => setLecturerForm({ ...lecturerForm, password: event.target.value })} /></label>
              <label>Gender<select value={lecturerForm.gender} onChange={(event) => setLecturerForm({ ...lecturerForm, gender: event.target.value })}><option value="female">Female</option><option value="male">Male</option></select></label>
              <button className="primary-action">Create Account</button>
            </form>
            <div className="data-panel">
              <div className="panel-heading"><h3>Lecturer List</h3><span>{filteredLecturers.length} of {lecturers.length} accounts</span></div>
              <div className="table-toolbar">
                <label className="toolbar-field">
                  <Search size={15} />
                  <input value={lecturerSearch} onChange={(event) => setLecturerSearch(event.target.value)} placeholder="Search lecturer, email, or code..." />
                </label>
              </div>
              <table className="custom-table"><thead><tr><th>Name</th><th>Email</th><th>Code</th><th>Registered</th></tr></thead><tbody>
                {lecturerPagination.items.map((lecturer) => <tr key={lecturer.id}><td>{lecturer.name}</td><td>{lecturer.email}</td><td><strong>{lecturer.lecturerCode}</strong></td><td>{lecturer.createdAt ? new Date(lecturer.createdAt).toLocaleDateString('en-US') : '-'}</td></tr>)}
                {!lecturerPagination.items.length && (
                  <TableStatusRow colSpan={4} loading={loadingSections.lecturers} emptyText="No lecturer accounts match the current search." />
                )}
              </tbody></table>
              <PaginationBar page={lecturerPagination.page} totalPages={lecturerPagination.totalPages} totalItems={filteredLecturers.length} onPageChange={setLecturerPage} />
            </div>
          </section>
        )}

        {user.role === 'lecturer' && activeTab === 'overview' && (
          <section className="screen-stack">
            <div className="hero-panel lecturer-hero">
              <div>
                <span className="eyebrow">Lecturer Research Monitor</span>
                <h2>Student Speaking Practice Insights</h2>
                <p>Lecturer code links student profiles, practice sessions, transcripts, duration, and metrics for research analysis.</p>
              </div>
              <div className="code-badge"><span>Lecturer Code</span><strong>{user.lecturerCode}</strong></div>
            </div>
            <div className="metric-grid">
              <StatCard icon={Users} label="Students" value={students.length} detail="linked to lecturer code" />
              <StatCard icon={Activity} label="Completed sessions" value={dashboardMetrics.completed.length} detail={`${dashboardMetrics.avgResponses.toFixed(1)} responses/session`} />
              <StatCard icon={Award} label="Average score" value={dashboardMetrics.avgScore.toFixed(2)} detail={`${Math.round(dashboardMetrics.avgDuration)} seconds/session`} />
              <StatCard icon={BookOpen} label="Most Active" value={dashboardMetrics.topScenario?.[0] || '-'} detail={dashboardMetrics.topScenario ? `${dashboardMetrics.topScenario[1]} sessions` : 'no data available'} />
            </div>
            <StudentLongitudinalChart history={history} />
            <div className="research-grid">
              <div className="data-panel">
                <div className="panel-heading"><h3>Skill Performance</h3><span>average / 5</span></div>
                {Object.entries(scoreLabels).map(([key, label]) => <ProgressMetric key={key} label={label} value={dashboardMetrics.scoreAverages[key]} />)}
              </div>
              <div className="data-panel">
                <div className="panel-heading"><h3>Recent Sessions</h3><button className="text-button" onClick={() => setActiveTab('history')}>View all <ChevronRight size={14} /></button></div>
                <div className="session-list">
                  {history.slice(0, 5).map((item, index) => (
                    <button key={index} onClick={() => setSelectedSession(item)}>
                      <div><strong>{item.student_details?.name || '-'}</strong><span>{item.scenario?.scenario_id} - {item.scenario?.title}</span></div>
                      <b>{Number(item.overall_score || 0).toFixed(2)}</b>
                    </button>
                  ))}
                  {!history.length && <p className="empty-note">Belum ada riwayat latihan.</p>}
                </div>
              </div>
            </div>
          </section>
        )}

        {user.role === 'lecturer' && activeTab === 'students' && (
          <div className="data-panel">
            <div className="panel-heading"><h3>Registered Students</h3><span>{filteredStudents.length} of {students.length} students</span></div>
            <div className="table-toolbar">
              <label className="toolbar-field">
                <Search size={15} />
                <input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search student ID, name, or email..." />
              </label>
            </div>
            <table className="custom-table">
              <thead><tr><th>Student ID</th><th>Name</th><th>Email</th><th>Consent</th><th>Registered</th></tr></thead>
              <tbody>
                {studentPagination.items.map((student) => (
                  <tr key={student.id}>
                    <td><strong>{student.studentId || '-'}</strong></td>
                    <td>{student.name}</td>
                    <td>{student.email}</td>
                    <td>
                      <span className={`status-badge ${student.consent ? "active" : "inactive"}`}>
                        {student.consent ? "Consented" : "No"}
                      </span>
                    </td>
                    <td>{student.createdAt ? new Date(student.createdAt).toLocaleDateString('en-US') : '-'}</td>
                  </tr>
                ))}
                {!studentPagination.items.length && (
                  <TableStatusRow colSpan={5} loading={loadingSections.students} emptyText="No students match the current search." />
                )}
              </tbody>
            </table>
            <PaginationBar page={studentPagination.page} totalPages={studentPagination.totalPages} totalItems={filteredStudents.length} onPageChange={setStudentPage} />
          </div>
        )}

        {user.role === 'lecturer' && activeTab === 'history' && (
          <section className="screen-stack">
            <div className="action-row"><p>This history can be exported as research data.</p><button className="primary-action" onClick={exportHistoryToCSV}><Download size={16} /> Export CSV</button></div>
            <div className="data-panel">
              <div className="panel-heading"><h3>Practice Sessions</h3><span>{filteredHistory.length} of {history.length} sessions</span></div>
              <div className="table-toolbar multi">
                <label className="toolbar-field">
                  <Search size={15} />
                  <input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Search student or scenario..." />
                </label>
                <select value={historyScenarioFilter} onChange={(event) => setHistoryScenarioFilter(event.target.value)}>
                  <option value="all">All scenarios</option>
                  {historyScenarioOptions.map((id) => <option key={id} value={id}>{id}</option>)}
                </select>
                <select value={historyStatusFilter} onChange={(event) => setHistoryStatusFilter(event.target.value)}>
                  <option value="all">All status</option>
                  <option value="completed">Completed</option>
                  <option value="ended_manually">Ended manually</option>
                  <option value="abandoned">Abandoned</option>
                  <option value="active">Active</option>
                </select>
              </div>
              <table className="custom-table">
                <thead><tr><th>Student ID</th><th>Student</th><th>Scenario</th><th>Completed At</th><th>Duration</th><th>Responses</th><th>Score</th><th>Action</th></tr></thead>
                <tbody>
                  {historyPagination.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.student_details?.student_id || '-'}</td>
                      <td>{item.student_details?.name || '-'}</td>
                      <td>{item.scenario?.scenario_id} - {item.scenario?.title}</td>
                      <td>{item.completed_at ? new Date(item.completed_at).toLocaleString('en-US') : '-'}</td>
                      <td>{item.duration_seconds || 0}s</td>
                      <td>{item.student_response_count || 0}</td>
                      <td><strong>{Number(item.overall_score || 0).toFixed(2)}</strong></td>
                      <td>
                        <button className="btn-table-action" onClick={() => setSelectedSession(item)}>
                          <Eye size={14} /> Transcript
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!historyPagination.items.length && (
                    <TableStatusRow colSpan={8} loading={loadingSections.history} emptyText="No practice sessions match the current filters." />
                  )}
                </tbody>
              </table>
              <PaginationBar page={historyPagination.page} totalPages={historyPagination.totalPages} totalItems={filteredHistory.length} onPageChange={setHistoryPage} />
            </div>
          </section>
        )}
      </main>
      </SidebarInset>

      {scenarioModalOpen && (
        <div className="modal-backdrop">
          <form className="scenario-modal wizard-modal" onSubmit={handleSaveScenario}>
            <div className="panel-heading">
              <div>
                <h3>{editingScenarioId ? 'Edit Scenario Builder' : 'Create Scenario Builder'}</h3>
                <span>Configure scenario metadata, roles, objectives, and rubrics in structured steps.</span>
              </div>
              <button type="button" className="text-button" onClick={() => setScenarioModalOpen(false)}>Close</button>
            </div>

            <div className="wizard-stepper">
              {[
                { step: 1, label: '1. Basic & AR Scene' },
                { step: 2, label: '2. Roles & Prompts' },
                { step: 3, label: '3. Flow & Objectives' },
                { step: 4, label: '4. Boundaries & Rubric' },
              ].map((item) => (
                <button
                  key={item.step}
                  type="button"
                  className={`stepper-item ${builderStep === item.step ? 'active' : ''} ${builderStep > item.step ? 'completed' : ''}`}
                  onClick={() => setBuilderStep(item.step)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {errorMessage && <div className="error-box">{errorMessage}</div>}

            {builderStep === 1 && (
              <div className="builder-section">
                <h4>Step 1: Basic Information & AR Setting</h4>
                <div className="builder-grid">
                  <label>Scenario ID<input required disabled={!!editingScenarioId} value={builder.scenarioId} onChange={(event) => setBuilder({ ...builder, scenarioId: event.target.value })} placeholder="G-ICC-011" /></label>
                  <label>Title<input required value={builder.title} onChange={(event) => setBuilder({ ...builder, title: event.target.value })} placeholder="Meeting an International Student on Campus" /></label>
                  <label>Type<input value={builder.type} onChange={(event) => setBuilder({ ...builder, type: event.target.value })} /></label>
                  <label>Level<input value={builder.level} onChange={(event) => setBuilder({ ...builder, level: event.target.value })} /></label>
                  <label>AR Scene<input value={builder.arScene} onChange={(event) => setBuilder({ ...builder, arScene: event.target.value })} placeholder="International Office" /></label>
                </div>
                <label>Setting description<textarea rows="3" value={builder.sceneDescription} onChange={(event) => setBuilder({ ...builder, sceneDescription: event.target.value })} /></label>
              </div>
            )}

            {builderStep === 2 && (
              <div className="builder-section">
                <h4>Step 2: Character Roles & Prompts</h4>
                <div className="builder-grid">
                  <label>Student Role<input value={builder.studentRole} onChange={(event) => setBuilder({ ...builder, studentRole: event.target.value })} /></label>
                  <label>AI Role<input value={builder.aiRole} onChange={(event) => setBuilder({ ...builder, aiRole: event.target.value })} /></label>
                  <label>AI Personality<input value={builder.aiPersonality} onChange={(event) => setBuilder({ ...builder, aiPersonality: event.target.value })} /></label>
                  <label>AI Style & Background<input value={builder.aiBackground} onChange={(event) => setBuilder({ ...builder, aiBackground: event.target.value })} /></label>
                </div>
                <label>Student Task Instruction<textarea rows="3" value={builder.studentTask} onChange={(event) => setBuilder({ ...builder, studentTask: event.target.value })} /></label>
              </div>
            )}

            {builderStep === 3 && (
              <div className="builder-section">
                <h4>Step 3: Conversation Flow & Learning Goals</h4>
                <label>Learning goal<textarea rows="2" value={builder.learningGoal} onChange={(event) => setBuilder({ ...builder, learningGoal: event.target.value })} /></label>
                <label>Objectives, one line per item: id | description | detection_cues<textarea rows="4" value={builder.objectivesText} onChange={(event) => setBuilder({ ...builder, objectivesText: event.target.value })} /></label>
                <div className="builder-grid compact">
                  <label>Minimum responses<input type="number" min="1" value={builder.minResponses} onChange={(event) => setBuilder({ ...builder, minResponses: event.target.value })} /></label>
                  <label>Target min<input type="number" min="1" value={builder.targetMin} onChange={(event) => setBuilder({ ...builder, targetMin: event.target.value })} /></label>
                  <label>Target max<input type="number" min="1" value={builder.targetMax} onChange={(event) => setBuilder({ ...builder, targetMax: event.target.value })} /></label>
                  <label>Maximum<input type="number" min="1" value={builder.maxResponses} onChange={(event) => setBuilder({ ...builder, maxResponses: event.target.value })} /></label>
                </div>
                <label>Completion conditions<textarea rows="3" value={builder.completionConditions} onChange={(event) => setBuilder({ ...builder, completionConditions: event.target.value })} /></label>
              </div>
            )}

            {builderStep === 4 && (
              <div className="builder-section">
                <h4>Step 4: Boundaries, Rubric & Status</h4>
                <label>Location boundaries<textarea rows="2" value={builder.locationBoundaries} onChange={(event) => setBuilder({ ...builder, locationBoundaries: event.target.value })} /></label>
                <label>Role boundaries<textarea rows="2" value={builder.roleBoundaries} onChange={(event) => setBuilder({ ...builder, roleBoundaries: event.target.value })} /></label>
                <label>Forbidden Topics (comma separated)<textarea rows="2" value={builder.forbiddenTopics} onChange={(event) => setBuilder({ ...builder, forbiddenTopics: event.target.value })} /></label>
                <label>Rubric: criterion | description<textarea rows="4" value={builder.rubricText} onChange={(event) => setBuilder({ ...builder, rubricText: event.target.value })} /></label>

                <div className="modal-options">
                  <label className="switch-row"><input type="checkbox" checked={builder.isActive} onChange={(event) => setBuilder({ ...builder, isActive: event.target.checked })} /> Active on mobile</label>
                  <button type="button" className="text-button" onClick={() => setAdvancedJsonOpen(!advancedJsonOpen)}>Advanced JSON</button>
                </div>
                {advancedJsonOpen && <label>Raw JSON override<textarea rows="6" value={builder.rawJson || JSON.stringify(buildScenarioData(builder), null, 2)} onChange={(event) => setBuilder({ ...builder, rawJson: event.target.value })} /></label>}
              </div>
            )}

            <div className="wizard-footer">
              <span className="step-indicator">Step {builderStep} of 4</span>
              <div className="wizard-actions">
                {builderStep > 1 && (
                  <button type="button" className="secondary-action" onClick={() => setBuilderStep(builderStep - 1)}>Previous</button>
                )}
                {builderStep < 4 ? (
                  <button type="button" className="primary-action" onClick={() => setBuilderStep(builderStep + 1)}>Next Step</button>
                ) : (
                  <button type="submit" className="primary-action">Save Scenario</button>
                )}
                {builderStep < 4 && (
                  <button type="submit" className="text-button" style={{ color: '#ea580c' }}>Save Draft</button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {selectedSession && (
        <div className="modal-backdrop">
          <div className="transcript-modal detailed-session-modal">
            <div className="panel-heading">
              <div>
                <h3>Turn-by-Turn Evaluation & Transcript</h3>
                <span>{selectedSession.student_details?.name || 'Student'} • {selectedSession.scenario?.title || selectedSession.scenario?.scenario_id}</span>
              </div>
              <button className="text-button" onClick={() => setSelectedSession(null)}>Close</button>
            </div>

            <div className="modal-tab-bar">
              <button
                type="button"
                className={`tab-btn ${sessionTab === 'turns' ? 'active' : ''}`}
                onClick={() => setSessionTab('turns')}
              >
                <FileText size={15} /> Turn-by-Turn Transcript ({selectedSession.transcript?.length || 0})
              </button>
              <button
                type="button"
                className={`tab-btn ${sessionTab === 'rubric' ? 'active' : ''}`}
                onClick={() => setSessionTab('rubric')}
              >
                <Award size={15} /> Rubric & Score Breakdown
              </button>
            </div>

            {sessionTab === 'turns' ? (
              <div className="turns-container">
                {(selectedSession.transcript || []).map((chat, index) => {
                  const isAI = chat.speaker === 'AI';
                  return (
                    <div key={index} className={`turn-card ${isAI ? 'ai-turn' : 'student-turn'}`}>
                      <div className="turn-card-header">
                        <span className={`turn-speaker-badge ${isAI ? 'ai' : 'student'}`}>
                          {isAI ? (selectedSession.scenario?.ai_role || 'AI Partner') : 'Mahasiswa'}
                        </span>
                        <span className="turn-number-tag">Turn #{index + 1}</span>
                      </div>
                      <p className="turn-message-body">{chat.message}</p>
                      {chat.feedback && (
                        <div className="turn-feedback-box">
                          <small>💡 Feedback: {chat.feedback}</small>
                        </div>
                      )}
                    </div>
                  );
                })}
                {!selectedSession.transcript?.length && (
                  <p className="empty-note">Tidak ada item transkrip dalam sesi ini.</p>
                )}
              </div>
            ) : (
              <div className="transcript-grid">
                <div className="session-summary-box">
                  <div className="score-hero-card">
                    <strong className="big-score">{Number(selectedSession.overall_score || 0).toFixed(2)}</strong>
                    <span>Overall Score / 5.0</span>
                  </div>
                  <div className="meta-list">
                    <p><strong>Status:</strong> <span className="status-pill active">{selectedSession.status || 'completed'}</span></p>
                    <p><strong>Duration:</strong> {selectedSession.duration_seconds || 0} seconds</p>
                    <p><strong>Student Responses:</strong> {selectedSession.student_response_count || 0}</p>
                    <p><strong>Completed At:</strong> {selectedSession.completed_at ? new Date(selectedSession.completed_at).toLocaleString('en-US') : '-'}</p>
                  </div>
                </div>
                <div className="score-panel">
                  <h4>Assessment Rubric Metrics</h4>
                  {Object.entries(scoreLabels).map(([key, label]) => (
                    <ProgressMetric key={key} label={label} value={selectedSession.average_scores?.[key]} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedScenarioForDetail && (
        <div className="modal-backdrop">
          <div className="scenario-detail-modal">
            <div className="panel-heading">
              <div>
                <h3>Scenario Details</h3>
                <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                  ID: {selectedScenarioForDetail.scenarioId}
                </span>
              </div>
              <button type="button" className="text-button" onClick={() => setSelectedScenarioForDetail(null)}>Close</button>
            </div>

            <div className="detail-grid">
              <div className="detail-section">
                <h4>General Info</h4>
                <p><strong>Title:</strong> {selectedScenarioForDetail.title}</p>
                <p><strong>Type:</strong> {getScenarioCore(selectedScenarioForDetail).scenario_type || '-'}</p>
                <p><strong>Level:</strong> {getScenarioCore(selectedScenarioForDetail).level || '-'}</p>
                <p><strong>AR Scene:</strong> {getScenarioCore(selectedScenarioForDetail).ar_scene || getScenarioData(selectedScenarioForDetail).context?.setting || '-'}</p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span className={`status-badge ${selectedScenarioForDetail.isActive ? 'active' : 'inactive'}`}>
                    {selectedScenarioForDetail.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>

              <div className="detail-section">
                <h4>Roles & Boundaries</h4>
                <p><strong>Student Role:</strong> {getScenarioCore(selectedScenarioForDetail).student_role || '-'}</p>
                <p><strong>AI Role:</strong> {getScenarioCore(selectedScenarioForDetail).ai_role || '-'}</p>
                <p><strong>Location Boundaries:</strong> {getScenarioData(selectedScenarioForDetail).boundaries?.location || asArray(getScenarioData(selectedScenarioForDetail).context?.boundaries).join(', ') || '-'}</p>
                <p><strong>Role Boundaries:</strong> {getScenarioData(selectedScenarioForDetail).boundaries?.role || '-'}</p>
              </div>

              <div className="detail-section full-width">
                <h4>Scenario Context & Background</h4>
                <p><strong>Setting Situation:</strong> {getScenarioData(selectedScenarioForDetail).context?.situation || '-'}</p>
                <p><strong>Student Task Instruction:</strong> {getScenarioCore(selectedScenarioForDetail).task_instruction || '-'}</p>
                <p><strong>AI Character Prompt:</strong> {getScenarioCore(selectedScenarioForDetail).ai_character_prompt || '-'}</p>
              </div>

              <div className="detail-section full-width">
                <h4>Goals & Completion</h4>
                <p><strong>Learning Goal:</strong> {getScenarioCore(selectedScenarioForDetail).learning_goal || getScenarioData(selectedScenarioForDetail).objectives?.learning_goal || '-'}</p>
                <p><strong>Completion Conditions:</strong></p>
                <ul>
                  {asArray(getScenarioData(selectedScenarioForDetail).objectives?.completion_conditions).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                  {!asArray(getScenarioData(selectedScenarioForDetail).objectives?.completion_conditions).length && <li>-</li>}
                </ul>
              </div>

              <div className="detail-section full-width">
                <h4>Objectives & Detection Cues</h4>
                <ul>
                  {asArray(getScenarioData(selectedScenarioForDetail).conversation_objectives).map((obj, idx) => (
                    <li key={idx}>
                      <strong>{obj?.objective_id || `Objective ${idx + 1}`}</strong>: {obj?.description || '-'}{" "}
                      {asArray(obj?.detection_cues).length > 0 && (
                        <span className="text-slate-500 font-semibold italic text-xs">
                          (Cues: {asArray(obj?.detection_cues).join(", ")})
                        </span>
                      )}
                    </li>
                  ))}
                  {!asArray(getScenarioData(selectedScenarioForDetail).conversation_objectives).length && <li>-</li>}
                </ul>
              </div>

              <div className="detail-section full-width">
                <h4>Assessment Rubric</h4>
                <ul>
                  {asArray(getScenarioData(selectedScenarioForDetail).rubric).map((rub, idx) => (
                    <li key={idx}>
                      <span className="capitalize font-semibold text-slate-900">
                        {String(rub?.criterion || `Criterion ${idx + 1}`).replaceAll('_', ' ')}
                      </span>: {rub?.description || '-'}
                    </li>
                  ))}
                  {!asArray(getScenarioData(selectedScenarioForDetail).rubric).length && <li>-</li>}
                </ul>
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => {
                    const scenarioToEdit = selectedScenarioForDetail;
                    setSelectedScenarioForDetail(null);
                    openEditScenario(scenarioToEdit);
                  }}
                >
                  <Edit2 size={14} /> Edit Scenario
                </button>
                <button
                  type="button"
                  className="text-button"
                  style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                  onClick={() => {
                    const scenarioIdToDelete = getScenarioDocumentId(selectedScenarioForDetail);
                    setSelectedScenarioForDetail(null);
                    handleDeleteScenario(scenarioIdToDelete);
                  }}
                >
                  <Trash2 size={14} /> Delete Scenario
                </button>
              </div>
              <button type="button" className="primary-action" onClick={() => setSelectedScenarioForDetail(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
