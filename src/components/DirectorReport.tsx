/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, CheckCircle2, TrendingUp, AlertTriangle, ArrowRight, 
  Share2, Eye, ClipboardList, RefreshCw, ChevronRight, X, FileText, 
  Award, Compass, Copy, Check
} from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell
} from 'recharts';
import { Category, Skill, Profile, Evaluation, Session, SkillScores } from '../types';
import { calculateCategoryCoverage, calculateOverallCoverage, determineMostSuitableProfile, parseActionPlan } from '../utils';

interface DirectorReportProps {
  categories: Category[];
  skills: Skill[];
  profiles: Profile[];
  sessions: Session[];
  evaluations: Evaluation[];
  isReadOnly?: boolean; // If shared link
  onSelectDesignerDetails?: (designerId: string) => void;
}

export default function DirectorReport({
  categories,
  skills,
  profiles,
  sessions,
  evaluations,
  isReadOnly = false,
  onSelectDesignerDetails
 }: DirectorReportProps) {
  const [copied, setCopied] = useState(false);

  const getProfileForEvaluation = (evalItem: Evaluation, session: Session | undefined) => {
    const profileIdToUse = evalItem.profileId && evalItem.profileId !== 'profile-general' ? evalItem.profileId : (session?.profileId);
    
    if (!profileIdToUse || profileIdToUse === 'profile-general') {
      const scores = evalItem.status === 'calibrated' ? evalItem.calibratedScores : evalItem.selfScores;
      return determineMostSuitableProfile(categories, skills, profiles, scores);
    }
    return profiles.find(p => p.id === profileIdToUse) || profiles[0];
  };

  // Filter out evaluations that are completed or submitted
  const activeEvaluations = evaluations;

  // Let's compute Блок А values
  const totalDesignersCount = activeEvaluations.length;
  const calibratedCount = activeEvaluations.filter(e => e.status === 'calibrated').length;
  const calibrationPercent = totalDesignersCount > 0 
    ? Math.round((calibratedCount / totalDesignersCount) * 100) 
    : 0;

  // 1. Calculate matching for each category across all designers to find Strongest Area and Main Deficit
  // For each designer, we calculate their category coverage.
  // Then we take the average coverage per category.
  const categoryAverages = categories.map(cat => {
    let totalCover = 0;
    let counts = 0;

    for (const evalItem of activeEvaluations) {
      const session = sessions.find(s => s.id === evalItem.sessionId);
      const profile = getProfileForEvaluation(evalItem, session);
      if (profile) {
        const scores = evalItem.status === 'calibrated' ? evalItem.calibratedScores : evalItem.selfScores;
        totalCover += calculateCategoryCoverage(cat.id, skills, profile, scores);
        counts++;
      }
    }

    const averageCoverage = counts > 0 ? totalCover / counts : 0;
    return {
      category: cat,
      average: Math.round(averageCoverage * 10) / 10
    };
  });

  const sortedCategories = [...categoryAverages].sort((a, b) => b.average - a.average);
  const strongestCategory = sortedCategories[0];
  const weakestCategory = sortedCategories[sortedCategories.length - 1];

  // 2. Skill Deficit Ranking (Рейтинг дефицитов навыков)
  // For each skill, calculate the collective deficit:
  // Deficit = Sum over designers of: max(0, TargetLevel - Fact) * Weight
  // Then divided by total evaluated designers to normalize or shown as absolute score.
  const skillDeficits = skills.map(skill => {
    let collectiveDeficit = 0;
    let countWithRequirement = 0;

    for (const evalItem of activeEvaluations) {
      const session = sessions.find(s => s.id === evalItem.sessionId);
      const profile = getProfileForEvaluation(evalItem, session);
      if (profile) {
        const req = profile.requirements.find(r => r.skillId === skill.id);
        if (req) {
          const score = evalItem.status === 'calibrated' 
            ? (evalItem.calibratedScores[skill.id] ?? 0)
            : (evalItem.selfScores[skill.id] ?? 0);
          
          if (score < req.targetLevel) {
            const gap = req.targetLevel - score;
            collectiveDeficit += gap * (skill.weight ?? 0);
          }
          countWithRequirement++;
        }
      }
    }

    return {
      skill,
      category: categories.find(c => c.id === skill.categoryId),
      deficit: countWithRequirement > 0 ? collectiveDeficit / countWithRequirement : 0,
      absoluteGapsCount: activeEvaluations.filter(evalItem => {
        const session = sessions.find(s => s.id === evalItem.sessionId);
        const profile = getProfileForEvaluation(evalItem, session);
        const req = profile?.requirements.find(r => r.skillId === skill.id);
        if (req) {
          const s = evalItem.status === 'calibrated' ? evalItem.calibratedScores[skill.id] : evalItem.selfScores[skill.id];
          return (s ?? 0) < req.targetLevel;
        }
        return false;
      }).length
    };
  }).filter(sd => sd.deficit > 0).sort((a, b) => b.deficit - a.deficit);

  // Group employees by profile for Widget 1 (Pie Chart: "Распределение")
  const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

  const profileDistribution = React.useMemo(() => {
    const distribution: { [profileId: string]: { title: string; count: number } } = {};
    
    profiles.forEach(p => {
      distribution[p.id] = { title: p.title, count: 0 };
    });
    
    let totalCount = 0;
    activeEvaluations.forEach(evalItem => {
      const session = sessions.find(s => s.id === evalItem.sessionId);
      const profile = getProfileForEvaluation(evalItem, session);
      if (profile) {
        if (!distribution[profile.id]) {
          distribution[profile.id] = { title: profile.title, count: 0 };
        }
        distribution[profile.id].count += 1;
        totalCount += 1;
      }
    });

    return Object.entries(distribution).map(([id, item]) => {
      const percentage = totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;
      return {
        id,
        name: item.title,
        value: item.count,
        percentage
      };
    }).filter(d => d.value > 0);
  }, [activeEvaluations, sessions, profiles]);

  // Average score helper for Widget 2 (Heatmap: "Матрица компетенций")
  const getCategoryAverageScore = (evalItem: Evaluation, categoryId: string) => {
    const catSkills = skills.filter(s => s.categoryId === categoryId);
    if (catSkills.length === 0) return 0;
    
    const scores = evalItem.status === 'calibrated' ? evalItem.calibratedScores : evalItem.selfScores;
    const sum = catSkills.reduce((acc, skill) => acc + (scores[skill.id] ?? 0), 0);
    return Math.round((sum / catSkills.length) * 10) / 10;
  };

  const getHeatmapColorClass = (val: number) => {
    if (val === 0) return 'bg-slate-50 text-slate-400 border border-slate-100';
    if (val < 1.0) return 'bg-rose-50 text-rose-700 border border-rose-100';
    if (val < 2.0) return 'bg-amber-50 text-amber-700 border border-amber-100';
    if (val < 3.0) return 'bg-sky-50 text-sky-700 border border-sky-100';
    return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
  };

  // IDP Progress helper for Widget 3 (Table: "Прогресс ИПР")
  const getIDPProgress = (evalItem: Evaluation) => {
    const goals = parseActionPlan(evalItem.actionPlan || '');
    if (goals.length === 0) {
      return { total: 0, completed: 0, percent: 0 };
    }
    const completed = goals.filter(g => g.completed).length;
    const percent = Math.round((completed / goals.length) * 100);
    return { total: goals.length, completed, percent };
  };

  // Sharing copy action
  const handleShareReport = () => {
    const base = window.location.origin + window.location.pathname;
    const shareUrl = `${base}?link=report`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header with Title and Share button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-0">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Аналитика
          </h1>
          <p className="text-slate-500 mt-2 text-sm max-w-2xl">
            Сводные показатели команды
          </p>
        </div>

        <div>
          <button
            id="share-report-btn"
            onClick={handleShareReport}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span className="text-emerald-50">Ссылка скопирована!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Поделиться</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Блок А: Верхняя панель инсайтов (Виджеты эффективности) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Widget 1: Количество сотрудников */}
        <div id="stat-widget-count" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
          <p className="text-sm font-bold text-slate-400">Всего сотрудников</p>
          <div className="flex items-end gap-1.5 mt-2">
            <span className="text-3xl font-bold text-slate-800 leading-none">{totalDesignersCount}</span>
            <span className="text-slate-500 text-sm font-medium pb-0.5">чел.</span>
          </div>
        </div>

        {/* Widget 2: Процент откалиброванных анкет */}
        <div id="stat-widget-progress" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
          <p className="text-sm font-bold text-slate-400">Калибровка анкет</p>
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-800 leading-none">{calibrationPercent}%</span>
              <span className="text-sm font-semibold text-slate-400 pb-0.5">{calibratedCount} из {totalDesignersCount}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${calibrationPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Widget 3: Сильнейшая область */}
        <div id="stat-widget-strength" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
          <p className="text-sm font-bold text-slate-400">Сильнейшая область</p>
          <div className="flex flex-col items-start mt-2">
            <span className="text-sm font-bold text-indigo-750 bg-indigo-50 px-2 py-0.5 rounded mb-1 max-w-full truncate" title={strongestCategory ? strongestCategory.category.title : 'Недостаточно данных'}>
              {strongestCategory ? strongestCategory.category.title : 'Недостаточно данных'}
            </span>
            <span className="text-2xl font-bold text-slate-800 leading-none">{strongestCategory ? `${strongestCategory.average}%` : '—'}</span>
          </div>
        </div>

        {/* Widget 4: Дефицит команды */}
        <div id="stat-widget-deficit" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
          <p className="text-sm font-bold text-slate-400">Главный дефицит</p>
          <div className="flex flex-col items-start mt-2">
            <span className="text-sm font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded mb-1 max-w-full truncate" title={weakestCategory ? weakestCategory.category.title : 'Недостаточно данных'}>
              {weakestCategory ? weakestCategory.category.title : 'Недостаточно данных'}
            </span>
            <span className="text-2xl font-bold text-slate-800 leading-none">{weakestCategory ? `${weakestCategory.average}%` : '—'}</span>
          </div>
        </div>
      </div>

      {/* Рейтинг дефицитов навыков & Описание категорий */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Топ дефицитов навыков */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Дефициты компетенций
            </h3>
          </div>

          <div className="space-y-4 pt-2">
            {skillDeficits.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-4 text-center">Все требования должностей у всех сотрудников выполнены на 100%!</p>
            ) : (
              skillDeficits.slice(0, 5).map((def, idx) => {
                const percentShortage = Math.round(def.deficit * 100);
                return (
                  <div key={def.skill.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-50 border border-slate-200 flex items-center justify-center text-sm font-bold text-indigo-700 shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-slate-800 font-semibold">{def.skill.title}</span>
                        <span className="text-slate-400">({def.category?.title})</span>
                      </div>
                    </div>
                    {/* Progress Bar showing deficit */}
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-red-500 rounded-full h-full"
                        style={{ width: `${Math.min(100, Math.max(10, percentShortage * 1.5))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-sm text-slate-500">
                      <span>Отставание у {def.absoluteGapsCount} сотрудников</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Category Context Indicators or quick guidelines */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-lg">Навыки команды</h3>
          <div className="h-[300px] w-full" key="skills-radar">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={categoryAverages}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis 
                  dataKey="category.title" 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={{ fill: '#94a3b8', fontSize: 8 }}
                />
                <Radar
                  name="Покрытие"
                  dataKey="average"
                  stroke="#4f46e5"
                  fill="#4f46e5"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '8px', 
                    fontSize: '12px',
                    fontWeight: 700
                  }} 
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Аналитические Виджеты (Распределение по профилям, Прогресс ИПР, Матрица компетенций) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Widget 1: Распределение по профилям */}
        <div id="analytics-widget-pie" className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Распределение</h3>
            <p className="text-xs text-slate-400 mt-1">Процентное и количественное соотношение сотрудников по профилям</p>
          </div>
          
          {profileDistribution.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-8 text-center">Нет данных для построения диаграммы</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="w-[180px] h-[180px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={profileDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {profileDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any, name: string, props: any) => [
                        `${value} чел. (${props.payload.percentage}%)`,
                        name
                      ]}
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex-1 w-full space-y-2">
                {profileDistribution.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} 
                      />
                      <span className="text-slate-700 truncate max-w-[120px]" title={item.name}>{item.name}</span>
                    </div>
                    <span className="text-slate-500 font-bold shrink-0">
                      {item.value} чел. ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Widget 3: Прогресс ИПР */}
        <div id="analytics-widget-idp" className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Прогресс ИПР</h3>
              <p className="text-xs text-slate-400 mt-1">Прогресс выполнения целей индивидуальных планов развития</p>
            </div>
            
            <div className="overflow-x-auto max-h-[220px] overflow-y-auto pr-1">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold">
                    <th className="pb-2">ФИО</th>
                    <th className="pb-2">Профиль</th>
                    <th className="pb-2 text-right">Выполнение</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeEvaluations.map(evalItem => {
                    const session = sessions.find(s => s.id === evalItem.sessionId);
                    const profile = getProfileForEvaluation(evalItem, session);
                    const progress = getIDPProgress(evalItem);
                    
                    return (
                      <tr key={evalItem.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-semibold text-slate-900 max-w-[150px] truncate" title={evalItem.designerName}>
                          {evalItem.designerName}
                        </td>
                        <td className="py-2.5 text-slate-400 text-xs truncate max-w-[120px]" title={profile?.title || '—'}>
                          {profile?.title || '—'}
                        </td>
                        <td className="py-2.5">
                          {progress.total > 0 ? (
                            <div className="flex items-center justify-end gap-2.5">
                              <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
                                  style={{ width: `${progress.percent}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-700 w-8 text-right shrink-0">
                                {progress.percent}%
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                ({progress.completed}/{progress.total})
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic block text-right">Не назначено</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Widget 2: Матрица компетенций (Heatmap) */}
      <div id="analytics-widget-matrix" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Матрица компетенций</h3>
            <p className="text-xs text-slate-400 mt-1">Тепловая карта уровней навыков по группам компетенций</p>
          </div>
          {/* Heatmap Legend */}
          <div className="flex items-center gap-3 flex-wrap text-[10px] font-semibold text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-100 border border-slate-200"></span> 0 (Нет)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-50 border border-rose-100"></span> 0.1 - 0.9</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-50 border border-amber-100"></span> 1.0 - 1.9</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-sky-50 border border-sky-100"></span> 2.0 - 2.9</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-50 border border-emerald-100"></span> 3.0 - 4.0</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Сотрудник</th>
                {categories.map(cat => (
                  <th key={cat.id} className="py-3 px-4 text-center min-w-[120px]">
                    {cat.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeEvaluations.map(evalItem => (
                <tr key={evalItem.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                    {evalItem.designerName}
                  </td>
                  {categories.map(cat => {
                    const val = getCategoryAverageScore(evalItem, cat.id);
                    return (
                      <td key={cat.id} className="py-3 px-4 text-center">
                        <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold min-w-[50px] text-center transition-all ${getHeatmapColorClass(val)}`}>
                          {val.toFixed(1)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Блок Б: Реестр команды */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Команда</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600 border-collapse">
            <thead className="text-sm text-slate-400 border-b border-slate-100">
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 font-semibold">Сотрудник</th>
                <th className="px-6 py-4 font-semibold">Профиль</th>
                <th className="px-6 py-4 font-semibold text-center">Соответствие</th>
                <th className="px-6 py-4 font-semibold text-center">Суперсилы</th>
                <th className="px-6 py-4 font-semibold text-center">Зоны роста</th>
                <th className="px-6 py-4 font-semibold text-center">статус</th>
                <th className="px-6 py-4 font-semibold text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {activeEvaluations.map(evalItem => {
                const session = sessions.find(s => s.id === evalItem.sessionId);
                const profile = getProfileForEvaluation(evalItem, session);
                
                if (!profile) return null;
 
                const scores = evalItem.status === 'calibrated' ? evalItem.calibratedScores : evalItem.selfScores;
                
                // Calculate match
                const overallMatch = calculateOverallCoverage(categories, skills, profile, scores);
 
                // Count Superpowers & Growth Areas
                // Superpowers: fact >= target (where target > 0)
                // Growth areas: fact < target (where target > 0)
                let superpowersCount = 0;
                let growthAreasCount = 0;
 
                profile.requirements.forEach(req => {
                  if (req.targetLevel > 0) {
                    const factValue = scores[req.skillId] ?? 0;
                    if (factValue >= req.targetLevel) {
                      superpowersCount++;
                    } else {
                      growthAreasCount++;
                    }
                  }
                });
 
                return (
                  <tr key={evalItem.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 flex flex-col">
                      <span>{evalItem.designerName}</span>
                      <span className="text-sm text-slate-400 font-normal">{evalItem.dateSubmitted}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {profile.title}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                          overallMatch >= 90 ? 'bg-emerald-50 text-emerald-700' :
                          overallMatch >= 70 ? 'bg-sky-50 text-sky-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {overallMatch}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-full px-2.5 py-0.5 text-sm font-semibold">
                        {superpowersCount} 💪
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-amber-50 text-amber-800 border border-amber-100 rounded-full px-2.5 py-0.5 text-sm font-semibold">
                        {growthAreasCount} 🎯
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-bold">
                      {evalItem.status === 'calibrated' ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                          Готово
                        </span>
                      ) : (
                        <span className="text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                          Ожидает калибровки
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => onSelectDesignerDetails?.(evalItem.id)}
                        className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm rounded-lg px-3 py-1.5 text-sm font-semibold cursor-pointer transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Подробнее</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
