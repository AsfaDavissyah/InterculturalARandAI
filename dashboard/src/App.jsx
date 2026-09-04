import React, { useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';
import { LoginForm } from './components/engora-login-form';
import Header from './components/shadcn-space/blocks/topbar-02/header';
import { requestJson } from './lib/api-client';
import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
} from './lib/auth-session';
import { OverviewView } from './views/OverviewView';
import { ScenariosView } from './views/ScenariosView';
import { ScenarioDetailView } from './views/ScenarioDetailView';
import { ScenarioEditorView } from './views/ScenarioEditorView';
import { CategoriesView } from './views/CategoriesView';
import { LecturersView } from './views/LecturersView';
import { StudentsView } from './views/StudentsView';
import { PracticeResultsView } from './views/PracticeResultsView';
import { SystemSettingsView } from './views/SystemSettingsView';
import { ProfileView } from './views/ProfileView';
import { DashboardErrorBoundary } from './components/DashboardErrorBoundary';
import { buildDashboardHash, parseDashboardRoute } from './lib/dashboard-route';
import './App.css';

export default function App() {
  const initialRoute = parseDashboardRoute(window.location.hash);
  const [session, setSession] = useState(() => getAuthSession());
  const [activeTab, setActiveTab] = useState(initialRoute.tab);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Scenario Sub-View Routing: 'list' | 'detail' | 'create' | 'edit'
  const [scenarioMode, setScenarioMode] = useState(initialRoute.scenarioMode);
  const [activeScenarioId, setActiveScenarioId] = useState(initialRoute.scenarioId);
  const [scenarioFilterStatus, setScenarioFilterStatus] = useState('all');
  const [scenarioFilterOwnership, setScenarioFilterOwnership] = useState('all');

  const handleLoginSuccess = (nextSession) => {
    setAuthSession(nextSession.token, nextSession.user);
    setSession(nextSession);
    const route = parseDashboardRoute(window.location.hash);
    setActiveTab(route.tab);
    setScenarioMode(route.scenarioMode);
    setActiveScenarioId(route.scenarioId);
    toast.success(`Signed in as ${nextSession.user.name}`);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await requestJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      handleLoginSuccess(res);
    } catch (err) {
      setLoginError(err.message || 'Login failed. Check your credentials.');
      toast.error(err.message || 'Login failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setSession(null);
    setActiveTab('overview');
    setScenarioMode('list');
    toast.info('Logged out successfully.');
  };

  useEffect(() => {
    const applyLocation = () => {
      const route = parseDashboardRoute(window.location.hash);
      setActiveTab(route.tab);
      setScenarioMode(route.scenarioMode);
      setActiveScenarioId(route.scenarioId);
    };
    window.addEventListener('hashchange', applyLocation);
    return () => window.removeEventListener('hashchange', applyLocation);
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const adminOnly = new Set(['categories', 'lecturers', 'system-settings']);
    const lecturerOnly = new Set(['students']);
    const forbidden = session.user.role === 'admin'
      ? lecturerOnly.has(activeTab)
      : adminOnly.has(activeTab);
    if (forbidden) handleNavigate('overview');
  }, [activeTab, session]);

  const handleNavigate = (tabId, params = {}) => {
    setActiveTab(tabId);
    if (tabId === 'scenarios') {
      if (params.action === 'create') {
        setScenarioMode('create');
        setActiveScenarioId(null);
      } else if (params.action === 'detail' && params.scenarioId) {
        setScenarioMode('detail');
        setActiveScenarioId(params.scenarioId);
      } else if (params.action === 'edit' && params.scenarioId) {
        setScenarioMode('edit');
        setActiveScenarioId(params.scenarioId);
      } else {
        setScenarioMode('list');
        if (params.filterStatus) setScenarioFilterStatus(params.filterStatus);
        if (params.filterOwnership) setScenarioFilterOwnership(params.filterOwnership);
      }
    }
    const nextHash = buildDashboardHash(tabId, params);
    if (window.location.hash !== nextHash) window.location.hash = nextHash;
  };

  const handleProfileUpdated = (updatedUser) => {
    if (session) {
      const nextSession = {
        ...session,
        user: { ...session.user, ...updatedUser },
      };
      setAuthSession(nextSession.token, nextSession.user);
      setSession(nextSession);
    }
  };

  if (!session || !session.user) {
    return (
      <div className="login-shell">
        <Toaster position="bottom-right" richColors />
        <LoginForm
          email={loginEmail}
          password={loginPassword}
          loading={loginLoading}
          errorMessage={loginError}
          onEmailChange={setLoginEmail}
          onPasswordChange={setLoginPassword}
          onSubmit={handleLoginSubmit}
        />
      </div>
    );
  }

  const user = session.user;
  const isAdmin = user.role === 'admin';

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <Toaster position="bottom-right" richColors />
      <Header
        user={user}
        activeTab={activeTab}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      <main className="min-w-0 pb-12">
        <DashboardErrorBoundary key={`${activeTab}:${scenarioMode}:${activeScenarioId || ''}`}>
          {activeTab === 'overview' && (
            <OverviewView user={user} onNavigate={handleNavigate} />
          )}

          {activeTab === 'scenarios' && (
            <>
                {scenarioMode === 'list' && (
                  <ScenariosView
                    user={user}
                    initialFilterStatus={scenarioFilterStatus}
                    initialFilterOwnership={scenarioFilterOwnership}
                    onSelectScenario={(id) => {
                      handleNavigate('scenarios', { action: 'detail', scenarioId: id });
                    }}
                    onCreateScenario={() => {
                      handleNavigate('scenarios', { action: 'create' });
                    }}
                    onEditScenario={(id) => {
                      handleNavigate('scenarios', { action: 'edit', scenarioId: id });
                    }}
                  />
                )}

                {scenarioMode === 'detail' && (
                  <ScenarioDetailView
                    scenarioId={activeScenarioId}
                    user={user}
                    onBack={() => handleNavigate('scenarios')}
                    onEdit={(id) => {
                      handleNavigate('scenarios', { action: 'edit', scenarioId: id });
                    }}
                    onRefreshList={() => {}}
                  />
                )}

                {(scenarioMode === 'create' || scenarioMode === 'edit') && (
                  <ScenarioEditorView
                    scenarioId={scenarioMode === 'edit' ? activeScenarioId : null}
                    user={user}
                    onBack={() => handleNavigate('scenarios')}
                    onSaved={(savedId) => {
                      handleNavigate('scenarios', { action: 'detail', scenarioId: savedId });
                    }}
                  />
                )}
            </>
          )}

          {activeTab === 'categories' && isAdmin && (
            <CategoriesView user={user} />
          )}

          {activeTab === 'lecturers' && isAdmin && (
            <LecturersView user={user} />
          )}

          {activeTab === 'students' && !isAdmin && (
            <StudentsView user={user} />
          )}

          {activeTab === 'practice-results' && (
            <PracticeResultsView user={user} />
          )}

          {activeTab === 'system-settings' && isAdmin && (
            <SystemSettingsView user={user} />
          )}

          {activeTab === 'profile' && (
            <ProfileView user={user} onProfileUpdated={handleProfileUpdated} />
          )}
        </DashboardErrorBoundary>
      </main>
    </div>
  );
}
