/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Settings, BookOpen, Layers, ClipboardList, CheckCircle2, 
  Trash2, Archive, Share2, Clipboard, Edit2, Check, AlertCircle, 
  HelpCircle, Sparkles, Send, Save, ArrowLeft, RefreshCw, X, ShieldAlert,
  ChevronDown, MessageSquareCode, Eye
} from 'lucide-react';
import { AppState, Category, Skill, Profile, Session, Evaluation, SkillScores, SkillComments } from '../types';
import DirectorReport from './DirectorReport';
import { determineMostSuitableProfile } from '../utils';

interface LeadDashboardProps {
  appState: AppState;
  onStateChange: (updatedState: AppState) => void;
  onViewChange: (view: any, sessionId?: string, designerId?: string, tab?: 'competencies' | 'profiles' | 'sessions' | 'calibrations' | 'analytics') => void;
  initialTab?: 'competencies' | 'profiles' | 'sessions' | 'calibrations' | 'analytics';
  onTabChange?: (tab: 'competencies' | 'profiles' | 'sessions' | 'calibrations' | 'analytics') => void;
}

export default function LeadDashboard({
  appState,
  onStateChange,
  onViewChange,
  initialTab = 'competencies',
  onTabChange
}: LeadDashboardProps) {
  const { categories, skills, profiles, sessions, evaluations } = appState;

  // Active sub-navigation tabs inside Lead Panel
  // 'competencies' | 'profiles' | 'sessions' | 'calibrations' | 'analytics'
  const [activeTab, setActiveTab] = useState<'competencies' | 'profiles' | 'sessions' | 'calibrations' | 'analytics'>(initialTab);

  // Sync initialTab when changed from outside
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Interactive share alerts
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);

  // Calibration detail variables
  const [calibratingEval, setCalibratingEval] = useState<Evaluation | null>(null);
  const [calibrationScores, setCalibrationScores] = useState<SkillScores>({});
  const [calibrationJustifications, setCalibrationJustifications] = useState<SkillComments>({});
  const [calibrationActionPlan, setCalibrationActionPlan] = useState<string>('');

  // Editing Category state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catTitle, setCatTitle] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Editing Skill state
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillTitle, setSkillTitle] = useState('');
  const [skillDesc, setSkillDesc] = useState('');
  const [skillCatId, setSkillCatId] = useState('');
  const [skillLevels, setSkillLevels] = useState<[string, string, string, string, string]>([
    'Уровень 0: ', 'Уровень 1: ', 'Уровень 2: ', 'Уровень 3: ', 'Уровень 4: '
  ]);

  // Editing Profile state
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [profTitle, setProfTitle] = useState('');
  const [profDesc, setProfDesc] = useState('');
  const [profNextId, setProfNextId] = useState('');
  const [profRequirements, setProfRequirements] = useState<{ skillId: string; targetLevel: number; weight: number }[]>([]);

  // Creating session state
  const [newSessionTitle, setNewSessionTitle] = useState('');

  const getProfileForEvaluation = (e: Evaluation, session: Session | undefined, currentCalibrationScores?: SkillScores) => {
    if (!session || session.profileId === 'profile-general') {
      const scores = currentCalibrationScores || (e.status === 'calibrated' ? e.calibratedScores : e.selfScores);
      return determineMostSuitableProfile(categories, skills, profiles, scores);
    }
    return profiles.find(p => p.id === session.profileId) || profiles[0];
  };

  // Helpers to copy token
  const handleCopyLink = (session: Session) => {
    const base = window.location.origin + window.location.pathname;
    const link = `${base}?link=designer&sessionId=${session.id}`;
    navigator.clipboard.writeText(link);
    setCopiedSessionId(session.id);
    setTimeout(() => setCopiedSessionId(null), 2000);
  };

  // Create new session
  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionTitle.trim()) return;

    const newSessionId = `sess-${Date.now()}`;
    const newSession: Session = {
      id: newSessionId,
      title: newSessionTitle.trim(),
      profileId: 'profile-general',
      status: 'active',
      shareToken: `token-${Date.now()}`
    };

    onStateChange({
      ...appState,
      sessions: [newSession, ...sessions]
    });

    setNewSessionTitle('');
  };

  // Convert status to Archived
  const handleArchiveSession = (id: string) => {
    onStateChange({
      ...appState,
      sessions: sessions.map(s => s.id === id ? { ...s, status: 'archived' } : s)
    });
  };

  // Delete Session
  const handleDeleteSession = (id: string) => {
    onStateChange({
      ...appState,
      sessions: sessions.filter(s => s.id !== id),
      evaluations: evaluations.filter(e => e.sessionId !== id)
    });
  };

  // Delete Evaluation
  const handleDeleteEvaluation = (id: string) => {
    onStateChange({
      ...appState,
      evaluations: evaluations.filter(e => e.id !== id)
    });
  };

  // Open calibration workspace for a submitter
  const startCalibration = (evaluation: Evaluation) => {
    setCalibratingEval(evaluation);
    setCalibrationScores({ ...evaluation.selfScores, ...evaluation.calibratedScores });
    setCalibrationJustifications({ ...evaluation.calibrationJustifications });
    setCalibrationActionPlan(evaluation.actionPlan || '');
  };

  const handleCalibrationScoreChange = (skillId: string, value: number) => {
    setCalibrationScores(prev => ({
      ...prev,
      [skillId]: value
    }));

    // If score changes back to original selfScore, remove mandatory justification or reset
    // Otherwise open a blank warning so they formulate Russian explanations
    if (calibratingEval && value !== calibratingEval.selfScores[skillId]) {
      if (!calibrationJustifications[skillId]) {
        setCalibrationJustifications(prev => ({
          ...prev,
          [skillId]: ''
        }));
      }
    }
  };

  // Save the complete calibration results
  const saveCalibration = () => {
    if (!calibratingEval) return;

    // Validate that ALL scores changed have a Russian description
    const justifications: SkillComments = {};
    let hasValidationError = false;

    Object.entries(calibrationScores).forEach(([skillId, val]) => {
      const originalVal = calibratingEval.selfScores[skillId] ?? 0;
      if (val !== originalVal) {
        const text = calibrationJustifications[skillId]?.trim();
        if (!text) {
          hasValidationError = true;
        } else {
          justifications[skillId] = text;
        }
      }
    });

    if (hasValidationError) {
      alert('Ошибка калибровки: обязательно укажите текстовые обоснования на русском языке для всех оценок, которые вы изменили!');
      return;
    }

    const updatedEvaluations = evaluations.map(e => {
      if (e.id === calibratingEval.id) {
        return {
          ...e,
          calibratedScores: calibrationScores,
          calibrationJustifications: justifications,
          actionPlan: calibrationActionPlan,
          status: 'calibrated' as const,
          dateCalibrated: new Date().toISOString().split('T')[0]
        };
      }
      return e;
    });

    onStateChange({
      ...appState,
      evaluations: updatedEvaluations
    });

    setCalibratingEval(null);
  };

  // Competence updates
  const startEditCategory = (cat: Category | null) => {
    if (cat) {
      setEditingCategory(cat);
      setCatTitle(cat.title);
      setCatDesc(cat.description);
    } else {
      setEditingCategory({ id: '', title: '', description: '' });
      setCatTitle('');
      setCatDesc('');
    }
  };

  const saveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catTitle.trim()) return;

    let updatedCategories;
    if (editingCategory && editingCategory.id) {
      updatedCategories = categories.map(c => c.id === editingCategory.id ? { ...c, title: catTitle, description: catDesc } : c);
    } else {
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        title: catTitle,
        description: catDesc
      };
      updatedCategories = [...categories, newCat];
    }

    onStateChange({
      ...appState,
      categories: updatedCategories
    });
    setEditingCategory(null);
  };

  const deleteCategory = (id: string) => {
    onStateChange({
      ...appState,
      categories: categories.filter(c => c.id !== id),
      skills: skills.filter(s => s.categoryId !== id)
    });
  };

  // Skills Constructor updates
  const startEditSkill = (sk: Skill | null, categoryId?: string) => {
    if (sk) {
      setEditingSkill(sk);
      setSkillTitle(sk.title);
      setSkillDesc(sk.description);
      setSkillCatId(sk.categoryId);
      setSkillLevels([...sk.levels]);
    } else {
      setEditingSkill({
        id: '',
        categoryId: categoryId || categories[0]?.id || '',
        title: '',
        description: '',
        levels: [
          'Уровень 0: Навык не применяется / отсутствует.',
          'Уровень 1 (Junior): Выполняет базовые задачи по инструкции под присмотром.',
          'Уровень 2 (Middle): Самостоятельно решает стандартные практические задачи.',
          'Уровень 3 (Senior): Решает нестандартные задачи, консультирует и обучает других.',
          'Уровень 4 (Expert): Трансформирует методы, задает отраслевые стандарты.'
        ]
      });
      setSkillTitle('');
      setSkillDesc('');
      setSkillCatId(categoryId || categories[0]?.id || '');
      setSkillLevels([
        'Уровень 0: Навык не применяется / отсутствует.',
        'Уровень 1 (Junior): Выполняет базовые задачи по инструкции под присмотром.',
        'Уровень 2 (Middle): Самостоятельно решает стандартные практические задачи.',
        'Уровень 3 (Senior): Решает нестандартные задачи, консультирует и обучает других.',
        'Уровень 4 (Expert): Трансформирует методы, задает отраслевые стандарты.'
      ]);
    }
  };

  const saveSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillTitle.trim() || !skillCatId) return;

    let updatedSkills;
    if (editingSkill && editingSkill.id) {
      updatedSkills = skills.map(s => s.id === editingSkill.id ? {
        ...s,
        title: skillTitle,
        description: skillDesc,
        categoryId: skillCatId,
        levels: skillLevels
      } : s);
    } else {
      const newSkill: Skill = {
        id: `skill-${Date.now()}`,
        categoryId: skillCatId,
        title: skillTitle,
        description: skillDesc,
        levels: skillLevels
      };
      updatedSkills = [...skills, newSkill];
    }

    onStateChange({
      ...appState,
      skills: updatedSkills
    });
    setEditingSkill(null);
  };

  const deleteSkill = (id: string) => {
    onStateChange({
      ...appState,
      skills: skills.filter(s => s.id !== id)
    });
  };

  // Profile Grade Editor
  const startEditProfile = (profileItem: Profile | null) => {
    if (profileItem) {
      setEditingProfile(profileItem);
      setProfTitle(profileItem.title);
      setProfDesc(profileItem.description);
      setProfNextId(profileItem.nextProfileId || '');
      setProfRequirements([...profileItem.requirements]);
    } else {
      // Setup blank requirements (all skills with target level 1, weight 0.0)
      const initialReqs = skills.map(s => ({
        skillId: s.id,
        targetLevel: 1,
        weight: 0.1
      }));
      setEditingProfile({
        id: '',
        title: '',
        description: '',
        requirements: initialReqs
      });
      setProfTitle('');
      setProfDesc('');
      setProfNextId('');
      setProfRequirements(initialReqs);
    }
  };

  const handleRequirementChange = (skillId: string, field: 'targetLevel' | 'weight', value: number) => {
    setProfRequirements(prev => {
      // Check if skillId already exists in requirements
      const exists = prev.some(r => r.skillId === skillId);
      if (!exists) {
        return [...prev, { skillId, targetLevel: field === 'targetLevel' ? value : 1, weight: field === 'weight' ? value : 0 }];
      }
      return prev.map(r => r.skillId === skillId ? {
        ...r,
        [field]: value
      } : r);
    });
  };

  const validateAndSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profTitle.trim()) return;

    // Automatic weight verification for each active category in requirements!
    // Sum of weights inside each category MUST be strictly equal to 1.0 (100%).
    // Note: We only analyze categories.
    const errors: string[] = [];

    categories.forEach(cat => {
      const catSkills = skills.filter(s => s.categoryId === cat.id);
      const catSkillIds = new Set(catSkills.map(s => s.id));
      const activeReqs = profRequirements.filter(r => catSkillIds.has(r.skillId));

      if (activeReqs.length > 0) {
        const sum = activeReqs.reduce((acc, r) => acc + r.weight, 0);
        // Compare with tolerance for floating points
        if (Math.abs(sum - 1.0) > 0.001) {
          errors.push(`В категории "${cat.title}" сумма весов навыков равна ${(sum).toFixed(2)}, а должна быть строго равна 1.0 (100%). Скорректируйте коэффициенты.`);
        }
      }
    });

    if (errors.length > 0) {
      alert(`Ошибка валидации профиля:\n${errors.join('\n')}`);
      return;
    }

    let updatedProfiles;
    if (editingProfile && editingProfile.id) {
      updatedProfiles = profiles.map(p => p.id === editingProfile.id ? {
        ...p,
        title: profTitle,
        description: profDesc,
        nextProfileId: profNextId || undefined,
        requirements: profRequirements
      } : p);
    } else {
      const newProf: Profile = {
        id: `profile-${Date.now()}`,
        title: profTitle,
        description: profDesc,
        nextProfileId: profNextId || undefined,
        requirements: profRequirements
      };
      updatedProfiles = [...profiles, newProf];
    }

    onStateChange({
      ...appState,
      profiles: updatedProfiles
    });
    setEditingProfile(null);
  };

  const deleteProfile = (id: string) => {
    onStateChange({
      ...appState,
      profiles: profiles.filter(p => p.id !== id)
    });
  };

  const selectTab = (tab: 'competencies' | 'profiles' | 'sessions' | 'calibrations' | 'analytics') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div className="space-y-6">
      {/* Main interactive sub-tabs selector */}
      <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none gap-2 select-none">
        <button
          onClick={() => selectTab('competencies')}
          className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'competencies'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Навыки</span>
        </button>

        <button
          onClick={() => selectTab('profiles')}
          className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'profiles'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Профили</span>
        </button>

        <button
          onClick={() => selectTab('sessions')}
          className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'sessions'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Сессии</span>
        </button>

        <button
          onClick={() => selectTab('calibrations')}
          className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'calibrations'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Анкеты</span>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
            {evaluations.filter(e => e.status === 'submitted').length}
          </span>
        </button>

        <button
          onClick={() => selectTab('analytics')}
          className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'analytics'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Аналитика</span>
        </button>
      </div>

      {/* WORKBENCH VIEWS */}

      {/* 1. CALIBRATIONS tab */}
      {activeTab === 'calibrations' && !calibratingEval && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Анкеты
              </h1>
              <p className="text-slate-500 mt-2 text-sm max-w-2xl">
                Просмотр и калибровка заполненных анкет сотрудников. Сравнивайте оценки самопроверки с профессиональными ожиданиями и утверждайте карьерные действия.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 bg-white border-b border-slate-250/60">
              <h3 className="font-bold text-slate-900 text-lg">Поток заполненных анкет дизайнеров</h3>
              <p className="text-xs text-slate-400 mt-1">
                Список ответов, отправленных дизайнерами. Те, которые помечены статусом «Заполнена», требуют вашей калибровки и составления Плана действий.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {evaluations.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">Поток заполненных анкет пуст</p>
                  <p className="text-xs text-slate-400 mt-1">Здесь появятся анкеты после их отправки дизайнерами.</p>
                </div>
              ) : (
                evaluations.map(e => {
                  const sess = sessions.find(s => s.id === e.sessionId);
                  const prof = getProfileForEvaluation(e, sess);

                  return (
                    <div key={e.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-slate-900 text-sm font-extrabold">{e.designerName}</strong>
                          {e.status === 'calibrated' ? (
                            <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold px-2 py-0.5 rounded-full uppercase">
                              ✓ Утверждена
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-100 font-bold px-2 py-0.5 rounded-full uppercase">
                              ⌛ Нужна калибровка
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          Сессия: <span className="font-semibold">{sess?.title}</span> • Профиль: <span className="font-bold">{prof?.title}</span>
                        </p>
                        <span className="text-[10px] text-slate-400 block">Отправлено сотрудником: {e.dateSubmitted}</span>
                      </div>

                      <div className="flex gap-2.5 shrink-0 items-center">
                        <button
                          onClick={() => startCalibration(e)}
                          className={`text-xs font-semibold px-4 py-2 rounded-lg border cursor-pointer flex items-center gap-1.5 transition-all ${
                            e.status === 'calibrated'
                              ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                              : 'bg-indigo-650 text-white hover:bg-indigo-750 border-indigo-600 shadow-sm'
                          }`}
                        >
                          <MessageSquareCode className="w-3.5 h-3.5" />
                          <span>{e.status === 'calibrated' ? 'Редактировать калибровку' : 'Откалибровать баллы'}</span>
                        </button>

                        {e.status === 'calibrated' && (
                          <button
                            onClick={() => onViewChange('designer-profile', undefined, e.id)}
                            className="hover:bg-slate-100 bg-white border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 rounded-lg flex items-center gap-1 pointer cursor-pointer transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Просмотр ЛК</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteEvaluation(e.id)}
                          className="p-2 border border-slate-250 text-slate-450 hover:text-red-650 hover:bg-red-50 hover:border-red-200 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-sm btn-delete-eval"
                          title="Удалить анкету"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* CALIBRATION WORKBENCH PANEL (Scenario 4) */}
      {activeTab === 'calibrations' && calibratingEval && (() => {
        const sess = sessions.find(s => s.id === calibratingEval.sessionId);
        const prof = getProfileForEvaluation(calibratingEval, sess, calibrationScores);
        if (!prof) return null;

        const calibrationList = sess?.profileId === 'profile-general'
          ? skills.map(skill => {
              const req = prof.requirements.find(r => r.skillId === skill.id);
              return {
                skill,
                targetLevel: req?.targetLevel ?? null,
                weight: req?.weight ?? null,
                isPartofRequired: !!req
              };
            })
          : prof.requirements.map(req => {
              const skill = skills.find(s => s.id === req.skillId);
              return {
                skill,
                targetLevel: req.targetLevel,
                weight: req.weight,
                isPartofRequired: true
              };
            }).filter(item => !!item.skill);

        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalibratingEval(null)}
                className="p-1 px-2.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Назад к списку анкет</span>
              </button>
              <span className="text-slate-400 text-xs">/</span>
              <span className="text-xs text-slate-500 font-bold bg-slate-105">Планшет калибровки: {calibratingEval.designerName}</span>
            </div>

            {/* Layout Split Panels */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-xl font-extrabold text-slate-900">
                  Калибровка компетенций: {calibratingEval.designerName}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Предписываемая должность: <strong className="text-indigo-600">{prof.title}</strong> • Сессия анкетирования: {sess?.title}
                </p>
              </div>

              {/* Notice banner for calibration math logic in Scenario 4 */}
              <div className="bg-slate-50 text-slate-705 border border-slate-200 rounded-xl p-4 flex gap-3 text-xs">
                <ShieldAlert className="w-5 h-5 text-indigo-505 shrink-0" />
                <div>
                  <strong className="text-slate-900">Правило двух колонок калибровки</strong>
                  <p className="mt-1 text-slate-500 leading-relaxed font-medium">
                    Ниже вы видите сопоставление ответов. Слева выводится выбранная самооценка дизайнера с текстовой формулировкой. Справа вы можете установить скорректированную оценку. В случае несогласия с самооценкой, система требует заполнить соответствующее поле <strong className="text-indigo-600 font-semibold">«Обоснование калибровки»</strong> на русском языке.
                  </p>
                </div>
              </div>

              {/* Skills list loop for calibration */}
              <div className="space-y-6 divide-y divide-slate-100">
                {calibrationList.map((item, itemIdx) => {
                  const { skill, targetLevel, weight, isPartofRequired } = item;
                  if (!skill) return null;

                  const currentSelfValue = calibratingEval.selfScores[skill.id] ?? 0;
                  const currentCalibratedValue = calibrationScores[skill.id] ?? currentSelfValue;
                  const isModified = currentCalibratedValue !== currentSelfValue;

                  return (
                    <div key={skill.id} className={`pt-6 ${itemIdx === 0 ? 'pt-0' : ''} space-y-4`}>
                      {/* Skill identity */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-lg border border-slate-150">
                        <div>
                          <span className="font-extrabold text-slate-850 text-xs text-indigo-900">{skill.title}</span>
                          <span className="text-[10px] text-slate-400 block">{skill.description}</span>
                        </div>
                        {isPartofRequired ? (
                          <span className="text-[10px] bg-indigo-50 border border-indigo-100 font-bold px-2.5 py-0.5 rounded text-indigo-805 shrink-0">
                            🎯 Требуемый уровень профиля {prof.title}: {targetLevel} (Вес: {weight})
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-505 font-medium px-2.5 py-0.5 rounded shrink-0">
                            Дополнительный навык для профиля {prof.title}
                          </span>
                        )}
                      </div>

                      {/* Display Two Columns */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        {/* LEFT COLUMN: Designer Self Selection */}
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-200">
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider mb-2">Самооценка дизайнера: {currentSelfValue} балла</span>
                          <p className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed font-medium">
                            {skill.levels[currentSelfValue] || 'Описание отсутствует'}
                          </p>
                        </div>

                        {/* RIGHT COLUMN: Calibration Controls */}
                        <div className="space-y-3">
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Калибровка руководителя:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {[0, 1, 2, 3, 4].map(lvl => {
                              const isChecked = currentCalibratedValue === lvl;
                              return (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => handleCalibrationScoreChange(skill.id, lvl)}
                                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs border transition-all cursor-pointer ${
                                    isChecked
                                      ? 'bg-indigo-600 text-white border-indigo-705 shadow-md scale-[1.05]'
                                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                                  }`}
                                  title={skill.levels[lvl]}
                                >
                                  {lvl}
                                </button>
                              );
                            })}
                          </div>

                          {/* Interactive preview description of the calibrated score */}
                          <p className="text-[11px] text-slate-400 italic font-medium lines-2-capped">
                            Выбран: {skill.levels[currentCalibratedValue]}
                          </p>

                          {/* Mandatory Justification (Justification text input Scenario 4.3) */}
                          {isModified && (
                            <div className="space-y-1.5 pt-2 animate-fadeIn">
                              <label className="block text-[11px] text-amber-800 font-extrabold uppercase tracking-wide">
                                Обоснование калибровки (обязательно) <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                required
                                value={calibrationJustifications[skill.id] || ''}
                                onChange={(e) => setCalibrationJustifications(prev => ({
                                  ...prev,
                                  [skill.id]: e.target.value
                                }))}
                                placeholder="Формально обоснуйте на русском языке причину корректировки балла (например: слабые макеты в Figma / отличная автономная проработка CJM в майском релизе)"
                                className="w-full text-xs font-medium p-2.5 bg-amber-50/40 focus:bg-white text-slate-800 rounded-lg border border-amber-200/80 outline-none focus:ring-2 focus:ring-indigo-500 h-20"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ИПР ACTION PLAN COMPILER (Scenario 4.4) */}
              <div className="pt-6 border-t border-slate-200 space-y-3">
                <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
                  ПЛАН ДЕЙСТВИЙ (РЕКОМЕНДУЕМЫЕ КНИГИ, КУРСЫ, ЦЕЛИ)
                </h4>
                <p className="text-xs text-slate-500">
                  Заполните подробные индивидуальные рекомендации для развития данного дизайнера. Эта информация мгновенно появится в его личном профиле в кабинете самооценки.
                </p>
                <textarea
                  required
                  value={calibrationActionPlan}
                  onChange={(e) => setCalibrationActionPlan(e.target.value)}
                  placeholder="В свободной форме опишите конкретные действия:
1. Прочитать книгу 'Дизайн привычных вещей' Дональда Нормана до 30 августа.
2. Пройти курс по количественному анализу и А/Б тестам.
3. Провести созвон-ликбез по Figma Variables для стажеров."
                  className="w-full text-xs font-medium p-4 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 min-h-[140px]"
                />
              </div>

              {/* Submit panel for Calibration */}
              <div className="pt-6 border-t border-slate-200 flex justify-end gap-3 bg-slate-50 p-4 -m-6 mt-4">
                <button
                  type="button"
                  onClick={() => setCalibratingEval(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={saveCalibration}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-650/10 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Утвердить калибровку</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 2. SESSIONS tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Сессии
              </h1>
              <p className="text-slate-500 mt-2 text-sm max-w-2xl">
                Запуск новых волн оценки по выбранным профилям должностей. Управляйте активными сессиями и копируйте ссылки для самооценки сотрудников.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Create new Session Form */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4 h-fit">
            <h4 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2.5">Запустить сбор оценок</h4>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Название сессии</label>
                <input
                  type="text"
                  required
                  placeholder="Например: Осенняя оценка 2026"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Создать новую анкету</span>
              </button>
            </form>
          </div>

          {/* List of active/archive sessions (Scenario 2) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <h4 className="font-extrabold text-slate-900">Реестр анкетных сессий</h4>
            </div>

            <div className="divide-y divide-slate-150">
              {sessions.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-6 text-center">Созданных сессий нет.</p>
              ) : (
                sessions.map(sess => {
                  const mappedProfile = profiles.find(p => p.id === sess.profileId);
                  const isCopied = copiedSessionId === sess.id;

                  return (
                    <div key={sess.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 text-xs font-extrabold leading-normal">{sess.title}</strong>
                          {sess.status === 'active' ? (
                            <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold px-1.5 py-0.5 rounded uppercase">
                              Активна
                            </span>
                          ) : (
                            <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 font-bold px-1.5 py-0.5 rounded uppercase">
                              В архиве
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-semibold mb-1">
                          Профиль: {sess.profileId === 'profile-general' ? 'Любой (определяется индивидуально по итогам заполнения)' : (mappedProfile ? mappedProfile.title : 'Любой (определяется индивидуально по итогам заполнения)')}
                        </p>
                      </div>

                      {/* Control panel buttons */}
                      <div className="flex items-center gap-1.5 text-xs">
                        {sess.status === 'active' && (
                          <button
                            onClick={() => handleCopyLink(sess)}
                            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1 font-bold cursor-pointer transition-all ${
                              isCopied
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-indigo-600'
                            }`}
                            title="Скопировать ссылку"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                            <span>{isCopied ? 'Ссылка скопирована!' : 'Поделиться'}</span>
                          </button>
                        )}

                        {sess.status === 'active' && (
                          <button
                            onClick={() => handleArchiveSession(sess.id)}
                            className="bg-white hover:bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-slate-500 hover:text-slate-800 cursor-pointer"
                            title="Архивировать"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteSession(sess.id)}
                          className="bg-white hover:bg-red-50 border border-slate-200 text-slate-400 hover:text-red-600 p-1.5 rounded-lg cursor-pointer"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        </div>
      )}

      {/* 3. MATRICES tab */}
      {activeTab === 'profiles' && !editingProfile && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Профили
              </h1>
              <p className="text-slate-500 mt-2 text-sm max-w-2xl">
                Профили должностей дизайнеров. Настраивайте целевые уровни владения навыками и распределяйте весовые коэффициенты.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => startEditProfile(null)}
              className="bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-xs p-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-650/15"
            >
              <Plus className="w-4 h-4" />
              <span>Создать матрицу профиля</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map(p => {
              const skillsAssoc = p.requirements.length;
              return (
                <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <strong className="text-slate-900 font-extrabold text-sm block">{p.title}</strong>
                    <p className="text-xs text-slate-405 leading-relaxed font-semibold mb-2 lines-3-capped select-text">
                      {p.description}
                    </p>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold inline-block">
                      {skillsAssoc} требований в матрице
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-end gap-1.5">
                    <button
                      onClick={() => startEditProfile(p)}
                      className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => deleteProfile(p.id)}
                      className="bg-white hover:bg-red-50 text-slate-400 hover:text-red-700 p-1.5 border border-slate-200 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EDIT PROFILE DIALOG & WEIGHT CHECK MODULE (Scenario 1) */}
      {activeTab === 'profiles' && editingProfile && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900">
              {editingProfile.id ? 'Редактировать профиль' : 'Создать новый профиль'}
            </h3>
            <button
              onClick={() => setEditingProfile(null)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={validateAndSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-750">Название профиля</label>
                <input
                  type="text"
                  required
                  placeholder="Например: Senior продуктовый дизайнер"
                  value={profTitle}
                  onChange={(e) => setProfTitle(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-755">След. ступень в карьере (если есть)</label>
                <select
                  value={profNextId}
                  onChange={(e) => setProfNextId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white"
                >
                  <option value="">-- Отсутствует / Конечная роль --</option>
                  {profiles.filter(p => p.id !== editingProfile.id).map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-756">Подробное описание задач роли</label>
              <textarea
                placeholder="Опишите ожидания бизнеса, полномочия и функции данного сотрудника в компании."
                value={profDesc}
                onChange={(e) => setProfDesc(e.target.value)}
                className="w-full text-xs font-medium p-3 bg-slate-50 border border-slate-200 rounded-lg min-h-[70px] outline-none focus:bg-white"
              />
            </div>

            {/* WEIGHT VALIDATORS PER CATEGORY DISPLAY */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500 block">Живая валидация весов по категориям:</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {categories.map(cat => {
                  const catSkills = skills.filter(s => s.categoryId === cat.id);
                  const catSkillIds = new Set(catSkills.map(s => s.id));
                  const activeReqs = profRequirements.filter(r => catSkillIds.has(r.skillId));
                  const sum = activeReqs.reduce((acc, r) => acc + r.weight, 0);
                  const isBalanced = Math.abs(sum - 1.0) < 0.001;

                  return (
                    <div key={cat.id} className={`p-4 rounded-lg border bg-white ${
                      isBalanced 
                        ? 'border-emerald-200 bg-emerald-50/10' 
                        : 'border-red-200 bg-red-50/10 animate-pulse'
                    }`}>
                      <strong className="text-xs text-slate-800 block truncate">{cat.title}</strong>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[10px] text-slate-400">Сумма весов:</span>
                        <strong className={`text-xs ${isBalanced ? 'text-emerald-700' : 'text-red-600 font-bold'}`}>
                          {sum.toFixed(2)} / 1.00
                        </strong>
                      </div>
                      <span className={`text-[9px] font-semibold mt-1 block uppercase tracking-wider ${isBalanced ? 'text-emerald-700' : 'text-red-600'}`}>
                        {isBalanced ? '✔️ Сбалансировано' : '❌ Нарушен баланс (должно быть 1.0)'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Editing skills target and weight mapper list */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500 block">Матрица навыков: уровни и веса:</span>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                {categories.map(cat => {
                  const catSkills = skills.filter(s => s.categoryId === cat.id);
                  if (catSkills.length === 0) return null;

                  return (
                    <div key={cat.id} className="p-4 space-y-3 bg-slate-50/30">
                      <span className="text-xs text-indigo-900 uppercase font-extrabold tracking-wider block bg-indigo-50/50 p-2 rounded">
                        {cat.title}
                      </span>
                      <div className="space-y-4">
                        {catSkills.map(sk => {
                          const req = profRequirements.find(r => r.skillId === sk.id) || { skillId: sk.id, targetLevel: 0, weight: 0 };
                          return (
                            <div key={sk.id} className="bg-white p-4 border border-slate-250/70 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="space-y-0.5">
                                <strong className="text-slate-800 text-xs font-bold block">{sk.title}</strong>
                                <p className="text-[10px] text-slate-400 leading-normal max-w-sm font-medium">{sk.description}</p>
                              </div>

                              <div className="flex items-center gap-6 text-xs text-slate-600">
                                {/* Target Level Select */}
                                <div className="space-y-1">
                                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Целевой уровень (0-4)</span>
                                  <select
                                    value={req.targetLevel}
                                    onChange={(e) => handleRequirementChange(sk.id, 'targetLevel', parseInt(e.target.value))}
                                    className="p-1 px-2 border border-slate-200 bg-slate-50 rounded font-bold"
                                  >
                                    {[0, 1, 2, 3, 4].map(n => (
                                      <option key={n} value={n}>{n} - Level</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Weight Input */}
                                <div className="space-y-1">
                                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Коэффициент Веса (0.01 - 1.0)</span>
                                  <input
                                    type="number"
                                    min="0.0"
                                    max="1.0"
                                    step="0.05"
                                    value={req.weight}
                                    onChange={(e) => handleRequirementChange(sk.id, 'weight', parseFloat(e.target.value) || 0)}
                                    className="w-16 p-1 border border-slate-200 bg-slate-50 rounded font-bold"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3.5 bg-slate-50 border-t border-slate-100 p-4 -m-6 mt-4">
              <button
                type="button"
                onClick={() => setEditingProfile(null)}
                className="px-4 py-2 bg-slate-200 text-slate-800 font-bold text-xs rounded-lg cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>Сохранить матрицу профиля</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. COMPETENCIES tab */}
      {activeTab === 'competencies' && !editingCategory && !editingSkill && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Навыки
              </h1>
              <p className="text-slate-500 mt-2 text-sm max-w-2xl">
                Управление базой навыков и категорий должностного развития. Настраивайте детальные описания и поведенческие индикаторы для каждого уровня владения.
              </p>
            </div>
          </div>
          
          {/* Categories setup block */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-slate-900">Категории</h4>
                <p className="text-xs text-slate-400 mt-1">Эти группы формируют средневзвешенный балл и соответствия должностным направлениям.</p>
              </div>
              <button
                onClick={() => startEditCategory(null)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>Добавить категорию</span>
              </button>
            </div>

            <div className="divide-y divide-slate-150">
              {categories.map(c => (
                <div key={c.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <strong className="text-slate-900 text-xs font-extrabold">{c.title}</strong>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-xl">{c.description}</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => startEditCategory(c)}
                      className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg"
                    >
                      Изм.
                    </button>
                    <button
                      onClick={() => deleteCategory(c.id)}
                      className="bg-white hover:bg-red-50 text-slate-400 hover:text-red-700 p-1.5 border border-slate-200 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Atomic skill lists setup box */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-slate-900">Навыки</h4>
                <p className="text-xs text-slate-400 mt-1">Содержат развернутые описания каждого балла 0-4 для самооценки и калибровки.</p>
              </div>
              <button
                onClick={() => startEditSkill(null)}
                className="bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>Добавить навык</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {categories.map(cat => {
                const associatedSkills = skills.filter(s => s.categoryId === cat.id);
                return (
                  <div key={cat.id} className="border border-slate-200 rounded-xl p-5 bg-slate-50/30 space-y-3">
                    <span className="text-xs text-indigo-900 uppercase font-extrabold bg-indigo-50 px-2 py-1 rounded inline-block truncate max-w-[250px]">
                      {cat.title}
                    </span>
                    <div className="space-y-2 pt-1">
                      {associatedSkills.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Навыков в этой группе нет.</p>
                      ) : (
                        associatedSkills.map(sk => (
                          <div key={sk.id} className="bg-white p-3.5 border border-slate-250 rounded-lg flex items-center justify-between gap-4 shadow-2xs hover:scale-[1.002]">
                            <div className="space-y-0.5 max-w-[190px]">
                              <strong className="text-slate-800 text-xs font-bold block truncate">{sk.title}</strong>
                              <p className="text-[10px] text-slate-400 truncate leading-snug">{sk.description}</p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEditSkill(sk)}
                                className="bg-slate-50 hover:bg-slate-150 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-1 rounded cursor-pointer"
                              >
                                Изм.
                              </button>
                              <button
                                onClick={() => deleteSkill(sk.id)}
                                className="bg-white hover:bg-red-50 text-slate-400 hover:text-red-650 border border-slate-200 p-1 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. ANALYTICS tab */}
      {activeTab === 'analytics' && (
        <div className="animate-fadeIn">
          <DirectorReport
            categories={categories}
            skills={skills}
            profiles={profiles}
            sessions={sessions}
            evaluations={evaluations}
            onSelectDesignerDetails={(dId) => onViewChange('designer-profile', undefined, dId)}
          />
        </div>
      )}

      {/* EDIT CATEGORY MODAL DIALOG */}
      {editingCategory && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xl space-y-4">
          <h4 className="font-extrabold text-slate-900 border-b border-indigo-50 pb-2">
            {editingCategory.id ? 'Изменить макро-категорию' : 'Добавить макро-категорию'}
          </h4>
          <form onSubmit={saveCategory} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Название категории</label>
              <input
                type="text"
                required
                value={catTitle}
                onChange={(e) => setCatTitle(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Описание категории</label>
              <textarea
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg min-h-[80px] outline-none edit:bg-white font-medium"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-xs font-bold cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT SKILL MODAL DIALOG WITH BEHAVIORAL MARKERS LIST */}
      {editingSkill && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xl space-y-6">
          <h4 className="font-extrabold text-slate-900 border-b border-indigo-50 pb-2">
            {editingSkill.id ? 'Редактировать прикладной навык' : 'Зарегистрировать прикладной навык'}
          </h4>
          <form onSubmit={saveSkill} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Название навыка</label>
                <input
                  type="text"
                  required
                  placeholder="Например: Анимация переходов"
                  value={skillTitle}
                  onChange={(e) => setSkillTitle(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Входит в категорию</label>
                <select
                  required
                  value={skillCatId}
                  onChange={(e) => setSkillCatId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-705">Краткое описание сути навыка</label>
              <textarea
                required
                value={skillDesc}
                onChange={(e) => setSkillDesc(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none min-h-[60px]"
              />
            </div>

            {/* Editing 5 behavioral description markers */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-505 block">Развернутые поведенческие маркеры (Уровни 0-4):</span>
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                {[0, 1, 2, 3, 4].map((n) => (
                  <div key={n} className="flex gap-3 text-xs items-start">
                    <span className="w-7 h-7 bg-indigo-50 border border-indigo-100/70 text-indigo-700 rounded-lg flex items-center justify-center font-bold font-mono mt-1 select-none shrink-0">
                      У{n}
                    </span>
                    <input
                      type="text"
                      required
                      value={skillLevels[n] || ''}
                      onChange={(e) => {
                        const nextLevels = [...skillLevels] as [string, string, string, string, string];
                        nextLevels[n] = e.target.value;
                        setSkillLevels(nextLevels);
                      }}
                      className="w-full text-xs font-medium p-2 bg-white border border-slate-205 rounded-lg outline-none"
                      placeholder={`Описание уровня ${n}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3.5 bg-slate-50 border-t border-slate-100 p-4 -m-6 mt-4">
              <button
                type="button"
                onClick={() => setEditingSkill(null)}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-xs font-bold cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Сохранить навык
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
