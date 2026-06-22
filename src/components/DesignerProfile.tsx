/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Award, TrendingUp, AlertCircle, Sparkles, BookOpen, Clock, 
  CheckCircle2, Compass, UserCheck, Shield, HelpCircle, AlertTriangle, X
} from 'lucide-react';
import { 
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, Legend, Tooltip 
} from 'recharts';
import { Category, Skill, Profile, Evaluation, Session, AppState } from '../types';
import { calculateCategoryCoverage, calculateOverallCoverage, calculateIDPPriorities, parseActionPlan, GoalItem } from '../utils';

interface DesignerProfileProps {
  evaluation: Evaluation;
  session: Session;
  profile: Profile;
  nextProfile?: Profile; // Nullable if top grade
  categories: Category[];
  skills: Skill[];
  profiles: Profile[];
  onUpdateState?: (newState: AppState) => void;
  appState?: AppState;
}

export default function DesignerProfile({
  evaluation,
  session,
  profile,
  nextProfile,
  categories,
  skills,
  profiles,
  onUpdateState,
  appState
}: DesignerProfileProps) {
  const isCalibrated = evaluation.status === 'calibrated';
  const activeScores = isCalibrated ? evaluation.calibratedScores : evaluation.selfScores;

  const [showAllSuperpowers, setShowAllSuperpowers] = React.useState(false);
  const [showAllGrowthAreas, setShowAllGrowthAreas] = React.useState(false);
  const [isGroupsModalOpen, setIsGroupsModalOpen] = React.useState(false);

  const handleToggleGoal = (goalId: string) => {
    if (!onUpdateState || !appState) return;
    const goalsList = parseActionPlan(evaluation.actionPlan || '');
    const updatedGoals = goalsList.map(g => g.id === goalId ? { ...g, completed: !g.completed } : g);
    const updatedActionPlan = JSON.stringify(updatedGoals);

    const updatedEvaluations = appState.evaluations.map(e => {
      if (e.id === evaluation.id) {
        return {
          ...e,
          actionPlan: updatedActionPlan
        };
      }
      return e;
    });

    onUpdateState({
      ...appState,
      evaluations: updatedEvaluations
    });
  };


  const categoriesWithSkills = React.useMemo(() => 
    categories.filter(cat => skills.some(s => s.categoryId === cat.id)),
    [categories, skills]
  );
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const activeCategoryId = selectedCategory && categoriesWithSkills.some(c => c.id === selectedCategory)
    ? selectedCategory
    : (categoriesWithSkills[0]?.id || '');

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
      return sum + (activeScores[r.skillId] ?? 0);
    }, 0) / catReqs.length;

    return {
      subject: cat.title,
      [profile.title]: Math.round(avgTarget * 10) / 10,
      'Моя': Math.round(avgSelf * 10) / 10,
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

  // Sort superpowers: first those with score > target, then those with score === target
  superpowers.sort((a, b) => {
    const surplusA = a.score - a.target;
    const surplusB = b.score - b.target;
    
    // Put surplus first, then equal. So higher surplus comes first.
    if (surplusA > 0 && surplusB === 0) return -1;
    if (surplusB > 0 && surplusA === 0) return 1;
    
    // If both have surplus, Sort by highest surplus first
    if (surplusA > 0 && surplusB > 0) return surplusB - surplusA;
    
    // Otherwise keep current order
    return 0;
  });

  // Solve priority index list to next grade
  const idpItems = nextProfile 
    ? calculateIDPPriorities(skills, activeScores, nextProfile)
    : [];

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto pt-4 pb-12">
      {/* Name, session, date submitted & status (No white plate, clean borderless and transparent container) */}
      <div className="px-2 py-4">
        <div className="space-y-3 w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">{evaluation.designerName}</h1>
            <div className="shrink-0">
              {isCalibrated ? (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm">
                  Готово
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Ожидает калибровки
                </span>
              )}
            </div>
          </div>
          
          <div className="text-slate-500 text-sm font-medium space-y-1">
            <div>Сессия: <span className="text-slate-800 font-bold">{session.title}</span></div>
            <div>Отправлено: <span className="text-slate-800 font-bold">{evaluation.dateSubmitted}</span></div>
          </div>
        </div>
      </div>

      {/* Card 1.5: Название профиля, её описание и радарная диаграмма в блоке "Твой уровень" */}
      {isCalibrated && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 animate-fadeIn relative">
          {/* Matching Percentage Button in the top right corner */}
          <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-10">
            <button
              onClick={() => setIsGroupsModalOpen(true)}
              className="text-xs sm:text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-1.5 rounded-full font-bold transition-all shadow-6xs hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
              title="Показать соответствие по группам навыков"
            >
              <span>{overallMatch}% соответствия</span>
            </button>
          </div>

          <div className="pr-32 sm:pr-0">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 mb-1">Твой уровень</h2>
            <h3 className="text-2xl font-black text-slate-950 mb-3">{profile.title}</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mt-6">
            {/* Left side: Profile Description */}
            <div className="space-y-4">
              {profile.description ? (
                <p className="text-slate-600 text-sm md:text-base leading-relaxed">{profile.description}</p>
              ) : (
                <p className="text-slate-400 text-sm italic">Описание профиля отсутствует.</p>
              )}
            </div>

            {/* Right side: Radar Chart */}
            <div className="bg-slate-50/40 border border-slate-200 rounded-2xl p-6 flex flex-col justify-center">
              <div className="w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 4]} 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                    />
                    <Radar
                      name={profile.title}
                      dataKey={profile.title}
                      stroke="#4f46e5"
                      fill="#4f46e5"
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                    <Radar
                      name="Моя"
                      dataKey="Моя"
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
                      wrapperStyle={{ fontSize: '12px', fontWeight: '700', paddingTop: '10px' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Superpowers & Growth areas in columns, each as a separate white card */}
      {isCalibrated && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
          {/* Card 3: Мои суперсилы */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Мои суперсилы
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Навыки, в которых ваш уровень полностью соответствует требованиям профиля или превышает их. Используйте эти сильные стороны для развития команды:
            </p>

            <div className="space-y-2.5 pt-1">
              {superpowers.length === 0 ? (
                <p className="text-sm text-slate-500 italic">Навыки соответствия не выявлены.</p>
              ) : (
                <>
                  {(showAllSuperpowers ? superpowers : superpowers.slice(0, 3)).map(item => (
                    <div key={item.skill.id} className="bg-emerald-50/15 border border-emerald-100 p-3 rounded-lg text-sm">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900">{item.skill.title}</span>
                        <p className="text-xs text-slate-500">{item.skill.description}</p>
                      </div>
                    </div>
                  ))}
                  {superpowers.length > 3 && (
                    <button
                      onClick={() => setShowAllSuperpowers(!showAllSuperpowers)}
                      className="w-full text-center mt-3 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors py-2 border border-dashed border-emerald-200 hover:border-emerald-300 rounded-lg bg-white"
                    >
                      {showAllSuperpowers ? 'Свернуть список' : `Показать все (${superpowers.length})`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Card 4: Зоны роста */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              Зоны роста
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Навыки, где ваши текущие результаты отстают от планового ориентира профиля. Это приоритетные точки внимания для текущего квартала:
            </p>

            <div className="space-y-2.5 pt-1">
              {growthAreas.length === 0 ? (
                <p className="text-sm text-slate-500 italic">Вы на 100% соответствуете всем требованиям профиля!</p>
              ) : (
                <>
                  {(showAllGrowthAreas ? growthAreas : growthAreas.slice(0, 3)).map(item => (
                    <div key={item.skill.id} className="bg-amber-50/15 border border-amber-100 p-3 rounded-lg text-sm">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900">{item.skill.title}</span>
                        <p className="text-xs text-slate-400">{item.skill.description}</p>
                      </div>
                    </div>
                  ))}
                  {growthAreas.length > 3 && (
                    <button
                      onClick={() => setShowAllGrowthAreas(!showAllGrowthAreas)}
                      className="w-full text-center mt-3 text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors py-2 border border-dashed border-amber-200 hover:border-amber-300 rounded-lg bg-white"
                    >
                      {showAllGrowthAreas ? 'Свернуть список' : `Показать все (${growthAreas.length})`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Благодарность за прохождение анкеты в статусе "ОЖИДАЕТ КАЛИБРОВКИ" */}
      {!isCalibrated && (
        <div className="bg-indigo-50/40 border border-indigo-100/70 rounded-2xl p-8 space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-indigo-950 mb-1.5">Спасибо за прохождение анкеты самооценки!</h3>
              <p className="text-indigo-950 text-sm md:text-base leading-relaxed font-semibold">
                Твои ответы успешно сохранены и отправлены на калибровку. Нужно немного подождать, пока Лидер компетенции проверит и утвердит оценки. Сразу после этого здесь появятся твой <strong className="font-extrabold text-indigo-900">профиль развития</strong> с подробным разбором, <strong className="font-extrabold text-indigo-900">суперсилы</strong>, <strong className="font-extrabold text-indigo-900">зоны роста</strong> и интерактивный <strong className="font-extrabold text-indigo-900">индивидуальный план развития</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Card 5: Компетенции + Обоснования изменений оценок от лидера компетенции */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <h3 className="text-xl font-extrabold text-slate-900">
          Компетенции
        </h3>

        {/* Category tabs */}
        {categoriesWithSkills.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2">
            {categoriesWithSkills.map(cat => {
              const isActive = cat.id === activeCategoryId;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border outline-none ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                      : 'bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {cat.title}
                </button>
              );
            })}
          </div>
        )}

        <div className="space-y-6">
          {(() => {
            const cat = categoriesWithSkills.find(c => c.id === activeCategoryId);
            if (!cat) return <p className="text-sm text-slate-500 italic">Группы навыков отсутствуют.</p>;

            const categorySkills = skills.filter(s => s.categoryId === cat.id);
            if (categorySkills.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-4 animate-fadeIn">
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-sm table-fixed">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="w-[240px] px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Навык
                        </th>
                        {[0, 1, 2, 3, 4].map(lvl => {
                          const levelNames = [
                            'Отсутствует',
                            'Осведомлённость',
                            'Умение',
                            'Экспертиза',
                            'Лидерство'
                          ];
                          return (
                            <th key={lvl} className="w-[180px] px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              {levelNames[lvl]}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {categorySkills.map(skill => {
                        const selfScore = evaluation.selfScores[skill.id] ?? 0;
                        const calibratedScore = evaluation.calibratedScores?.[skill.id];
                        
                        const req = profile.requirements.find(r => r.skillId === skill.id);
                        const targetLevel = req ? req.targetLevel : 0;

                        return (
                          <tr key={skill.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-4 align-top">
                              <span className="font-bold text-slate-900 block leading-tight">{skill.title}</span>
                              <span className="text-xs text-slate-400 block mt-1" title={skill.description}>
                                {skill.description}
                              </span>
                            </td>
                            {[0, 1, 2, 3, 4].map(lvl => {
                              const description = skill.levels[lvl] || 'Описание отсутствует';
                              const isSelfMatch = lvl === selfScore;
                              const isTargetMatch = lvl === targetLevel;
                              const isCalibratedMatch = isCalibrated && lvl === calibratedScore;

                              const textClass = 'text-slate-800';

                              return (
                                <td key={lvl} className="px-4 py-4 align-top">
                                  <div className="flex flex-col gap-2">
                                    <div className="flex flex-wrap items-center gap-1">
                                      {isSelfMatch && (
                                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md shadow-sm">
                                          Моя
                                        </span>
                                      )}
                                      {isTargetMatch && isCalibrated && (
                                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-md shadow-sm">
                                          Ожидание
                                        </span>
                                      )}
                                      {isCalibratedMatch && isCalibrated && (
                                        <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-md shadow-sm">
                                          Калибровка
                                        </span>
                                      )}
                                    </div>
                                    <p className={`text-xs leading-normal whitespace-pre-wrap ${textClass}`}>
                                      {description}
                                    </p>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Calibrator comment logs inside Card 5 block */}
        {isCalibrated && Object.keys(evaluation.calibrationJustifications).length > 0 && (
          <div className="bg-amber-50/30 p-5 rounded-xl border border-amber-200/50 space-y-3 mt-6">
            <h4 className="text-amber-900 font-extrabold text-sm flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Обоснования изменений оценок от лидера компетенции:
            </h4>
            <div className="space-y-3 divide-y divide-amber-200/30">
              {Object.entries(evaluation.calibrationJustifications).map(([skId, justification]) => {
                const sk = skills.find(s => s.id === skId);
                return (
                  <div key={skId} className="pt-3 first:pt-0 text-sm">
                    <span className="font-bold text-amber-950">{sk ? sk.title : 'Навык'}</span>
                    <p className="text-slate-700 mt-1 italic pl-2.5 border-l-2 border-amber-400">
                      « {justification} »
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Card 6: Индивидуальный план развития */}
      {isCalibrated && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 animate-fadeIn">
          <h3 className="font-extrabold text-slate-900 text-lg">
            Индивидуальный план развития
          </h3>
          {evaluation.actionPlan ? (() => {
            const goals = parseActionPlan(evaluation.actionPlan);
            if (goals.length === 0) {
              return (
                <p className="text-sm text-slate-500 font-medium bg-slate-50 p-4 rounded-xl border border-slate-200/60 italic">
                  Лидер компетенции утвердил калибровку оценок, но список целей оставлен пустым.
                </p>
              );
            }
            const completedCount = goals.filter(g => g.completed).length;
            const progressPercent = Math.round((completedCount / goals.length) * 100);

            return (
              <div className="space-y-4">
                {/* Progress Bar styled like inside DesignerForm */}
                <div className="space-y-2">
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm text-slate-400 font-normal">
                    <span>Прогресс выполнения целей</span>
                    <span>{completedCount} из {goals.length}</span>
                  </div>
                </div>

                {/* Checklist list */}
                <div className="space-y-2.5 pt-2">
                  {goals.map(goal => (
                    <label
                      key={goal.id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                        goal.completed 
                          ? 'bg-slate-50/50 border-slate-200 text-slate-400' 
                          : 'bg-indigo-50/10 border-indigo-100/70 text-slate-800 hover:border-indigo-200 hover:bg-indigo-50/20'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={goal.completed}
                        onChange={() => handleToggleGoal(goal.id)}
                        className="mt-0.5 w-4.5 h-4.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                      />
                      <span className={`text-sm font-medium leading-relaxed ${goal.completed ? 'line-through text-slate-400' : ''}`}>
                        {goal.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })() : (
            <p className="text-sm text-slate-500 font-medium bg-slate-50 p-4 rounded-xl border border-slate-200/60 italic">
              Лидер компетенции утвердил калибровку оценок, но список целей оставлен пустым.
            </p>
          )}
        </div>
      )}

      {/* Modal for Group Coverage */}
      {isGroupsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="groups-modal" onClick={() => setIsGroupsModalOpen(false)}>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-6 max-h-[85vh] overflow-y-auto relative animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={() => setIsGroupsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-extrabold text-lg text-slate-900">
                Соответствие по группам навыков
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Процент соответствия требованиям профиля {profile.title} по каждому направлению
              </p>
            </div>

            <div className="space-y-4">
              {categories.map(cat => {
                const cov = calculateCategoryCoverage(cat.id, skills, profile, activeScores);
                const radius = 32;
                const strokeWidth = 5;
                const circumference = 2 * Math.PI * radius;
                const strokeDashoffset = circumference - (cov / 100) * circumference;

                return (
                  <div key={cat.id} className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex items-center justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <span className="text-base font-bold text-slate-800 block mb-1">{cat.title}</span>
                      <p className="text-sm text-slate-500 leading-relaxed">{cat.description}</p>
                    </div>
                    
                    <div className="flex-shrink-0 relative flex items-center justify-center w-20 h-20">
                      <svg className="w-20 h-20 transform -rotate-90">
                        {/* Background channel */}
                        <circle
                          cx="40"
                          cy="40"
                          r={radius}
                          className="text-slate-200"
                          strokeWidth={strokeWidth}
                          stroke="currentColor"
                          fill="transparent"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="40"
                          cy="40"
                          r={radius}
                          className={`transition-all duration-500 ease-out ${
                            cov >= 90 ? 'text-emerald-500' :
                            cov >= 70 ? 'text-indigo-500' : 'text-amber-500'
                          }`}
                          strokeWidth={strokeWidth}
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                        />
                      </svg>
                      <span className="absolute text-sm font-bold text-slate-800">
                        {cov}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsGroupsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg cursor-pointer transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
