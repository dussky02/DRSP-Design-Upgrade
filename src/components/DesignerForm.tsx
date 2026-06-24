/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
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

  // Skills are filtered by profile requirements if the session is bound to a specific profile
  const activeSkills = useMemo(() => {
    const filtered = !session || session.profileId === 'profile-general'
      ? skills
      : skills.filter(s => profile && profile.requirements && profile.requirements.some(req => req.skillId === s.id));
    
    return [...filtered].sort((a, b) => {
      const catAIndex = categories.findIndex(c => c.id === a.categoryId);
      const catBIndex = categories.findIndex(c => c.id === b.categoryId);
      if (catAIndex !== catBIndex) return catAIndex - catBIndex;
      
      // If categories are same, maintain original order (assuming skills array is already ordered within category)
      return skills.indexOf(a) - skills.indexOf(b);
    });
  }, [session, profile, skills, categories]);

  if (activeSkills.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-12 p-6 bg-white border border-slate-200 rounded-xl shadow space-y-4 animate-fadeIn mt-8">
        <HelpCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800">Опросы временно недоступны</h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          В матрице компетенций пока нет созданных навыков или привязанных требований.
          Обратитесь к лидеру компетенции, чтобы наполнить матрицу профессиональных навыков.
        </p>
      </div>
    );
  }

  const currentSkill = activeSkills[currentSkillIndex];
  const currentCategory = currentSkill 
    ? categories.find(c => c.id === currentSkill.categoryId) 
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

  const executeSubmit = () => {
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
      {/* Start screen: user profile input */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Banner Removed */}

        <div className="p-8 space-y-8">
          {isNameStepActive ? (
            <>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-6">{session.title}</h1>
              {/* ФИО Input */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-500" />
                    Ваши имя и фамилия <span className="text-red-500">*</span>
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!designerName.trim()) {
                          setNameError('Пожалуйста, укажите ваши имя и фамилию для регистрации анкеты.');
                          return;
                        }
                        setIsNameStepActive(false);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
                  />
                  {nameError && <p className="text-red-600 text-sm font-bold">{nameError}</p>}
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
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 cursor-pointer select-none transition-all"
                >
                  <span>Начать</span>
                </button>
              </div>
            </>
          ) : (
            currentSkill && (
              <div id="survey-step-container" className="space-y-6">
                {/* Progress Bar replacing Category details and Step text */}
                <div className="space-y-2">
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm text-slate-400 font-normal">
                    <span>Заполнение анкеты</span>
                    <span>{currentSkillIndex + 1} из {activeSkills.length}</span>
                  </div>
                </div>

                {/* Target skill layout */}
                <div className="space-y-2">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">{currentSkill.title}</h1>
                  <p className="text-base text-slate-600 leading-relaxed">{currentSkill.description}</p>
                </div>

                {/* 5 behavioral marker options (0-4) */}
                <div className="space-y-3">
                  <label className="block text-sm font-normal text-slate-500">
                    Выберите, что лучше всего описывает ваш опыт
                  </label>

                  {errors && (
                    <p className="text-sm text-red-600 font-extrabold flex items-center gap-1.5 bg-red-50 border border-red-200 p-2.5 rounded-lg">
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
                              isSelected ? 'border-indigo-600' : 'border-slate-200'
                          }`}
                        >
                          <div className={`mt-0.5 w-5 h-5 rounded-full shrink-0 flex items-center justify-center font-bold text-sm ${
                            isSelected 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {lvlIndex}
                          </div>
                          <div className="space-y-0.5 flex-1 select-none">
                            <p className={`text-sm leading-relaxed font-medium transition-colors ${
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
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Назад</span>
                  </button>

                  {currentSkillIndex < activeSkills.length - 1 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 cursor-pointer select-none"
                    >
                      <span>Дальше</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={executeSubmit}
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-6 py-3 rounded-lg cursor-pointer transform hover:scale-[1.01] active:scale-[0.99] transition-all shadow-md shadow-emerald-900/10"
                    >
                      <span>Отправить результаты</span>
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
