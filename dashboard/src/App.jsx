import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  Edit2,
  Eye,
  FileText,
  GraduationCap,
  Key,
  LogOut,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { LoginForm } from './components/login-form';
import { AppSidebar } from './components/app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from './components/ui/sidebar';
import './App.css';

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

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
    objectivesText: (data.conversation_objectives || []).map((objective) =>
      `${objective.objective_id} | ${objective.description} | ${(objective.detection_cues || []).join(', ')}`
    ).join('\n') || emptyScenarioBuilder.objectivesText,
    minResponses: rules.minimum_student_responses || 5,
    targetMin: rules.target_student_responses_min || 6,
    targetMax: rules.target_student_responses_max || 8,
    maxResponses: rules.maximum_student_responses || 10,
    completionConditions: parseLines(data.objectives?.completion_conditions?.join?.('\n') || '').join('\n') || emptyScenarioBuilder.completionConditions,
    closingInstruction: rules.natural_closing_message || emptyScenarioBuilder.closingInstruction,
    locationBoundaries: context.boundaries?.join?.('\n') || data.boundaries?.location || emptyScenarioBuilder.locationBoundaries,
    roleBoundaries: data.boundaries?.role || emptyScenarioBuilder.roleBoundaries,
    forbiddenTopics: context.forbidden_terms?.join?.(', ') || emptyScenarioBuilder.forbiddenTopics,
    rubricText: (data.rubric || []).map((item) => `${item.criterion} | ${item.description}`).join('\n') || emptyScenarioBuilder.rubricText,
    goodExamples: scenario.good_response_examples?.join?.('\n') || emptyScenarioBuilder.goodExamples,
    poorExamples: scenario.poor_response_examples?.join?.('\n') || emptyScenarioBuilder.poorExamples,
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

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('jwt_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user_profile') || 'null'));
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
  const [selectedScenarioForDetail, setSelectedScenarioForDetail] = useState(null);
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);
  const [editingScenarioId, setEditingScenarioId] = useState(null);
  const [builder, setBuilder] = useState(emptyScenarioBuilder);
  const [advancedJsonOpen, setAdvancedJsonOpen] = useState(false);
  const [lecturerForm, setLecturerForm] = useState({ name: '', email: '', password: '', gender: 'female' });
  const [createdLecturerCode, setCreatedLecturerCode] = useState('');

  useEffect(() => {
    if (!user) return setActiveTab('');
    setActiveTab(user.role === 'admin' ? 'scenarios' : 'overview');
  }, [user]);

  useEffect(() => {
    if (!token) return;
    if (activeTab === 'scenarios') fetchAdminScenarios();
    if (activeTab === 'lecturers') fetchAdminLecturers();
    if (activeTab === 'overview') fetchOverviewData();
    if (activeTab === 'students') fetchLecturerStudents();
    if (activeTab === 'history') fetchLecturerHistory();
  }, [activeTab, token]);

  const callApi = async (endpoint, method = 'GET', body = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Server request failed');
    return data;
  };

  const saveAuth = (newToken, profile) => {
    localStorage.setItem('jwt_token', newToken);
    localStorage.setItem('user_profile', JSON.stringify(profile));
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
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
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

  const fetchAdminScenarios = async () => {
    try { setScenarios(await callApi('/api/admin/scenarios')); } catch (error) { console.error(error); }
  };

  const fetchAdminLecturers = async () => {
    try { setLecturers(await callApi('/api/admin/lecturers')); } catch (error) { console.error(error); }
  };

  const fetchLecturerStudents = async () => {
    try { setStudents(await callApi('/api/lecturer/students')); } catch (error) { console.error(error); }
  };

  const fetchLecturerHistory = async () => {
    try { setHistory(await callApi('/api/lecturer/history')); } catch (error) { console.error(error); }
  };

  const fetchOverviewData = async () => {
    await Promise.all([fetchLecturerStudents(), fetchLecturerHistory()]);
  };

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

  const openNewScenario = () => {
    setEditingScenarioId(null);
    setBuilder(emptyScenarioBuilder);
    setAdvancedJsonOpen(false);
    setErrorMessage('');
    setScenarioModalOpen(true);
  };

  const openEditScenario = (scenario) => {
    setEditingScenarioId(scenario._id);
    setBuilder(scenarioToBuilder(scenario));
    setAdvancedJsonOpen(false);
    setErrorMessage('');
    setScenarioModalOpen(true);
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
      fetchAdminScenarios();
    } catch (error) {
      setErrorMessage(error.message || 'Scenario tidak bisa disimpan.');
    }
  };

  const handleDeleteScenario = async (id) => {
    if (!confirm('Hapus skenario ini dari database?')) return;
    try {
      await callApi(`/api/admin/scenarios/${id}`, 'DELETE');
      fetchAdminScenarios();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleToggleScenarioStatus = async (id, currentStatus) => {
    try {
      await callApi(`/api/admin/scenarios/${id}`, 'PUT', { isActive: !currentStatus });
      fetchAdminScenarios();
    } catch (error) {
      alert(error.message);
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
      fetchAdminLecturers();
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const exportHistoryToCSV = () => {
    if (!history.length) return alert('Tidak ada data riwayat untuk diekspor.');
    const headers = ['NIM', 'Nama', 'Consent', 'Scenario ID', 'Judul', 'Selesai', 'Durasi', 'Respons', 'Status', 'Skor', ...Object.values(scoreLabels)];
    const rows = history.map((item) => [
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
              <div className="panel-heading"><h3>Scenarios List</h3><span>{scenarios.length} {scenarios.length === 1 ? 'item' : 'items'}</span></div>
              <div className="custom-table-container">
                <table className="custom-table">
                  <thead><tr><th>ID</th><th>Title</th><th>AI Role</th><th>Status</th></tr></thead>
                  <tbody>
                    {scenarios.map((scenario) => (
                      <tr key={scenario._id}>
                        <td><strong>{scenario.scenarioId}</strong></td>
                        <td>
                          <button
                            type="button"
                            className="hover:underline font-semibold text-left text-slate-900"
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                            onClick={() => setSelectedScenarioForDetail(scenario)}
                          >
                            {scenario.title}
                          </button>
                        </td>
                        <td>{scenario.data?.scenario?.ai_role || '-'}</td>
                        <td>
                          <button
                            className={`status-pill ${scenario.isActive ? "active" : "inactive"}`}
                            onClick={() => handleToggleScenarioStatus(scenario._id, scenario.isActive)}
                          >
                            {scenario.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!scenarios.length && <tr><td colSpan="4" className="empty-cell">No scenarios found.</td></tr>}
                  </tbody>
                </table>
              </div>
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
              <div className="panel-heading"><h3>Lecturer List</h3><span>{lecturers.length} {lecturers.length === 1 ? 'account' : 'accounts'}</span></div>
              <table className="custom-table"><thead><tr><th>Name</th><th>Email</th><th>Code</th><th>Registered</th></tr></thead><tbody>
                {lecturers.map((lecturer) => <tr key={lecturer.id}><td>{lecturer.name}</td><td>{lecturer.email}</td><td><strong>{lecturer.lecturerCode}</strong></td><td>{lecturer.createdAt ? new Date(lecturer.createdAt).toLocaleDateString('en-US') : '-'}</td></tr>)}
              </tbody></table>
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
            <div className="panel-heading"><h3>Registered Students</h3><span>{students.length} {students.length === 1 ? 'student' : 'students'}</span></div>
            <table className="custom-table">
              <thead><tr><th>Student ID</th><th>Name</th><th>Email</th><th>Consent</th><th>Registered</th></tr></thead>
              <tbody>
                {students.map((student) => (
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
                {!students.length && <tr><td colSpan="5" className="empty-cell">No students registered yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {user.role === 'lecturer' && activeTab === 'history' && (
          <section className="screen-stack">
            <div className="action-row"><p>This history can be exported as research data.</p><button className="primary-action" onClick={exportHistoryToCSV}><Download size={16} /> Export CSV</button></div>
            <div className="data-panel">
              <table className="custom-table">
                <thead><tr><th>Student ID</th><th>Student</th><th>Scenario</th><th>Completed At</th><th>Duration</th><th>Responses</th><th>Score</th><th>Action</th></tr></thead>
                <tbody>
                  {history.map((item, index) => (
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
                  {!history.length && <tr><td colSpan="8" className="empty-cell">No practice sessions yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
      </SidebarInset>

      {scenarioModalOpen && (
        <div className="modal-backdrop">
          <form className="scenario-modal" onSubmit={handleSaveScenario}>
            <div className="panel-heading">
              <div><h3>{editingScenarioId ? 'Edit Scenario Builder' : 'Create Scenario Builder'}</h3><span>Do not use specific names as fixed characters.</span></div>
              <button type="button" className="text-button" onClick={() => setScenarioModalOpen(false)}>Close</button>
            </div>
            {errorMessage && <div className="error-box">{errorMessage}</div>}
            <div className="builder-grid">
              <label>Scenario ID<input required disabled={!!editingScenarioId} value={builder.scenarioId} onChange={(event) => setBuilder({ ...builder, scenarioId: event.target.value })} placeholder="G-ICC-011" /></label>
              <label>Title<input required value={builder.title} onChange={(event) => setBuilder({ ...builder, title: event.target.value })} placeholder="Meeting an International Student on Campus" /></label>
              <label>Type<input value={builder.type} onChange={(event) => setBuilder({ ...builder, type: event.target.value })} /></label>
              <label>Level<input value={builder.level} onChange={(event) => setBuilder({ ...builder, level: event.target.value })} /></label>
              <label>AR Scene<input value={builder.arScene} onChange={(event) => setBuilder({ ...builder, arScene: event.target.value })} placeholder="International Office" /></label>
              <label>Student Role<input value={builder.studentRole} onChange={(event) => setBuilder({ ...builder, studentRole: event.target.value })} /></label>
              <label>AI Role<input value={builder.aiRole} onChange={(event) => setBuilder({ ...builder, aiRole: event.target.value })} /></label>
              <label>AI Personality<input value={builder.aiPersonality} onChange={(event) => setBuilder({ ...builder, aiPersonality: event.target.value })} /></label>
            </div>
            <label>Setting description<textarea rows="2" value={builder.sceneDescription} onChange={(event) => setBuilder({ ...builder, sceneDescription: event.target.value })} /></label>
            <label>Learning goal<textarea rows="2" value={builder.learningGoal} onChange={(event) => setBuilder({ ...builder, learningGoal: event.target.value })} /></label>
            <label>Student task<textarea rows="2" value={builder.studentTask} onChange={(event) => setBuilder({ ...builder, studentTask: event.target.value })} /></label>
            <label>Objectives, one line per item: id | description | detection_cues<textarea rows="4" value={builder.objectivesText} onChange={(event) => setBuilder({ ...builder, objectivesText: event.target.value })} /></label>
            <div className="builder-grid compact">
              <label>Minimum responses<input type="number" min="1" value={builder.minResponses} onChange={(event) => setBuilder({ ...builder, minResponses: event.target.value })} /></label>
              <label>Target min<input type="number" min="1" value={builder.targetMin} onChange={(event) => setBuilder({ ...builder, targetMin: event.target.value })} /></label>
              <label>Target max<input type="number" min="1" value={builder.targetMax} onChange={(event) => setBuilder({ ...builder, targetMax: event.target.value })} /></label>
              <label>Maximum<input type="number" min="1" value={builder.maxResponses} onChange={(event) => setBuilder({ ...builder, maxResponses: event.target.value })} /></label>
            </div>
            <label>Completion conditions<textarea rows="3" value={builder.completionConditions} onChange={(event) => setBuilder({ ...builder, completionConditions: event.target.value })} /></label>
            <label>Location boundaries<textarea rows="2" value={builder.locationBoundaries} onChange={(event) => setBuilder({ ...builder, locationBoundaries: event.target.value })} /></label>
            <label>Role boundaries<textarea rows="2" value={builder.roleBoundaries} onChange={(event) => setBuilder({ ...builder, roleBoundaries: event.target.value })} /></label>
            <label>Rubric: criterion | description<textarea rows="4" value={builder.rubricText} onChange={(event) => setBuilder({ ...builder, rubricText: event.target.value })} /></label>
            <div className="modal-options">
              <label className="switch-row"><input type="checkbox" checked={builder.isActive} onChange={(event) => setBuilder({ ...builder, isActive: event.target.checked })} /> Active on mobile</label>
              <button type="button" className="text-button" onClick={() => setAdvancedJsonOpen(!advancedJsonOpen)}>Advanced JSON</button>
            </div>
            {advancedJsonOpen && <label>Raw JSON override<textarea rows="8" value={builder.rawJson || JSON.stringify(buildScenarioData(builder), null, 2)} onChange={(event) => setBuilder({ ...builder, rawJson: event.target.value })} /></label>}
            <div className="modal-actions"><button type="button" className="secondary-action" onClick={() => setScenarioModalOpen(false)}>Cancel</button><button className="primary-action">Save Scenario</button></div>
          </form>
        </div>
      )}

      {selectedSession && (
        <div className="modal-backdrop">
          <div className="transcript-modal">
            <div className="panel-heading">
              <div><h3>Transcript & Analysis</h3><span>{selectedSession.student_details?.name} - {selectedSession.scenario?.title}</span></div>
              <button className="text-button" onClick={() => setSelectedSession(null)}>Close</button>
            </div>
            <div className="transcript-grid">
              <div className="chat-log">
                {(selectedSession.transcript || []).map((chat, index) => <div key={index} className={chat.speaker === 'AI' ? 'bubble ai' : 'bubble student'}><span>{chat.speaker === 'AI' ? selectedSession.scenario?.ai_role || 'AI' : 'Student'}</span><p>{chat.message}</p></div>)}
              </div>
              <div className="score-panel">
                <strong className="big-score">{Number(selectedSession.overall_score || 0).toFixed(2)}</strong>
                <span>Overall Score / 5</span>
                {Object.entries(scoreLabels).map(([key, label]) => <ProgressMetric key={key} label={label} value={selectedSession.average_scores?.[key]} />)}
              </div>
            </div>
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
                <p><strong>Type:</strong> {selectedScenarioForDetail.data?.scenario?.scenario_type || '-'}</p>
                <p><strong>Level:</strong> {selectedScenarioForDetail.data?.scenario?.level || '-'}</p>
                <p><strong>AR Scene:</strong> {selectedScenarioForDetail.data?.scenario?.ar_scene || '-'}</p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span className={`status-badge ${selectedScenarioForDetail.isActive ? 'active' : 'inactive'}`}>
                    {selectedScenarioForDetail.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>

              <div className="detail-section">
                <h4>Roles & Boundaries</h4>
                <p><strong>Student Role:</strong> {selectedScenarioForDetail.data?.scenario?.student_role || '-'}</p>
                <p><strong>AI Role:</strong> {selectedScenarioForDetail.data?.scenario?.ai_role || '-'}</p>
                <p><strong>Location Boundaries:</strong> {selectedScenarioForDetail.data?.boundaries?.location || '-'}</p>
                <p><strong>Role Boundaries:</strong> {selectedScenarioForDetail.data?.boundaries?.role || '-'}</p>
              </div>

              <div className="detail-section full-width">
                <h4>Scenario Context & Background</h4>
                <p><strong>Setting Situation:</strong> {selectedScenarioForDetail.data?.context?.situation || '-'}</p>
                <p><strong>Student Task Instruction:</strong> {selectedScenarioForDetail.data?.scenario?.task_instruction || '-'}</p>
                <p><strong>AI Character Prompt:</strong> {selectedScenarioForDetail.data?.scenario?.ai_character_prompt || '-'}</p>
              </div>

              <div className="detail-section full-width">
                <h4>Goals & Completion</h4>
                <p><strong>Learning Goal:</strong> {selectedScenarioForDetail.data?.scenario?.learning_goal || '-'}</p>
                <p><strong>Completion Conditions:</strong></p>
                <ul>
                  {(selectedScenarioForDetail.data?.objectives?.completion_conditions || []).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="detail-section full-width">
                <h4>Objectives & Detection Cues</h4>
                <ul>
                  {(selectedScenarioForDetail.data?.conversation_objectives || []).map((obj, idx) => (
                    <li key={idx}>
                      <strong>{obj.objective_id}</strong>: {obj.description}{" "}
                      {obj.detection_cues?.length > 0 && (
                        <span className="text-slate-500 font-semibold italic text-xs">
                          (Cues: {obj.detection_cues.join(", ")})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="detail-section full-width">
                <h4>Assessment Rubric</h4>
                <ul>
                  {(selectedScenarioForDetail.data?.rubric || []).map((rub, idx) => (
                    <li key={idx}>
                      <span className="capitalize font-semibold text-slate-900">{rub.criterion.replace('_', ' ')}</span>: {rub.description}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => {
                    openEditScenario(selectedScenarioForDetail);
                    setSelectedScenarioForDetail(null);
                  }}
                >
                  <Edit2 size={14} /> Edit Scenario
                </button>
                <button
                  type="button"
                  className="text-button"
                  style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                  onClick={() => {
                    handleDeleteScenario(selectedScenarioForDetail._id);
                    setSelectedScenarioForDetail(null);
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
