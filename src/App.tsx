/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Layout, Award, UserCheck, ShieldCheck, 
  Map, Star, BookOpen, Layers, AlertCircle, ClipboardList, CheckCircle2, Eye
} from 'lucide-react';

import { AppViewMode, AppState, SkillScores } from './types';
import { 
  INITIAL_CATEGORIES, 
  INITIAL_SKILLS, 
  INITIAL_PROFILES, 
  INITIAL_SESSIONS, 
  INITIAL_EVALUATIONS 
} from './initialData';
import { determineMostSuitableProfile } from './utils';

// Subcomponents
import LeadDashboard from './components/LeadDashboard';
import DesignerForm from './components/DesignerForm';
import DesignerProfile from './components/DesignerProfile';
import DirectorReport from './components/DirectorReport';

export default function App() {
  // 1. Initialize persistent state from LocalStorage
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('drsp_design_upgrade_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.categories && parsed.skills && parsed.profiles) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing localStorage state:', e);
      }
    }
    return {
      categories: INITIAL_CATEGORIES,
      skills: INITIAL_SKILLS,
      profiles: INITIAL_PROFILES,
      sessions: INITIAL_SESSIONS,
      evaluations: INITIAL_EVALUATIONS
    };
  });

  // 2. Routing and navigation states
  const [viewMode, setViewMode] = useState<AppViewMode>('lead');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('sess-summer-2026');
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>('eval-designer-ivan');
  const [leadSubTab, setLeadSubTab] = useState<'competencies' | 'profiles' | 'sessions' | 'calibrations' | 'analytics'>('competencies');

  // Sync state back to LocalStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('drsp_design_upgrade_state', JSON.stringify(appState));
  }, [appState]);

  // 3. Coordinate URL parameters parsing (Scenario 1.3 / Isolated Link parsing)
  useEffect(() => {
    const parseUrl = () => {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      const linkParam = params.get('link');

      if (linkParam === 'competencies') {
        setViewMode('lead');
        setLeadSubTab('competencies');
      } else if (linkParam === 'profiles') {
        setViewMode('lead');
        setLeadSubTab('profiles');
      } else if (linkParam === 'sessions') {
        setViewMode('lead');
        setLeadSubTab('sessions');
      } else if (linkParam === 'calibrations') {
        setViewMode('lead');
        setLeadSubTab('calibrations');
      } else if (linkParam === 'report') {
        setViewMode('director-report');
        setLeadSubTab('analytics');
      } else if (linkParam === 'lead') {
        setViewMode('lead');
        const tab = params.get('tab') as any;
        if (tab && ['competencies', 'profiles', 'sessions', 'calibrations', 'analytics'].includes(tab)) {
          setLeadSubTab(tab);
          if (tab === 'analytics') setViewMode('director-report');
        } else {
          setLeadSubTab('competencies');
        }
      } else if (linkParam === 'designer') {
        setViewMode('designer');
        const sId = params.get('sessionId');
        if (sId) setSelectedSessionId(sId);
      } else if (linkParam === 'designer-profile') {
        setViewMode('designer-profile');
        const dId = params.get('designerId');
        if (dId) setSelectedDesignerId(dId);
      } else if (linkParam === 'director-report') {
        setViewMode('director-report');
        setLeadSubTab('analytics');
      } else {
        setViewMode('lead');
        setLeadSubTab('competencies');
      }
    };

    // Parse immediately on mount
    parseUrl();

    // Listen to history popstates
    window.addEventListener('popstate', parseUrl);
    return () => window.removeEventListener('popstate', parseUrl);
  }, []);

  // 4. Update the simulated browser path
  const handleViewChange = (view: AppViewMode, sessionId?: string, designerId?: string, tab?: 'competencies' | 'profiles' | 'sessions' | 'calibrations' | 'analytics') => {
    let targetView = view;
    let targetTab = tab || leadSubTab || 'competencies';
    
    if (view === 'welcome') {
      targetView = 'lead';
      targetTab = 'competencies';
    } else if (view === 'director-report') {
      targetView = 'lead';
      targetTab = 'analytics';
    }

    setViewMode(targetView);
    if (sessionId) setSelectedSessionId(sessionId);
    if (designerId) setSelectedDesignerId(designerId);
    setLeadSubTab(targetTab);

    // Build path parameters
    let path = '?';
    if (targetView === 'lead' || targetView === 'director-report') {
      if (targetTab === 'analytics') {
        path += 'link=report';
      } else {
        path += `link=${targetTab}`;
      }
    } else if (targetView === 'designer') {
      path += `link=designer&sessionId=${sessionId || selectedSessionId || 'sess-summer-2026'}`;
    } else if (targetView === 'designer-profile') {
      path += `link=designer-profile&designerId=${designerId || selectedDesignerId || 'eval-designer-ivan'}`;
    } else {
      path = window.location.pathname; // Welcome screen, clear parameters
    }

    // Push State to update Address Bar
    window.history.pushState({}, '', path);
  };

  // Reset demo state back to default
  const handleResetState = () => {
    if (window.confirm('Вы действительно хотите сбросить все результаты, анкеты и изменения матриц к исходным демо-данным?')) {
      localStorage.removeItem('drsp_design_upgrade_state');
      setAppState({
        categories: INITIAL_CATEGORIES,
        skills: INITIAL_SKILLS,
        profiles: INITIAL_PROFILES,
        sessions: INITIAL_SESSIONS,
        evaluations: INITIAL_EVALUATIONS
      });
      handleViewChange('welcome');
    }
  };

  // Handlers for designer actions
  const handleDesignerSubmitAnswers = (designerName: string, selfScores: SkillScores) => {
    // Find active session
    const activeSession = appState.sessions.find(s => s.id === selectedSessionId) || appState.sessions[0];
    
    // Create new Evaluation record
    const newEvalId = `eval-${Date.now()}`;
    const newEvaluation = {
      id: newEvalId,
      sessionId: activeSession.id,
      designerName: designerName.trim(),
      selfScores: selfScores,
      calibratedScores: { ...selfScores }, // Initially equal
      calibrationJustifications: {},
      actionPlan: '',
      status: 'submitted' as const,
      dateSubmitted: new Date().toISOString().split('T')[0]
    };

    // Update state to include new submission
    const updatedEvaluations = [newEvaluation, ...appState.evaluations];
    setAppState(prev => ({
      ...prev,
      evaluations: updatedEvaluations
    }));

    // Redirect designer directly to see their submitted answers / personal profile
    handleViewChange('designer-profile', undefined, newEvalId);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-text selection:bg-indigo-100 selection:text-indigo-900">
      

      {/* Main body area container */}
      {(viewMode === 'lead' || viewMode === 'director-report') && (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <nav className="max-w-7xl mx-auto flex items-center px-4">
            {[
              { id: 'competencies', icon: BookOpen, label: 'Навыки' },
              { id: 'profiles', icon: Layers, label: 'Профили' },
              { id: 'sessions', icon: ClipboardList, label: 'Сессии' },
              { id: 'calibrations', icon: CheckCircle2, label: 'Анкеты' },
              { id: 'analytics', icon: Eye, label: 'Аналитика' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setLeadSubTab(tab.id as any);
                  if (tab.id === 'analytics') setViewMode('director-report');
                  else setViewMode('lead');
                  window.history.pushState({}, '', tab.id === 'analytics' ? '?link=report' : `?link=${tab.id}`);
                }}
                className={`py-4 px-4 font-bold text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  leadSubTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </header>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        
        {/* 1. LEAD CABINET / DIRECTOR TAB INTEGRATION */}
        {(viewMode === 'lead' || viewMode === 'director-report') && (
          <LeadDashboard
            appState={appState}
            onStateChange={setAppState}
            onViewChange={handleViewChange}
            initialTab={viewMode === 'director-report' ? 'analytics' : leadSubTab}
            onTabChange={(tab) => {
              setLeadSubTab(tab);
              if (tab === 'analytics') {
                setViewMode('director-report');
                window.history.pushState({}, '', '?link=report');
              } else {
                setViewMode('lead');
                window.history.pushState({}, '', `?link=${tab}`);
              }
            }}
          />
        )}

        {/* 2. DESIGNER SURVEY CONSOLE */}
        {viewMode === 'designer' && (() => {
          const session = appState.sessions.find(s => s.id === selectedSessionId) || appState.sessions[0];
          const profile = appState.profiles.find(p => p.id === (session?.profileId || 'profile-middle')) || appState.profiles[0];
          
          if (!session || !profile) {
            return (
              <div className="max-w-md mx-auto text-center py-12 p-6 bg-white border rounded-xl shadowspace-y-4">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <h3 className="text-lg font-bold">Сессия не найдена</h3>
                <p className="text-xs text-slate-500">Указанная сессия оценки была удалена лидером компетенции или перенесена.</p>
                <button
                  onClick={() => handleViewChange('welcome')}
                  className="mt-4 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-xs font-bold rounded-lg"
                >
                  Вернуться на главную
                </button>
              </div>
            );
          }

          return (
            <DesignerForm
              session={session}
              profile={profile}
              categories={appState.categories}
              skills={appState.skills}
              onSubmit={handleDesignerSubmitAnswers}
            />
          );
        })()}

        {/* 3. DESIGNER WORKSPACE RESULTS */}
        {viewMode === 'designer-profile' && (() => {
          const evaluation = appState.evaluations.find(e => e.id === selectedDesignerId) || appState.evaluations[0];
          if (!evaluation) {
            return (
              <div className="max-w-md mx-auto text-center py-12 p-6 bg-white border rounded-xl shadow space-y-4 animate-fadeIn">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <h3 className="text-lg font-bold">Профиль не заполнен</h3>
                <p className="text-xs text-slate-500">Дизайнер с данным идентификатором еще не заполнил свою анкету.</p>
                <button
                  onClick={() => handleViewChange('designer', 'sess-summer-2026')}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Пройти самооценку
                </button>
              </div>
            );
          }

          const session = appState.sessions.find(s => s.id === evaluation.sessionId) || appState.sessions[0];
          const profile = (!session || session.profileId === 'profile-general')
            ? determineMostSuitableProfile(
                appState.categories,
                appState.skills,
                appState.profiles,
                evaluation.status === 'calibrated' ? evaluation.calibratedScores : evaluation.selfScores
              )
            : (appState.profiles.find(p => p.id === session.profileId) || appState.profiles[0]);
          const nextProfile = profile && profile.nextProfileId 
            ? appState.profiles.find(p => p.id === profile.nextProfileId)
            : undefined;

          return (
            <DesignerProfile
              evaluation={evaluation}
              session={session}
              profile={profile}
              nextProfile={nextProfile}
              categories={appState.categories}
              skills={appState.skills}
            />
          );
        })()}



      </main>


    </div>
  );
}
