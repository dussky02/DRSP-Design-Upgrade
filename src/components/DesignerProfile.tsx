/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Award, TrendingUp, AlertCircle, Sparkles, BookOpen, Clock, 
  CheckCircle2, Compass, ArrowRight, UserCheck, Shield, HelpCircle, AlertTriangle
} from 'lucide-react';
import { 
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, Legend, Tooltip 
} from 'recharts';
import { Category, Skill, Profile, Evaluation, Session } from '../types';
import { calculateCategoryCoverage, calculateOverallCoverage, calculateIDPPriorities } from '../utils';

interface DesignerProfileProps {
  evaluation: Evaluation;
  session: Session;
  profile: Profile;
  nextProfile?: Profile; // Nullable if top grade
  categories: Category[];
  skills: Skill[];
}

export default function DesignerProfile({
  evaluation,
  session,
  profile,
  nextProfile,
  categories,
  skills
}: DesignerProfileProps) {
  const isCalibrated = evaluation.status === 'calibrated';
  const activeScores = isCalibrated ? evaluation.calibratedScores : evaluation.selfScores;

  // Compute stats
  const overallMatch = calculateOverallCoverage(categories, skills, profile, activeScores);

  // Group into superpowers and growth areas
  const superpowers: { skill: Skill; score: number; target: number }[] = [];
  const growthAreas: { skill: Skill; score: number; target: number; gap: number }[] = [];

  // Prepare radar data (Self-Assessment vs Target)
  const radarData = categories.map(cat => {
    const catSkills = skills.filter(s => s.categoryId === cat.id);
    const catReqs = profile.requirements.filter(r => catSkills.some(s => s.id === r.skillId));
    
    if (catReqs.length === 0) return null;

    const avgTarget = catReqs.reduce((sum, r) => sum + r.targetLevel, 0) / catReqs.length;
    const avgSelf = catReqs.reduce((sum, r) => {
      return sum + (evaluation.selfScores[r.skillId] ?? 0);
    }, 0) / catReqs.length;

    return {
      subject: cat.title,
      'Цель (Профиль)': Math.round(avgTarget * 10) / 10,
      'Факт (Самооценка)': Math.round(avgSelf * 10) / 10,
      fullMark: 4
    };
  }).filter(Boolean);

  profile.requirements.forEach(req => {
    const skill = skills.find(s => s.id === req.skillId);
    if (skill) {
      const score = activeScores[skill.id] ?? 0;
      const target = req.targetLevel;
      if (target > 0) {
        if (score >= target) {
          superpowers.push({ skill, score, target });
        } else {
          growthAreas.push({ skill, score, target, gap: target - score });
        }
      }
    }
  });

  // Solve priority index list to next grade
  const idpItems = nextProfile 
    ? calculateIDPPriorities(skills, activeScores, nextProfile)
    : [];

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto pt-4 pb-12">
      {/* Main Banner Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-indigo-600 text-white px-8 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight">{evaluation.designerName}</h1>
            <p className="text-slate-150 text-sm font-medium">
              Базовый профиль оценки: <strong className="text-white font-semibold">{profile.title}</strong> • Сессия: {session.title}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center bg-indigo-700/60 p-4 rounded-xl border border-indigo-500/30 shrink-0 text-center md:min-w-[170px]">
            <span className="text-sm text-indigo-100 font-bold block">Общее соответствие</span>
            <div className="text-4xl font-black mt-1 text-white">{overallMatch}%</div>
            <span className="text-sm text-indigo-200 mt-1 block">по требованиям профиля</span>
          </div>
        </div>

        {/* Status band */}
        <div className="px-8 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 text-sm font-semibold">
          <div className="flex items-center gap-2">
            {isCalibrated ? (
              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-sm">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                Оценки утверждены и откалиброваны лидом
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-sm">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Ожидает калибровки • Показана ваша самооценка
              </span>
            )}
          </div>
          <span className="text-slate-400">Форма отправлена: {evaluation.dateSubmitted}</span>
        </div>

        {/* Content body */}
        <div className="p-8 space-y-8">
          
          {/* Category coverage progress */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start">
            <div className="xl:col-span-3">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                Процент соответствия по направлениям навыков
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {categories.map(cat => {
                  const cov = calculateCategoryCoverage(cat.id, skills, profile, activeScores);
                  return (
                    <div key={cat.id} className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-2">
                      <span className="text-sm font-extrabold text-slate-400 block">{cat.title}</span>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed lines-2-capped pb-2">{cat.description}</p>
                      
                      <div className="flex justify-between items-end pt-1">
                        <span className="text-sm text-slate-400">Покрытие</span>
                        <strong className="text-sm font-extrabold text-indigo-600">{cov}%</strong>
                      </div>

                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            cov >= 90 ? 'bg-emerald-500' :
                            cov >= 70 ? 'bg-indigo-500' : 'bg-amber-500'
                          }`} 
                          style={{ width: `${cov}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Radar Chart */}
            <div className="xl:col-span-2 bg-slate-50/50 border border-slate-200 rounded-2xl p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Радар компетенций
                </h4>
              </div>
              <p className="text-sm text-slate-500 mb-6 font-medium">
                Сравнение профиля должности ({profile.title}) с вашей самооценкой по ключевым доменам.
              </p>
              
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: '#64748b', fontSize: 14, fontWeight: 700 }}
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 4]} 
                      tick={{ fill: '#94a3b8', fontSize: 14 }}
                    />
                    <Radar
                      name="Цель (Профиль)"
                      dataKey="Цель (Профиль)"
                      stroke="#4f46e5"
                      fill="#4f46e5"
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                    <Radar
                      name="Факт (Самооценка)"
                      dataKey="Факт (Самооценка)"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        fontSize: '14px',
                        fontWeight: '700'
                      }} 
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center"
                      wrapperStyle={{ fontSize: '14px', fontWeight: '700', paddingTop: '20px' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Superpowers vs Growth fields */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
            {/* Superpowers card block */}
            <div className="border border-emerald-100 rounded-xl p-6 bg-emerald-50/20 shadow-sm space-y-4">
              <h4 className="font-extrabold text-emerald-900 text-sm flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                Мои суперсилы ({superpowers.length})
              </h4>
              <p className="text-sm text-emerald-800/80 leading-relaxed">
                Навыки, в которых ваш уровень полностью соответствует требованиям профиля или превышает их. Используйте эти сильные стороны для развития команды:
              </p>

              <div className="space-y-2.5 pt-1">
                {superpowers.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Навыки соответствия не выявлены.</p>
                ) : (
                  superpowers.map(item => (
                    <div key={item.skill.id} className="bg-white border border-emerald-100/70 p-3 rounded-lg flex justify-between items-center text-sm">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900">{item.skill.title}</span>
                        <p className="text-sm text-slate-500 truncate max-w-[200px]">{item.skill.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-100">
                          Итог: {item.score}
                        </span>
                        <span className="text-sm text-slate-400">План: {item.target}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Growth Areas block */}
            <div className="border border-amber-150 rounded-xl p-6 bg-amber-50/10 shadow-sm space-y-4">
              <h4 className="font-extrabold text-amber-950 text-sm flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                Зоны роста ({growthAreas.length})
              </h4>
              <p className="text-sm text-amber-800 shadow-none">
                Навыки, где ваши текущие результаты отстают от планового ориентира профиля. Это приоритетные точки внимания для текущего квартала:
              </p>

              <div className="space-y-2.5 pt-1">
                {growthAreas.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Вы на 100% соответствуете всем требованиям профиля!</p>
                ) : (
                  growthAreas.map(item => (
                    <div key={item.skill.id} className="bg-white border border-amber-100 p-3 rounded-lg flex justify-between items-center text-sm">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900">{item.skill.title}</span>
                        <p className="text-sm text-slate-400 truncate max-w-[200px]">{item.skill.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100">
                          Зазор -{item.gap}
                        </span>
                        <span className="text-sm text-slate-400">Факт: {item.score} / План: {item.target}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Calibrator comment logs */}
          {isCalibrated && Object.keys(evaluation.calibrationJustifications).length > 0 && (
            <div className="bg-amber-50/30 p-5 rounded-xl border border-amber-200/50 space-y-3">
              <h4 className="text-amber-900 font-extrabold text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Обоснования изменений оценок от лидера компетенции:
              </h4>
              <div className="space-y-3 divide-y divide-amber-200/30">
                {Object.entries(evaluation.calibrationJustifications).map(([skId, justification]) => {
                  const sk = skills.find(s => s.id === skId);
                  return (
                    <div key={skId} className="pt-3 first:pt-0 text-sm">
                      <span className="font-bold text-amber-950 font-semibold">{sk ? sk.title : 'Навык'}</span>
                      <p className="text-slate-700 mt-1 italic pl-2.5 border-l-2 border-amber-400">
                        « {justification} »
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Plan by Lead */}
          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl space-y-3">
            <h3 className="font-extrabold text-indigo-900 text-sm flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Индивидуальный план развития (ИПР) от лидера компетенции
            </h3>
            {isCalibrated && evaluation.actionPlan ? (
              <div className="text-sm text-indigo-950 bg-white/75 p-5 rounded-xl border border-indigo-100 whitespace-pre-wrap leading-relaxed">
                {evaluation.actionPlan}
              </div>
            ) : (
              <p className="text-sm text-indigo-600 font-medium bg-white/40 p-4 rounded-xl border border-indigo-100/50 italic">
                {isCalibrated 
                  ? 'Лидер компетенции утвердил калибровку оценок, но поле текстовых рекомендаций оставлено пустым.'
                  : 'План развития и рекомендации станут доступны на этой вкладке сразу после того, как Дизайн-лид утвердит калибровку ваших баллов.'
                }
              </p>
            )}
          </div>

          {/* Career Tracking & Priorities to Next Grade (Scenario 3.2 // Section 3.3) */}
          {nextProfile && (
            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h4 className="font-bold text-slate-900">Развитие до следующего профиля</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    Ориентир ступени развития: <strong className="text-indigo-600">{nextProfile.title}</strong>
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 text-sm text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full font-bold">
                  <span>Шаг карьеры</span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Автоматически сформированный список навыков с наивысшим <strong>Индексом Приоритета</strong> для получения следующего профиля. Навыки отсортированы на основе величины отставания, умноженной на его весовой коэффициент. Опережайте ожидания бизнеса, прокачивая топ-позиции первыми:
              </p>

              <div className="space-y-3 pt-2">
                {idpItems.length === 0 ? (
                  <p className="text-sm text-emerald-800 bg-emerald-50 p-4 rounded-xl font-medium border border-emerald-100">
                    🎉 Поздравляем! Ваши текущие оценки уже превосходят целевые показатели следующего профиля «{nextProfile.title}»! Вы готовы к промоушену!
                  </p>
                ) : (
                  idpItems.slice(0, 4).map((idp, idx) => (
                    <div key={idp.skill.id} className="bg-white p-4 rounded-xl border border-slate-200 gap-3 flex flex-col sm:flex-row sm:items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-sm font-extrabold ${
                            idx === 0 ? 'bg-red-100 text-red-700' :
                            idx === 1 ? 'bg-amber-100 text-amber-700' :
                            'bg-indigo-50 text-indigo-700'
                          }`}>
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">{idp.skill.title}</span>
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-sm font-bold">
                            Приоритет: {idp.priorityIndex}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 leading-normal">{idp.skill.description}</p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 text-sm">
                        <div className="text-slate-400">
                          Текущий балл: <strong className="text-slate-700 font-bold">{idp.currentScore}</strong>
                        </div>
                        <div className="text-indigo-600">
                          Целевой балл: <strong className="font-extrabold">{idp.targetLevel}</strong>
                        </div>
                        <div className="text-slate-400 text-sm">
                          Вес навыка: <span className="font-semibold text-slate-800">{idp.weight}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
