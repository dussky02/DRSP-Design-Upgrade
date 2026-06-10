/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  CheckCircle, ArrowLeft, ArrowRight, Save, ShieldCheck, 
  HelpCircle, Sparkles, Send, User, ChevronRight
} from 'lucide-react';
import { Category, Skill, Profile, Session, SkillScores } from '../types';

interface DesignerFormProps {
  session: Session;
  profile: Profile;
  categories: Category[];
  skills: Skill[];
  onSubmit: (designerName: string, selfScores: SkillScores) => void;
}

export default function DesignerForm({
  session,
  profile,
  categories,
  skills,
  onSubmit
}: DesignerFormProps) {
  const [designerName, setDesignerName] = useState('');
  const [nameError, setNameError] = useState('');
  const [currentSkillIndex, setCurrentSkillIndex] = useState(0);
  const [scores, setScores] = useState<SkillScores>({});
  const [errors, setErrors] = useState<string>('');
  const [isNameStepActive, setIsNameStepActive] = useState(true);

  // Get active skills filtered by profile requirements
  const requiredSkillIds = new Set(profile.requirements.map(r => r.skillId));
  const activeSkills = session.profileId === 'profile-general' ? skills : skills.filter(s => requiredSkillIds.has(s.id));

  const currentSkill = activeSkills[currentSkillIndex];
  const currentCategory = currentSkill 
    ? categories.find(c => c.id === currentSkill.categoryId) 
    : null;

  const currentRequirement = currentSkill && session.profileId !== 'profile-general'
    ? profile.requirements.find(r => r.skillId === currentSkill.id)
    : null;

  const handleSelectLevel = (level: number) => {
    if (!currentSkill) return;
    setScores(prev => ({
      ...prev,
      [currentSkill.id]: level
    }));
    setErrors('');
  };

  const handleNext = () => {
    if (!currentSkill) return;
    
    // Check if score is selected
    if (scores[currentSkill.id] === undefined) {
      setErrors('Пожалуйста, выберите уровень поведенческого маркера для продолжения.');
      return;
    }

    if (currentSkillIndex < activeSkills.length - 1) {
      setCurrentSkillIndex(prev => prev + 1);
      setErrors('');
    }
  };

  const handleBack = () => {
    if (currentSkillIndex > 0) {
      setCurrentSkillIndex(prev => prev - 1);
      setErrors('');
    } else {
      setIsNameStepActive(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!designerName.trim()) {
      setNameError('Пожалуйста, укажите ваши имя и фамилию для регистрации анкеты.');
      setIsNameStepActive(true);
      return;
    }

    // Check if all active skills are scored
    const missingSkills: string[] = [];
    activeSkills.forEach(s => {
      if (scores[s.id] === undefined) {
        missingSkills.push(s.title);
      }
    });

    if (missingSkills.length > 0) {
      setErrors(`Остались незаполненными навыки: ${missingSkills.join(', ')}. Заполните все шаги!`);
      return;
    }

    // All clear - submit
    onSubmit(designerName, scores);
  };

  const progressPercent = Math.round(((currentSkillIndex + 1) / activeSkills.length) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-4 pb-12 animate-fadeIn">
      {/* Locked isolation notice */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-3 text-emerald-800 text-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <strong>Безопасная изолированная среда самооценки</strong>
          <p className="mt-1 text-emerald-700 font-medium leading-relaxed">
            Вы вошли по индивидуальной ссылке к сессии: «{session.title}». Ввод оценок конфиденциален. Ваши коллеги не могут увидеть ваши баллы.
          </p>
        </div>
      </div>

      {/* Start screen: user profile input */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="bg-indigo-600 text-white px-8 py-7">
          <h1 className="text-2xl font-black mt-3 tracking-tight">Анкета самооценки навыков</h1>
          <p className="text-slate-150 text-sm mt-1.5 leading-relaxed font-medium">
            Пожалуйста, честно оцените свои компетенции. {session.profileId === 'profile-general' ? 'Наиболее подходящий профиль должности будет определен автоматически по итогам прохождения анкеты.' : `Результаты лягут в основу вашей индивидуальной карты развития профиля ${profile.title}.`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {isNameStepActive ? (
            <>
              {/* ФИО Input */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-500" />
                    Ваши имя и фамилия (на русском языке) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Пример: Александр Ковалев"
                    value={designerName}
                    onChange={(e) => {
                      setDesignerName(e.target.value);
                      setNameError('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
                  />
                  {nameError && <p className="text-red-600 text-xs font-bold">{nameError}</p>}
                </div>

                <div className="text-[11px] text-slate-500 font-medium leading-relaxed bg-slate-50 border border-slate-200/50 p-4 rounded-xl">
                  На следующем шаге вам предстоит оценить свои профессиональные навыки. Оценка состоит из {activeSkills.length} вопросов с описанием поведенческих маркеров от уровня 0 до 4.
                </div>
              </div>

              {/* Next/Start assessment button */}
              <div className="flex justify-end items-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (!designerName.trim()) {
                      setNameError('Пожалуйста, укажите ваши имя и фамилию для регистрации анкеты.');
                      return;
                    }
                    setIsNameStepActive(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 cursor-pointer select-none transition-all"
                >
                  <span>Начать self-review</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            currentSkill && (
              <div id="survey-step-container" className="space-y-6">
                {/* Category & Skill header inside the step */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {currentCategory?.title || 'Оценка навыков'}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">{currentCategory?.description}</p>
                  </div>
                  <div className="text-xs text-slate-500 font-bold bg-slate-100 px-3 py-1 rounded-full text-right">
                    Шаг {currentSkillIndex + 1} из {activeSkills.length}
                  </div>
                </div>

                {/* Step indicator bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-650 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    <span>Матрица умений</span>
                    <span>{progressPercent}% заполнено</span>
                  </div>
                </div>

                {/* Target skill layout */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-2">
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">{currentSkill.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{currentSkill.description}</p>
                  {currentRequirement && currentRequirement.targetLevel > 0 && (
                    <div className="pt-1 select-none">
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded text-[11px] font-bold border border-amber-200/50">
                        🎯 Целевой уровень профиля: {currentRequirement.targetLevel} (Вес: {currentRequirement.weight})
                      </span>
                    </div>
                  )}
                </div>

                {/* 5 behavioral marker options (0-4) */}
                <div className="space-y-3">
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest">
                    Выберите поведенческий маркер, лучше всего описывающий ваш опыт:
                  </label>

                  {errors && (
                    <p className="text-xs text-red-600 font-extrabold flex items-center gap-1.5 bg-red-50 border border-red-200 p-2.5 rounded-lg">
                      <HelpCircle className="w-4 h-4 shrink-0" />
                      {errors}
                    </p>
                  )}

                  <div className="space-y-2.5">
                    {currentSkill.levels.map((description, lvlIndex) => {
                      const isSelected = scores[currentSkill.id] === lvlIndex;
                      return (
                        <button
                          key={lvlIndex}
                          type="button"
                          onClick={() => handleSelectLevel(lvlIndex)}
                          className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 hover:scale-[1.005] ${
                            isSelected
                              ? 'bg-indigo-50/50 border-indigo-600 ring-1 ring-indigo-500 shadow-md'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/30'
                          }`}
                        >
                          <div className={`mt-0.5 w-5 h-5 rounded-full shrink-0 flex items-center justify-center font-bold text-xs ${
                            isSelected 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {lvlIndex}
                          </div>
                          <div className="space-y-0.5 flex-1 select-none">
                            <p className={`text-xs leading-relaxed font-medium transition-colors ${
                              isSelected ? 'text-indigo-950 font-bold' : 'text-slate-600'
                            }`}>
                              {description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Stepper buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Назад</span>
                  </button>

                  {currentSkillIndex < activeSkills.length - 1 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 cursor-pointer select-none"
                    >
                      <span>Дальше</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-3 rounded-lg cursor-pointer transform hover:scale-[1.01] active:scale-[0.99] transition-all shadow-md shadow-emerald-900/10"
                    >
                      <Send className="w-4 h-4" />
                      <span>Отправить результаты</span>
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </form>
      </div>
    </div>
  );
}
