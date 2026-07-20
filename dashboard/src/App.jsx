import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Users, Receipt, Flag, LogOut, CheckCircle, XCircle, 
  Plus, Edit2, Trash2, Key, Download, ChevronRight, Settings, Database,
  TrendingUp, Activity, Award, UserCheck, ShieldCheck
} from 'lucide-react';

const DEFAULT_API_BASE_URL = 'http://localhost:3000';

// Format template JSON skenario default untuk admin agar mudah membuat skenario baru
const DEFAULT_SCENARIO_JSON = {
  "schema_version": "2.0",
  "prototype_id": "scenario-custom-id",
  "scenario": {
    "scenario_id": "CUSTOM-001",
    "title": "Judul Skenario Baru",
    "scenario_type": "Intercultural English",
    "level": "B1",
    "ar_scene": "Classroom",
    "student_role": "Indonesian Student",
    "ai_role": "Foreign exchange student",
    "icc_dimension": ["Knowledge", "Attitudes"],
    "cultural_focus": ["General customs"],
    "learning_goal": "Practice greeting and introduction.",
    "task_instruction": "Introduce yourself to your new foreign classmate politely.",
    "ai_character_prompt": "You are a friendly foreign exchange student on campus.",
    "good_response_examples": ["Hello, nice to meet you."],
    "poor_response_examples": ["Hey, who are you?"],
    "cultural_note": "A friendly greeting helps build rapport."
  },
  "context": {
    "scene_title": "Classroom Greeting",
    "setting": "Campus Classroom",
    "situation": "Meeting a classmate for the first time.",
    "boundaries": ["Remain in classroom."],
    "forbidden_terms": ["money", "family private"]
  },
  "characters": [
    {
      "name": "Student",
      "role": "Student learner",
      "profile": "Student practice partner"
    },
    {
      "name": "AI Partner",
      "role": "AI conversation partner",
      "profile": "Foreign exchange student"
    }
  ],
  "prototype_scope": {
    "input_mode": "voice_with_text_fallback",
    "voice_enabled": true,
    "ar_enabled": true,
    "avatar_enabled": true,
    "scoring_enabled": true,
    "feedback_enabled": true,
    "max_turns": 8,
    "prototype_focus": "Speaking practice"
  },
  "session_rules": {
    "minimum_student_responses": 4,
    "target_student_responses_min": 5,
    "target_student_responses_max": 7,
    "maximum_student_responses": 8,
    "required_objective_ids": ["greet_politely"],
    "natural_closing_message": "Great meeting you. See you in class!"
  },
  "conversation_objectives": [
    {
      "objective_id": "greet_politely",
      "description": "Greet the classmate politely.",
      "detection_cues": ["hello", "hi", "nice to meet", "introduce"],
      "ai_follow_up": "Hello there! Nice to meet you too."
    }
  ],
  "conversation_stages": [
    {
      "stage_order": 1,
      "stage": "Opening",
      "speaker": "AI",
      "message_or_student_goal": "Hi, is this seat taken?",
      "expected_function": "Greeting trigger",
      "success_indicator": "Student responds politely"
    }
  ],
  "conversation_flow": [
    {
      "turn": 1,
      "stage": "Opening",
      "speaker": "AI",
      "message": "Hi, is this seat taken?",
      "expected_function": "Greeting trigger",
      "success_indicator": "Student responds politely"
    }
  ],
  "branching_rules": [
    {
      "rule_id": "BR-001",
      "student_response_category": "GOOD",
      "detection_cues": ["polite", "friendly"],
      "ai_response_strategy": "Model positive interaction",
      "example_ai_response": "Nice to meet you.",
      "feedback_focus": "Good job",
      "score_impact": "+1 politeness"
    }
  ],
  "fallback_responses": {
    "GOOD": "Thank you for the warm welcome. I look forward to working with you.",
    "ACCEPTABLE": "Thanks. That sounds fine.",
    "TOO_DIRECT": "Okay. Let's get started.",
    "STEREOTYPING": "Please avoid generalizations.",
    "TOO_PERSONAL": "I'd prefer not to discuss that.",
    "DISMISSIVE": "Let's focus on class.",
    "SILENCE_OR_UNCLEAR": "Sorry, I didn't catch that."
  }
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('jwt_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user_profile') || 'null'));
  const [apiBaseUrl, setApiBaseUrl] = useState(localStorage.getItem('api_base_url') || DEFAULT_API_BASE_URL);
  
  // States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Admin states
  const [scenarios, setScenarios] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [scenarioFormId, setScenarioFormId] = useState(null); // null = tambah baru, String = edit
  const [scenarioFormIdStr, setScenarioFormIdStr] = useState(''); // e.g. "L-ICC-003"
  const [scenarioFormTitle, setScenarioFormTitle] = useState('');
  const [scenarioFormIsActive, setScenarioFormIsActive] = useState(true);
  const [scenarioFormJson, setScenarioFormJson] = useState('');
  
  const [lecturerFormName, setLecturerFormName] = useState('');
  const [lecturerFormEmail, setLecturerFormEmail] = useState('');
  const [lecturerFormPassword, setLecturerFormPassword] = useState('');
  const [lecturerFormGender, setLecturerFormGender] = useState('female');
  const [createdLecturerCode, setCreatedLecturerCode] = useState('');

  // Lecturer states
  const [students, setStudents] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null); // detail transkrip popup

  // Auto route tab based on role
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        setActiveTab('scenarios');
      } else if (user.role === 'lecturer') {
        setActiveTab('overview');
      }
    } else {
      setActiveTab('');
    }
  }, [user]);

  // Fetch initial data based on tab
  useEffect(() => {
    if (!token) return;
    if (activeTab === 'scenarios') fetchAdminScenarios();
    if (activeTab === 'lecturers') fetchAdminLecturers();
    if (activeTab === 'students') fetchLecturerStudents();
    if (activeTab === 'history') fetchLecturerHistory();
    if (activeTab === 'overview') fetchOverviewData();
  }, [activeTab, token]);

  const saveAuth = (newToken, newProfile) => {
    localStorage.setItem('jwt_token', newToken);
    localStorage.setItem('user_profile', JSON.stringify(newProfile));
    setToken(newToken);
    setUser(newProfile);
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_profile');
    setToken('');
    setUser(null);
  };

  const handleSaveConfig = (val) => {
    const cleaned = val.trim();
    localStorage.setItem('api_base_url', cleaned);
    setApiBaseUrl(cleaned);
    setShowConfig(false);
  };

  // Generic Fetch wrapper
  const callApi = async (endpoint, method = 'GET', body = null) => {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const config = { method, headers };
    if (body) {
      config.body = JSON.stringify(body);
    }
    const response = await fetch(`${apiBaseUrl}${endpoint}`, config);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Server request failed');
    }
    return data;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      const data = await callApi('/api/auth/login', 'POST', { email, password });
      if (data.user.role === 'student') {
        throw new Error('Akses ditolak. Aplikasi web ini hanya untuk dosen dan admin.');
      }
      saveAuth(data.token, data.user);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // API Admin
  const fetchAdminScenarios = async () => {
    try {
      const data = await callApi('/api/admin/scenarios');
      setScenarios(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminLecturers = async () => {
    try {
      const data = await callApi('/api/admin/lecturers');
      setLecturers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveScenario = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    let parsedJson;
    try {
      parsedJson = JSON.parse(scenarioFormJson);
      // Validasi kecil agar ID sync
      parsedJson.scenario.scenario_id = scenarioFormIdStr.trim().toUpperCase();
      parsedJson.scenario.title = scenarioFormTitle.trim();
    } catch (err) {
      setErrorMessage('Format data JSON salah. Pastikan sintaksis JSON Anda valid.');
      return;
    }

    try {
      if (scenarioFormId) {
        // Edit
        await callApi(`/api/admin/scenarios/${scenarioFormId}`, 'PUT', {
          title: scenarioFormTitle.trim(),
          isActive: scenarioFormIsActive,
          data: parsedJson
        });
      } else {
        // Tambah baru
        await callApi('/api/admin/scenarios', 'POST', {
          scenarioId: scenarioFormIdStr.trim().toUpperCase(),
          title: scenarioFormTitle.trim(),
          isActive: scenarioFormIsActive,
          data: parsedJson
        });
      }
      setShowScenarioModal(false);
      fetchAdminScenarios();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleDeleteScenario = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus skenario ini?')) return;
    try {
      await callApi(`/api/admin/scenarios/${id}`, 'DELETE');
      fetchAdminScenarios();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleScenarioStatus = async (id, currentStatus) => {
    try {
      await callApi(`/api/admin/scenarios/${id}`, 'PUT', {
        isActive: !currentStatus
      });
      fetchAdminScenarios();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateLecturer = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setCreatedLecturerCode('');
    try {
      const data = await callApi('/api/admin/create-lecturer', 'POST', {
        name: lecturerFormName.trim(),
        email: lecturerFormEmail.trim(),
        password: lecturerFormPassword,
        gender: lecturerFormGender
      });
      setCreatedLecturerCode(data.lecturer.lecturerCode);
      setLecturerFormName('');
      setLecturerFormEmail('');
      setLecturerFormPassword('');
      fetchAdminLecturers();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // API Lecturer
  const fetchLecturerStudents = async () => {
    try {
      const data = await callApi('/api/lecturer/students');
      setStudents(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLecturerHistory = async () => {
    try {
      const data = await callApi('/api/lecturer/history');
      setHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOverviewData = async () => {
    // Memanggil endpoints lecturer untuk overview
    await fetchLecturerStudents();
    await fetchLecturerHistory();
  };

  // Ekspor CSV dari history bimbingan
  const exportHistoryToCSV = () => {
    if (history.length === 0) {
      alert('Tidak ada data riwayat untuk diekspor.');
      return;
    }
    
    const headers = [
      'NIM', 'Nama Mahasiswa', 'Consent Penelitian', 'Skenario ID', 'Judul Skenario', 
      'Tanggal Selesai', 'Durasi (Detik)', 'Jumlah Respons', 'Status', 'Alasan Selesai', 'Skor Akhir',
      'Rata-rata Grammar', 'Rata-rata Vocabulary', 'Rata-rata Fluency', 
      'Rata-rata Politeness', 'Rata-rata Pragmatic', 'Rata-rata ICC'
    ];

    const rows = history.map(h => [
      h.student_details?.student_id || '',
      h.student_details?.name || '',
      h.student_details?.consent ? 'YA' : 'TIDAK',
      h.scenario?.scenario_id || '',
      h.scenario?.title || '',
      h.completed_at || '',
      h.duration_seconds || 0,
      h.student_response_count || 0,
      h.status || '',
      h.end_reason || '',
      h.overall_score || 0,
      h.average_scores?.grammar || 0,
      h.average_scores?.vocabulary || 0,
      h.average_scores?.fluency || 0,
      h.average_scores?.politeness || 0,
      h.average_scores?.pragmatic_appropriateness || 0,
      h.average_scores?.intercultural_awareness || 0
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data_Penelitian_ICC_${user.lecturerCode || 'Lecturer'}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Hitung rata-rata evaluasi global mahasiswa untuk Radar Chart
  const getAverageMetrics = () => {
    if (history.length === 0) return { grammar: 0, vocabulary: 0, fluency: 0, politeness: 0, pragmatic: 0, icc: 0 };
    let g = 0, v = 0, f = 0, p = 0, pr = 0, ic = 0;
    history.forEach(h => {
      g += h.average_scores?.grammar || 0;
      v += h.average_scores?.vocabulary || 0;
      f += h.average_scores?.fluency || 0;
      p += h.average_scores?.politeness || 0;
      pr += h.average_scores?.pragmatic_appropriateness || 0;
      ic += h.average_scores?.intercultural_awareness || 0;
    });
    const len = history.length;
    return {
      grammar: g / len,
      vocabulary: v / len,
      fluency: f / len,
      politeness: p / len,
      pragmatic: pr / len,
      icc: ic / len
    };
  };

  const avgMetrics = getAverageMetrics();

  // Custom SVG Radar Chart generator
  const renderRadarChart = () => {
    const labels = [
      { name: 'Grammar', key: 'grammar' },
      { name: 'Vocabulary', key: 'vocabulary' },
      { name: 'Fluency', key: 'fluency' },
      { name: 'Politeness', key: 'politeness' },
      { name: 'Pragmatic Appr.', key: 'pragmatic' },
      { name: 'Intercultural Awareness', key: 'icc' }
    ];

    const cx = 200;
    const cy = 180;
    const maxVal = 5;
    const rMax = 120; // Radius maksimum untuk nilai 5

    // Fungsi menghitung koordinat x, y berdasarkan nilai (1-5) dan index sumbu (0-5)
    const getCoordinates = (value, index) => {
      const angle = (index * 60 - 90) * Math.PI / 180;
      const r = (value / maxVal) * rMax;
      return {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle)
      };
    };

    // Grid konsentris (skala 1 sampai 5)
    const gridLines = [];
    for (let currentScale = 1; currentScale <= 5; currentScale++) {
      const points = [];
      for (let i = 0; i < 6; i++) {
        const coord = getCoordinates(currentScale, i);
        points.push(`${coord.x},${coord.y}`);
      }
      gridLines.push(points.join(' '));
    }

    // Koordinat data mahasiswa
    const dataPoints = [];
    for (let i = 0; i < 6; i++) {
      const val = avgMetrics[labels[i].key] || 0;
      const coord = getCoordinates(val, i);
      dataPoints.push(`${coord.x},${coord.y}`);
    }
    const dataPolyline = dataPoints.join(' ');

    return (
      <svg width="100%" height="340" viewBox="0 0 400 360" style={{ overflow: 'visible' }}>
        {/* Lingkaran / Grid konsentris segi enam */}
        {gridLines.map((poly, idx) => (
          <polygon 
            key={idx} 
            points={poly} 
            fill="none" 
            stroke="rgba(255, 255, 255, 0.08)" 
            strokeWidth="1"
          />
        ))}

        {/* Skala Label */}
        {[1, 2, 3, 4, 5].map((val) => {
          const coord = getCoordinates(val, 0);
          return (
            <text 
              key={val} 
              x={coord.x + 6} 
              y={coord.y + 4} 
              fill="var(--text-muted)" 
              fontSize="9"
              fontWeight="600"
            >
              {val}
            </text>
          );
        })}

        {/* Garis Sumbu radial */}
        {Array.from({ length: 6 }).map((_, i) => {
          const outerCoord = getCoordinates(5, i);
          return (
            <line 
              key={i} 
              x1={cx} 
              y1={cy} 
              x2={outerCoord.x} 
              y2={outerCoord.y} 
              stroke="rgba(255, 255, 255, 0.08)" 
              strokeWidth="1"
            />
          );
        })}

        {/* Polygon Data Nilai */}
        {history.length > 0 && (
          <>
            <polygon 
              points={dataPolyline} 
              fill="rgba(16, 185, 129, 0.2)" 
              stroke="var(--accent-teal)" 
              strokeWidth="2.5"
            />
            {/* Titik-titik sudut nilai */}
            {dataPoints.map((pt, index) => {
              const [px, py] = pt.split(',');
              return (
                <circle 
                  key={index} 
                  cx={px} 
                  cy={py} 
                  r="5" 
                  fill="#0b0f19" 
                  stroke="var(--accent-teal)" 
                  strokeWidth="2" 
                />
              );
            })}
          </>
        )}

        {/* Label Sumbu */}
        {labels.map((lbl, i) => {
          // Label diposisikan sedikit di luar grid 5
          const outerCoord = getCoordinates(5.5, i);
          let textAnchor = 'middle';
          let dy = 4;
          
          if (i === 0) { dy = -6; }
          else if (i === 3) { dy = 14; }
          else if (i === 1 || i === 2) { textAnchor = 'start'; }
          else if (i === 4 || i === 5) { textAnchor = 'end'; }

          return (
            <text 
              key={i} 
              x={outerCoord.x} 
              y={outerCoord.y + dy} 
              fill={avgMetrics[lbl.key] > 0 ? 'var(--text-primary)' : 'var(--text-secondary)'} 
              fontSize="10.5" 
              fontWeight="700" 
              textAnchor={textAnchor}
            >
              {lbl.name}
            </text>
          );
        })}
      </svg>
    );
  };

  // Login Page Rendering
  if (!token || !user) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: '24px', background: 'radial-gradient(circle at top, #111827 0%, #030712 100%)'
      }}>
        {/* Setelan URL Server Pojok Kanan Atas */}
        <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="glass-panel"
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', 
              color: 'var(--text-secondary)', cursor: 'pointer', border: '1px solid var(--border-color)' 
            }}
          >
            <Settings size={16} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>API Config</span>
          </button>
          {showConfig && (
            <div className="glass-panel animate-fade-in" style={{
              position: 'absolute', right: 0, top: '48px', width: '280px', padding: '16px', zIndex: 10,
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
            }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Backend API Base URL
              </label>
              <input 
                type="text" 
                defaultValue={apiBaseUrl} 
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveConfig(e.target.value); }}
                onBlur={(e) => handleSaveConfig(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', background: '#030712', border: '1px solid var(--border-color)',
                  borderRadius: '8px', color: 'white', fontSize: '0.9rem', outline: 'none'
                }}
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Tekan ENTER atau klik di luar untuk menyimpan.
              </p>
            </div>
          )}
        </div>

        {/* Login Form Panel */}
        <div className="glass-panel animate-fade-in" style={{
          width: '100%', maxWidth: '420px', padding: '40px 32px', 
          border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ 
              display: 'inline-flex', padding: '14px', borderRadius: '16px', 
              background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '16px' 
            }}>
              <BookOpen size={36} color="var(--accent-teal)" />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.5px' }}>ICC Speaking Portal</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px' }}>
              Web Dashboard Dosen & Administrator
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Email Address
              </label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dosen@universitas.edu"
                style={{
                  width: '100%', padding: '12px 16px', background: '#070a13', border: '1px solid var(--border-color)',
                  borderRadius: '12px', color: 'white', outline: 'none', transition: 'border-color 0.2s'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Password
              </label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '12px 16px', background: '#070a13', border: '1px solid var(--border-color)',
                  borderRadius: '12px', color: 'white', outline: 'none'
                }}
              />
            </div>

            {errorMessage && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px', padding: '12px', color: '#fca5a5', fontSize: '0.8rem', fontWeight: 500
              }}>
                {errorMessage}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="btn-teal"
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', fontSize: '0.95rem',
                marginTop: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center'
              }}
            >
              {loading ? 'MENGHUBUNGKAN...' : 'MASUK KE PORTAL'}
            </button>
          </form>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '24px' }}>
          Server Terhubung: <code style={{ color: 'var(--text-secondary)' }}>{apiBaseUrl}</code>
        </p>
      </div>
    );
  }

  // Helper theme values
  const isTealTheme = user.role === 'lecturer';
  const themeAccentColor = isTealTheme ? 'var(--accent-teal)' : 'var(--accent-orange)';
  const themeCardBorderClass = isTealTheme ? 'glass-card-teal' : 'glass-card-orange';
  const themeBtnClass = isTealTheme ? 'btn-teal' : 'btn-orange';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      
      {/* Sidebar Navigasi */}
      <aside className="glass-panel" style={{
        width: '260px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column',
        borderRadius: 0, background: '#080c14'
      }}>
        {/* Header Profile */}
        <div style={{ padding: '28px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px', background: isTealTheme ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1px solid ${themeAccentColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {user.role === 'admin' ? <ShieldCheck size={20} color="var(--accent-orange)" /> : <UserCheck size={20} color="var(--accent-teal)" />}
            </div>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 800, maxLines: 1, overflow: 'ellipsis' }}>{user.name}</h2>
              <span style={{ 
                fontSize: '0.7rem', color: themeAccentColor, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' 
              }}>
                {user.role}
              </span>
            </div>
          </div>
          {user.role === 'lecturer' && (
            <div className="glass-panel" style={{
              marginTop: '16px', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>Kode Penelitian Anda</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'white', letterSpacing: '0.5px' }}>{user.lecturerCode}</span>
            </div>
          )}
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {user.role === 'admin' && (
            <>
              <button 
                onClick={() => setActiveTab('scenarios')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px',
                  borderRadius: '10px', background: activeTab === 'scenarios' ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                  color: activeTab === 'scenarios' ? 'var(--accent-orange)' : 'var(--text-secondary)',
                  cursor: 'pointer', border: 'none', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem'
                }}
              >
                <BookOpen size={18} />
                <span>Scenario CRUD</span>
              </button>
              <button 
                onClick={() => setActiveTab('lecturers')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px',
                  borderRadius: '10px', background: activeTab === 'lecturers' ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                  color: activeTab === 'lecturers' ? 'var(--accent-orange)' : 'var(--text-secondary)',
                  cursor: 'pointer', border: 'none', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem'
                }}
              >
                <Users size={18} />
                <span>Lecturers</span>
              </button>
            </>
          )}

          {user.role === 'lecturer' && (
            <>
              <button 
                onClick={() => setActiveTab('overview')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px',
                  borderRadius: '10px', background: activeTab === 'overview' ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                  color: activeTab === 'overview' ? 'var(--accent-teal)' : 'var(--text-secondary)',
                  cursor: 'pointer', border: 'none', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem'
                }}
              >
                <Activity size={18} />
                <span>Overview</span>
              </button>
              <button 
                onClick={() => setActiveTab('students')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px',
                  borderRadius: '10px', background: activeTab === 'students' ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                  color: activeTab === 'students' ? 'var(--accent-teal)' : 'var(--text-secondary)',
                  cursor: 'pointer', border: 'none', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem'
                }}
              >
                <Users size={18} />
                <span>Students</span>
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px',
                  borderRadius: '10px', background: activeTab === 'history' ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                  color: activeTab === 'history' ? 'var(--accent-teal)' : 'var(--text-secondary)',
                  cursor: 'pointer', border: 'none', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem'
                }}
              >
                <Receipt size={18} />
                <span>Practice History</span>
              </button>
            </>
          )}
        </nav>

        {/* Footer Log Out */}
        <div style={{ padding: '20px 16px', borderTop: '1px solid var(--border-color)' }}>
          <button 
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px',
              borderRadius: '10px', color: '#f87171', background: 'rgba(239, 68, 68, 0.04)',
              cursor: 'pointer', border: 'none', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem'
            }}
          >
            <LogOut size={18} />
            <span>Keluar Portal</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a0d16' }}>
        
        {/* Header Topbar */}
        <header style={{ 
          height: '70px', borderBottom: '1px solid var(--border-color)', display: 'flex', 
          alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', background: '#080c14' 
        }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
            {activeTab === 'scenarios' && 'Scenario Management'}
            {activeTab === 'lecturers' && 'Lecturer Accounts'}
            {activeTab === 'overview' && 'Research Overview'}
            {activeTab === 'students' && 'Registered Students'}
            {activeTab === 'history' && 'Speaking Practice History'}
          </h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>
            Server API: <span style={{ color: 'white' }}>{apiBaseUrl}</span>
          </div>
        </header>

        {/* Content Screens */}
        <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
          
          {/* TAB ADMIN: SCENARIO CRUD */}
          {activeTab === 'scenarios' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Kelola daftar skenario interaktif yang aktif di aplikasi mobile mahasiswa.
                </p>
                <button 
                  onClick={() => {
                    setScenarioFormId(null);
                    setScenarioFormIdStr('');
                    setScenarioFormTitle('');
                    setScenarioFormIsActive(true);
                    setScenarioFormJson(JSON.stringify(DEFAULT_SCENARIO_JSON, null, 2));
                    setErrorMessage('');
                    setShowScenarioModal(true);
                  }}
                  className="btn-orange"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontSize: '0.85rem' }}
                >
                  <Plus size={16} />
                  <span>Tambah Skenario</span>
                </button>
              </div>

              {/* Tabel Skenario */}
              <div className="glass-panel" style={{ padding: '8px', overflow: 'hidden' }}>
                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Scenario ID</th>
                        <th>Judul Skenario</th>
                        <th>Tipe / Kategori</th>
                        <th>Level</th>
                        <th>AR Scene</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarios.map(s => {
                        const originalData = s.data || {};
                        return (
                          <tr key={s._id}>
                            <td style={{ fontWeight: 800, color: 'var(--accent-orange)' }}>{s.scenarioId}</td>
                            <td style={{ fontWeight: 700 }}>{s.title}</td>
                            <td>{originalData.scenario?.scenario_type || '-'}</td>
                            <td>
                              <span style={{
                                padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)',
                                border: '1px solid var(--border-color)', fontSize: '0.75rem', fontWeight: 700
                              }}>
                                {originalData.scenario?.level || '-'}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>{originalData.scenario?.ar_scene || '-'}</td>
                            <td>
                              <button 
                                onClick={() => handleToggleScenarioStatus(s._id, s.isActive)}
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center'
                                }}
                              >
                                {s.isActive ? (
                                  <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                                    <CheckCircle size={14} /> Aktif
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                                    <XCircle size={14} /> Non-aktif
                                  </span>
                                )}
                              </button>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button 
                                  onClick={() => {
                                    setScenarioFormId(s._id);
                                    setScenarioFormIdStr(s.scenarioId);
                                    setScenarioFormTitle(s.title);
                                    setScenarioFormIsActive(s.isActive);
                                    setScenarioFormJson(JSON.stringify(s.data, null, 2));
                                    setErrorMessage('');
                                    setShowScenarioModal(true);
                                  }}
                                  style={{
                                    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)',
                                    color: 'white', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer'
                                  }}
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteScenario(s._id)}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                                    color: '#f87171', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer'
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {scenarios.length === 0 && (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                            Tidak ada skenario di database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB ADMIN: LECTURERS */}
          {activeTab === 'lecturers' && (
            <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '32px' }}>
              
              {/* Form Tambah Dosen */}
              <div className="glass-panel" style={{ padding: '32px', height: 'fit-content' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '20px' }}>Daftarkan Akun Dosen</h3>
                
                {createdLecturerCode && (
                  <div className="glass-card-orange animate-fade-in" style={{ padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-orange)', fontWeight: 800, display: 'block' }}>
                      DOSEN BERHASIL DIBUAT!
                    </span>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Lecturer Research Code berikut siap dibagikan ke mahasiswa:
                    </p>
                    <div style={{ 
                      background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px', padding: '10px 14px', marginTop: '10px', display: 'flex', 
                      alignItems: 'center', justifyContent: 'space-between'
                    }}>
                      <span style={{ fontWeight: 800, letterSpacing: '0.5px', color: 'white' }}>{createdLecturerCode}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(createdLecturerCode);
                          alert('Kode dosen berhasil disalin!');
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-orange)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}
                      >
                        SALIN
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleCreateLecturer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Nama Lengkap Dosen
                    </label>
                    <input 
                      type="text" required
                      value={lecturerFormName}
                      onChange={(e) => setLecturerFormName(e.target.value)}
                      placeholder="Dr. Ahmad Subarjo, M.Pd."
                      style={{
                        width: '100%', padding: '10px 14px', background: '#05070e', border: '1px solid var(--border-color)',
                        borderRadius: '10px', color: 'white', outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Email
                    </label>
                    <input 
                      type="email" required
                      value={lecturerFormEmail}
                      onChange={(e) => setLecturerFormEmail(e.target.value)}
                      placeholder="ahmad@dosen.univ.ac.id"
                      style={{
                        width: '100%', padding: '10px 14px', background: '#05070e', border: '1px solid var(--border-color)',
                        borderRadius: '10px', color: 'white', outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Password Akun
                    </label>
                    <input 
                      type="password" required
                      value={lecturerFormPassword}
                      onChange={(e) => setLecturerFormPassword(e.target.value)}
                      placeholder="Sandi dosen..."
                      style={{
                        width: '100%', padding: '10px 14px', background: '#05070e', border: '1px solid var(--border-color)',
                        borderRadius: '10px', color: 'white', outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Gender
                    </label>
                    <select 
                      value={lecturerFormGender} 
                      onChange={(e) => setLecturerFormGender(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 14px', background: '#05070e', border: '1px solid var(--border-color)',
                        borderRadius: '10px', color: 'white', outline: 'none'
                      }}
                    >
                      <option value="female">Perempuan</option>
                      <option value="male">Laki-laki</option>
                    </select>
                  </div>

                  {errorMessage && (
                    <div style={{ color: '#f87171', fontSize: '0.8rem', padding: '8px 0' }}>{errorMessage}</div>
                  )}

                  <button type="submit" className="btn-orange" style={{ padding: '12px', borderRadius: '10px', marginTop: '8px' }}>
                    BUAT AKUN DOSEN
                  </button>
                </form>
              </div>

              {/* Tabel Daftar Dosen */}
              <div className="glass-panel" style={{ padding: '8px', overflow: 'hidden' }}>
                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Nama Dosen</th>
                        <th>Email</th>
                        <th>Lecturer Code</th>
                        <th>Tanggal Terdaftar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lecturers.map(u => (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 800 }}>{u.name}</td>
                          <td>{u.email}</td>
                          <td style={{ fontWeight: 800, color: 'var(--accent-orange)' }}>{u.lecturerCode}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '-'}
                          </td>
                        </tr>
                      ))}
                      {lecturers.length === 0 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                            Belum ada dosen yang terdaftar.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB LECTURER: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* Statistik Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ 
                    padding: '16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.06)',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}>
                    <Users size={28} color="var(--accent-teal)" />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>Total Mahasiswa Bimbingan</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{students.length}</span>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ 
                    padding: '16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.06)',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}>
                    <TrendingUp size={28} color="var(--accent-teal)" />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>Sesi Latihan Selesai</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{history.length}</span>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ 
                    padding: '16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.06)',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}>
                    <Award size={28} color="var(--accent-teal)" />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>Rata-rata Skor Sesi</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>
                      {history.length > 0 
                        ? (history.reduce((acc, h) => acc + h.overall_score, 0) / history.length).toFixed(2) 
                        : '0.00'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Radar Chart Visualisasi & Legend */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '32px' }}>
                <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, textAlign: 'left', marginBottom: '24px' }}>
                    Radar Skor Rata-Rata Kemampuan Intercultural Mahasiswa
                  </h3>
                  {history.length > 0 ? (
                    renderRadarChart()
                  ) : (
                    <div style={{ padding: '80px 0', color: 'var(--text-muted)' }}>
                      Tidak ada data nilai untuk divisualisasikan.
                    </div>
                  )}
                </div>

                <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '8px' }}>Rincian Nilai Aspek</h3>
                  
                  {Object.entries(avgMetrics).map(([key, val]) => {
                    const labelName = {
                      grammar: 'Grammar',
                      vocabulary: 'Vocabulary',
                      fluency: 'Fluency',
                      politeness: 'Politeness',
                      pragmatic: 'Pragmatic Appropriateness',
                      icc: 'Intercultural Awareness'
                    }[key];
                    return (
                      <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{labelName}</span>
                          <span style={{ fontWeight: 800, color: 'var(--accent-teal)' }}>{val.toFixed(2)} / 5.00</span>
                        </div>
                        {/* Progress bar */}
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ 
                            height: '100%', background: 'var(--accent-teal)', width: `${(val / 5) * 100}%`,
                            boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB LECTURER: STUDENTS LIST */}
          {activeTab === 'students' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '8px', overflow: 'hidden' }}>
              <div className="custom-table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Student ID / NIM</th>
                      <th>Nama Mahasiswa</th>
                      <th>Email</th>
                      <th>Gender</th>
                      <th>Consent Penelitian</th>
                      <th>Tanggal Terdaftar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 800, color: 'var(--accent-teal)' }}>{s.studentId || '-'}</td>
                        <td style={{ fontWeight: 700 }}>{s.name}</td>
                        <td>{s.email}</td>
                        <td style={{ textTransform: 'capitalize' }}>
                          {s.gender === 'female' ? 'Perempuan' : 'Laki-laki'}
                        </td>
                        <td>
                          {s.consent ? (
                            <span style={{
                              padding: '4px 10px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.08)',
                              border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.75rem', color: '#10b981', fontWeight: 800
                            }}>
                              DISETUJUI
                            </span>
                          ) : (
                            <span style={{
                              padding: '4px 10px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.75rem', color: '#f87171', fontWeight: 800
                            }}>
                              MENOLAK
                            </span>
                          )}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString('id-ID') : '-'}
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                          Belum ada mahasiswa bimbingan yang terdaftar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB LECTURER: HISTORY LIST */}
          {activeTab === 'history' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Pantau seluruh riwayat latihan dan ekspor transkrip chat untuk bahan data penelitian.
                </p>
                <button 
                  onClick={exportHistoryToCSV}
                  className="btn-teal"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontSize: '0.85rem' }}
                >
                  <Download size={16} />
                  <span>Ekspor Data CSV</span>
                </button>
              </div>

              {/* Tabel Riwayat Latihan */}
              <div className="glass-panel" style={{ padding: '8px', overflow: 'hidden' }}>
                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>NIM</th>
                        <th>Nama Mahasiswa</th>
                        <th>Judul Skenario</th>
                        <th>Tanggal Selesai</th>
                        <th>Durasi</th>
                        <th>Respons</th>
                        <th>Skor Akhir</th>
                        <th style={{ textAlign: 'right' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h, index) => (
                        <tr key={index}>
                          <td style={{ fontWeight: 800 }}>{h.student_details?.student_id || '-'}</td>
                          <td style={{ fontWeight: 700 }}>{h.student_details?.name || '-'}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', marginRight: '6px' }}>
                              [{h.scenario?.scenario_id}]
                            </span>
                            {h.scenario?.title}
                          </td>
                          <td>
                            {h.completed_at ? new Date(h.completed_at).toLocaleString('id-ID') : '-'}
                          </td>
                          <td>{h.duration_seconds || 0}s</td>
                          <td style={{ fontWeight: 700 }}>{h.student_response_count || 0}x</td>
                          <td style={{ fontWeight: 800, color: 'var(--accent-teal)' }}>
                            {h.overall_score ? h.overall_score.toFixed(2) : '0.00'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              onClick={() => setSelectedSession(h)}
                              style={{
                                background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)',
                                color: '#10b981', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                                fontSize: '0.75rem', fontWeight: 800
                              }}
                            >
                              Lihat Transkrip
                            </button>
                          </td>
                        </tr>
                      ))}
                      {history.length === 0 && (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                            Belum ada sesi latihan mahasiswa yang tercatat.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MODAL EDIT/TAMBAH SCENARIO (ADMIN) */}
      {showScenarioModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '100%', maxWidth: '800px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              {scenarioFormId ? 'Edit Skenario' : 'Tambah Skenario Baru'}
            </h3>

            <form onSubmit={handleSaveScenario} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Scenario ID
                  </label>
                  <input 
                    type="text" required
                    disabled={!!scenarioFormId}
                    value={scenarioFormIdStr}
                    onChange={(e) => setScenarioFormIdStr(e.target.value)}
                    placeholder="G-ICC-008"
                    style={{
                      width: '100%', padding: '10px 14px', background: '#05070e', border: '1px solid var(--border-color)',
                      borderRadius: '10px', color: 'white', outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Judul Skenario
                  </label>
                  <input 
                    type="text" required
                    value={scenarioFormTitle}
                    onChange={(e) => setScenarioFormTitle(e.target.value)}
                    placeholder="Meeting an International Student..."
                    style={{
                      width: '100%', padding: '10px 14px', background: '#05070e', border: '1px solid var(--border-color)',
                      borderRadius: '10px', color: 'white', outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status Skenario Aktif</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={scenarioFormIsActive}
                    onChange={(e) => setScenarioFormIsActive(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Struktur JSON Skenario Lengkap (ICC Config)
                </label>
                <textarea 
                  required
                  rows="14"
                  value={scenarioFormJson}
                  onChange={(e) => setScenarioFormJson(e.target.value)}
                  style={{
                    width: '100%', padding: '12px', background: '#03050a', border: '1px solid var(--border-color)',
                    borderRadius: '10px', color: '#34d399', fontFamily: 'monospace', fontSize: '0.8rem', outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {errorMessage && (
                <div style={{ color: '#f87171', fontSize: '0.8rem' }}>{errorMessage}</div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button 
                  type="button"
                  onClick={() => setShowScenarioModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)',
                    color: 'white', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600
                  }}
                >
                  BATAL
                </button>
                <button type="submit" className="btn-orange" style={{ padding: '10px 24px', borderRadius: '10px' }}>
                  SIMPAN SKENARIO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TRANSCRIPT DETAIL (LECTURER) */}
      {selectedSession && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '100%', maxWidth: '850px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Transkrip & Analisis Percakapan</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Mahasiswa: <span style={{ color: 'white', fontWeight: 700 }}>{selectedSession.student_details?.name} ({selectedSession.student_details?.student_id})</span>
                </span>
              </div>
              <button 
                onClick={() => setSelectedSession(null)}
                style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)',
                  color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600
                }}
              >
                Tutup
              </button>
            </div>

            {/* Layout Box */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '24px', flex: 1, minHeight: 0 }}>
              
              {/* Bubble Dialog Panel */}
              <div className="glass-panel" style={{ 
                padding: '20px', background: '#05070c', display: 'flex', flexDirection: 'column', 
                gap: '14px', maxHeight: '50vh', overflowY: 'auto', borderRadius: '12px' 
              }}>
                {(selectedSession.transcript || []).map((chat, idx) => {
                  const isAi = chat.speaker === 'AI';
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        alignSelf: isAi ? 'flex-start' : 'flex-end',
                        maxWidth: '85%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <span style={{ 
                        fontSize: '0.7rem', color: isAi ? 'var(--accent-teal)' : 'var(--text-secondary)', 
                        fontWeight: 700, alignSelf: isAi ? 'flex-start' : 'flex-end'
                      }}>
                        {isAi ? selectedSession.scenario?.ai_role : 'Mahasiswa'}
                      </span>
                      <div style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: isAi ? 'rgba(255,255,255,0.03)' : 'rgba(16, 185, 129, 0.1)',
                        border: isAi ? '1px solid var(--border-color)' : '1px solid rgba(16, 185, 129, 0.2)',
                        color: 'white',
                        fontSize: '0.85rem',
                        lineHeight: 1.4
                      }}>
                        {chat.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detail Evaluasi Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Ringkasan Nilai Sesi */}
                <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-teal)', marginBottom: '12px' }}>
                    RINGKASAN SKOR AKHIR
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '2.2rem', fontWeight: 800 }}>{selectedSession.overall_score?.toFixed(2)}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>/ 5.00</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px' }}>
                    {Object.entries(selectedSession.average_scores || {}).map(([key, val]) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span style={{ textTransform: 'capitalize' }}>{key.replace('_', ' ')}</span>
                        <span style={{ fontWeight: 800, color: 'white' }}>{Number(val).toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info Sesi */}
                <div className="glass-panel" style={{ padding: '20px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '2px' }}>
                    Informasi Sesi Latihan
                  </h4>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Skenario Latihan</span>
                    <span>[{selectedSession.scenario?.scenario_id}] {selectedSession.scenario?.title}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Durasi Latihan</span>
                    <span>{selectedSession.duration_seconds} Detik</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Jumlah Percakapan</span>
                    <span>{selectedSession.student_response_count} Kali Respons</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Status Penyelesaian</span>
                    <span style={{ textTransform: 'uppercase', fontWeight: 700, color: 'var(--accent-teal)' }}>
                      {selectedSession.status} ({selectedSession.end_reason})
                    </span>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
