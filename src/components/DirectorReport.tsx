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
import { Category, Skill, Profile, Evaluation, Session, SkillScores } from '../types';
import { calculateCategoryCoverage, calculateOverallCoverage, determineMostSuitableProfile } from '../utils';

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
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);

  const getProfileForEvaluation = (evalItem: Evaluation, session: Session | undefined) => {
    if (!session || session.profileId === 'profile-general') {
      const scores = evalItem.status === 'calibrated' ? evalItem.calibratedScores : evalItem.selfScores;
      return determineMostSuitableProfile(categories, skills, profiles, scores);
    }
    return profiles.find(p => p.id === session.profileId) || profiles[0];
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Аналитика
          </h1>
          <p className="text-slate-500 mt-2 text-sm max-w-2xl">
            Сводные метрики покрытия требований профилей, рейтинг командных дефицитов и индивидуальные результаты калибровки.
          </p>
        </div>

        <div>
          <button
            id="share-report-btn"
            onClick={handleShareReport}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2.5 rounded-lg shadow-sm hover:shadow transition-all text-sm cursor-pointer"
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
        {/* Widget 1: Количество дизайнеров */}
        <div id="stat-widget-count" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Всего дизайнеров</p>
          <div className="flex items-end gap-1.5 mt-2">
            <span className="text-3xl font-bold text-slate-800 leading-none">{totalDesignersCount}</span>
            <span className="text-slate-500 text-xs font-medium pb-0.5">чел.</span>
          </div>
        </div>

        {/* Widget 2: Процент откалиброванных анкет */}
        <div id="stat-widget-progress" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Калибровка анкет</p>
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-800 leading-none">{calibrationPercent}%</span>
              <span className="text-xs font-semibold text-slate-400 pb-0.5">{calibratedCount} из {totalDesignersCount}</span>
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
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Сильнейшая область</p>
          <div className="flex flex-col items-start mt-2">
            <span className="text-[11px] font-bold text-indigo-750 bg-indigo-50 px-2 py-0.5 rounded mb-1 max-w-full truncate" title={strongestCategory ? strongestCategory.category.title : 'Недостаточно данных'}>
              {strongestCategory ? strongestCategory.category.title : 'Недостаточно данных'}
            </span>
            <span className="text-2xl font-bold text-slate-800 leading-none">{strongestCategory ? `${strongestCategory.average}%` : '—'}</span>
          </div>
        </div>

        {/* Widget 4: Дефицит команды */}
        <div id="stat-widget-deficit" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Главный дефицит</p>
          <div className="flex flex-col items-start mt-2">
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded mb-1 max-w-full truncate" title={weakestCategory ? weakestCategory.category.title : 'Недостаточно данных'}>
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
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              Рейтинг дефицитов компетенций (Командная просадка)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Упорядоченный список навыков с наибольшим коллективным отставанием от плановых стандартов профилей участников с учетом веса каждого навыка.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {skillDeficits.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-4 text-center">Все требования должностей у всех сотрудников выполнены на 100%!</p>
            ) : (
              skillDeficits.slice(0, 5).map((def, idx) => {
                const percentShortage = Math.round(def.deficit * 100);
                return (
                  <div key={def.skill.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-50 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-indigo-700 shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-slate-800 font-semibold">{def.skill.title}</span>
                        <span className="text-slate-400">({def.category?.title})</span>
                      </div>
                      <span className="text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded text-[10px]">
                        Индекс дефицита: {Math.round(def.deficit * 100) / 100}
                      </span>
                    </div>
                    {/* Progress Bar showing deficit */}
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-red-500 rounded-full h-full"
                        style={{ width: `${Math.min(100, Math.max(10, percentShortage * 1.5))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span>Отставание у {def.absoluteGapsCount} сотрудников</span>
                      <span>Чем длиннее полоса, тем критичнее разрыв для бизнеса</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Category Context Indicators or quick guidelines */}
        <div className="lg:col-span-5 bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-4">
          <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Целевые ориентиры покрытия по категориям</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Каждому прикладному навыку заданы весовые коэффициенты. Ниже представлен общий процент покрытия требований профиля всей командой в среднем по категориям.
          </p>

          <div className="space-y-4 pt-2">
            {categoryAverages.map(ca => (
              <div key={ca.category.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">{ca.category.title}</span>
                  <span className="font-bold text-indigo-600">{ca.average}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full" 
                    style={{ width: `${ca.average}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 rounded-lg p-3.5 border border-amber-200/60 text-xs text-amber-800 flex gap-2.5">
            <Award className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block mb-0.5">Приоритеты ИПР</strong>
              Каждый сотрудник имеет автоматическую приоритизацию навыков до следующего профиля на основе индекса важности. Нажмите «Подробнее» в таблице ниже, чтобы ознакомиться с персональной дорожной картой сотрудника.
            </div>
          </div>
        </div>
      </div>

      {/* Блок Б: Реестр команды */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Списочный состав и реестр аттестации команды</h3>
            <p className="text-xs text-slate-400 mt-1">Оценки соответствия текущему профилю, количество выявленных суперсил и зон роста сотрудников.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium border border-slate-200">
              Всего анкет: {activeEvaluations.length}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600 border-collapse">
            <thead className="text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 font-semibold">ФИО сотрудника</th>
                <th className="px-6 py-4 font-semibold">Профиль</th>
                <th className="px-6 py-4 font-semibold text-center">% Соответствия</th>
                <th className="px-6 py-4 font-semibold text-center">Суперсилы</th>
                <th className="px-6 py-4 font-semibold text-center">Зоны роста</th>
                <th className="px-6 py-4 font-semibold text-center">Статус анкеты</th>
                <th className="px-6 py-4 font-semibold text-center">Действие</th>
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
                      <span className="text-[10px] text-slate-400 font-normal">Отправлено {evalItem.dateSubmitted}</span>
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
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                        {superpowersCount} 💪
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-amber-50 text-amber-800 border border-amber-100 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                        {growthAreasCount} 🎯
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center uppercase text-[10px] tracking-wider font-bold">
                      {evalItem.status === 'calibrated' ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                          ✓ Калибрована
                        </span>
                      ) : (
                        <span className="text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                          Заполнена
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedEvaluation(evalItem)}
                        className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all"
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

      {/* Modal / Slide-over detail panel for a designer's details */}
      {selectedEvaluation && (() => {
        const evalItem = selectedEvaluation;
        const session = sessions.find(s => s.id === evalItem.sessionId);
        const profile = getProfileForEvaluation(evalItem, session);
        if (!profile) return null;

        const scores = evalItem.status === 'calibrated' ? evalItem.calibratedScores : evalItem.selfScores;
        const overallMatch = calculateOverallCoverage(categories, skills, profile, scores);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div id="designer-detail-modal" className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-scaleUp">
              {/* Modal header */}
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                <div>
                  <h4 className="text-xl font-extrabold text-slate-900">{evalItem.designerName}</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Детальная карта оценки по профилю: <span className="font-semibold text-indigo-600">{profile.title}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEvaluation(null)}
                  className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Hero scorecard */}
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Общий балл покрытия требований</span>
                    <h2 className="text-4xl font-extrabold">{overallMatch}%</h2>
                    <p className="text-xs text-indigo-200">
                      Статус: {evalItem.status === 'calibrated' ? 'Откалибровано лидером компетенции' : 'Ожидает калибровки'}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-white/10 px-4 py-2.5 rounded-lg text-center">
                      <span className="text-xs text-slate-300 block">Статус анкеты</span>
                      <strong className="text-sm block mt-1 font-bold text-emerald-300">
                        {evalItem.status === 'calibrated' ? 'УТВЕРЖДЕНО' : 'ЗАПОЛНЕНО'}
                      </strong>
                    </div>
                    {onSelectDesignerDetails && (
                      <button
                        onClick={() => {
                          setSelectedEvaluation(null);
                          onSelectDesignerDetails(evalItem.id);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow cursor-pointer transition-all flex items-center gap-1.5 shrink-0 hover:scale-[1.02]"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Открыть в Планшете калибровки</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Score differences visual bar for each Category */}
                <div className="space-y-3">
                  <h5 className="font-bold text-slate-800 text-sm">Сводка успеваемости по категориям:</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {categories.map(cat => {
                      const cov = calculateCategoryCoverage(cat.id, skills, profile, scores);
                      return (
                        <div key={cat.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <span className="text-slate-800 text-xs font-extrabold block truncate">{cat.title}</span>
                          <div className="flex justify-between items-end mt-2">
                            <span className="text-slate-400 text-[10px]">Процент соответствия</span>
                            <span className="text-indigo-600 text-lg font-extrabold">{cov}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div className={`h-full rounded-full ${
                              cov >= 90 ? 'bg-emerald-500' :
                              cov >= 70 ? 'bg-indigo-500' : 'bg-amber-500'
                            }`} style={{ width: `${cov}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Detailed skill scores list */}
                <div className="space-y-4">
                  <h5 className="font-bold text-slate-800 text-sm">Показатели навыков в деталях:</h5>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {profile.requirements.map(req => {
                      const skill = skills.find(s => s.id === req.skillId);
                      if (!skill) return null;

                      const selfVal = evalItem.selfScores[skill.id] ?? 0;
                      const calVal = evalItem.calibratedScores[skill.id] ?? selfVal;
                      const targetVal = req.targetLevel;
                      const hasCalChange = evalItem.status === 'calibrated' && selfVal !== calVal;

                      return (
                        <div key={req.skillId} className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-slate-50/50">
                          <div className="space-y-1 max-w-lg">
                            <span className="font-bold text-slate-900 border-b border-indigo-100 pb-0.5 inline-block text-xs">
                              {skill.title}
                            </span>
                            <p className="text-xs text-slate-500 mt-1 lines-2-capped">{skill.description}</p>
                          </div>

                          <div className="flex items-center gap-6 shrink-0 text-xs font-semibold">
                            {/* Score info badge */}
                            <div className="flex gap-4">
                              <div className="text-center">
                                <span className="text-[10px] text-slate-400 block font-normal">Самооценка</span>
                                <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs mt-1 block">
                                  {selfVal}
                                </span>
                              </div>

                              <div className="text-center">
                                <span className="text-[10px] text-slate-400 block font-normal">Калибровка</span>
                                <span className={`px-2 py-0.5 rounded text-xs mt-1 block ${
                                  hasCalChange 
                                    ? 'bg-amber-100 text-amber-800 font-bold border border-amber-200' 
                                    : 'bg-indigo-50 text-indigo-700'
                                }`}>
                                  {calVal}
                                </span>
                              </div>

                              <div className="text-center">
                                <span className="text-[10px] text-slate-400 block font-normal">Требуется</span>
                                <span className="text-slate-550 border border-slate-200 bg-slate-50 px-2 py-0.5 rounded text-xs mt-1 block">
                                  {targetVal}
                                </span>
                              </div>
                            </div>

                            {/* Gap tag */}
                            <div>
                              {calVal >= targetVal ? (
                                <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-[10px] uppercase font-bold border border-emerald-100 shrink-0">
                                  Выполнено
                                </span>
                              ) : (
                                <span className="bg-red-50 text-red-700 px-2 py-1 rounded text-[10px] uppercase font-bold border border-red-100 shrink-0">
                                  Зазор -{targetVal - calVal}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Calibration comments logged */}
                {Object.keys(evalItem.calibrationJustifications).length > 0 && (
                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/60 space-y-2.5">
                    <h5 className="font-extrabold text-amber-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Обоснования изменений оценок лидом:
                    </h5>
                    <div className="space-y-3 divide-y divide-amber-200/40">
                      {Object.entries(evalItem.calibrationJustifications).map(([skId, justification]) => {
                        const sk = skills.find(s => s.id === skId);
                        return (
                          <div key={skId} className="pt-2 first:pt-0 text-xs">
                            <span className="font-bold text-amber-900">{sk ? sk.title : 'Навык'}:</span>
                            <p className="text-amber-800 italic mt-1 bg-white p-2.5 rounded border border-amber-200/50">
                              « {justification} »
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Approved actions plans view */}
                <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                  <h5 className="font-bold text-indigo-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Индивидуальный план развития от лидера компетенции:
                  </h5>
                  {evalItem.actionPlan ? (
                    <div className="text-sm text-indigo-950 mt-3 whitespace-pre-wrap leading-relaxed bg-white/60 p-4 rounded-lg border border-indigo-100">
                      {evalItem.actionPlan}
                    </div>
                  ) : (
                    <p className="text-xs text-indigo-500 italic mt-2">План действий находится на этапе разработки и согласования.</p>
                  )}
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedEvaluation(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-sm transition-all cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
