/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Settings, BookOpen, Layers, ClipboardList, CheckCircle2, 
  Trash2, Archive, Share2, Clipboard, Edit2, Check, AlertCircle, 
  HelpCircle, Sparkles, Send, Save, ArrowLeft, RefreshCw, X, ShieldAlert,
  ChevronDown, ChevronUp, ArrowUp, ArrowDown, MessageSquareCode, Eye, Upload, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, Legend, Tooltip 
} from 'recharts';
import { AppState, Category, Skill, Profile, Session, Evaluation, SkillScores, SkillComments } from '../types';
import DirectorReport from './DirectorReport';
import { determineMostSuitableProfile } from '../utils';

interface LeadDashboardProps {
  appState: AppState;
  onStateChange: (updatedState: AppState | ((prev: AppState) => AppState)) => void;
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

  // Sort profiles by career step progression
  const sortedProfiles = React.useMemo(() => {
    if (profiles.length <= 1) return profiles;
    const pointedTo = new Set(profiles.map(p => p.nextProfileId).filter(Boolean));
    const roots = profiles.filter(p => !pointedTo.has(p.id));
    const sequence: Profile[] = [];
    const visited = new Set<string>();

    const traverse = (p: Profile) => {
      if (visited.has(p.id)) return;
      visited.add(p.id);
      sequence.push(p);
      if (p.nextProfileId) {
        const next = profiles.find(x => x.id === p.nextProfileId);
        if (next) traverse(next);
      }
    };

    roots.forEach(traverse);
    profiles.forEach(p => {
      if (!visited.has(p.id)) {
        traverse(p);
      }
    });

    return sequence;
  }, [profiles]);

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
  const [confirmDeleteCat, setConfirmDeleteCat] = useState(false);

  // Editing Skill state
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillTitle, setSkillTitle] = useState('');
  const [skillDesc, setSkillDesc] = useState('');
  const [skillCatId, setSkillCatId] = useState('');
  const [confirmDeleteSkill, setConfirmDeleteSkill] = useState(false);
  const [skillWeight, setSkillWeight] = useState<number>(0.20);
  const [skillLevels, setSkillLevels] = useState<[string, string, string, string, string]>([
    'Уровень 0: ', 'Уровень 1: ', 'Уровень 2: ', 'Уровень 3: ', 'Уровень 4: '
  ]);

  // Editing Profile state
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [profTitle, setProfTitle] = useState('');
  const [profDesc, setProfDesc] = useState('');
  const [profNextId, setProfNextId] = useState('');
  const [profRequirements, setProfRequirements] = useState<{ skillId: string; targetLevel: number }[]>([]);

  // Creating session state
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [showCreateSessionForm, setShowCreateSessionForm] = useState(false);
  const [isSkillsDropdownOpen, setIsSkillsDropdownOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importDiff, setImportDiff] = useState<{
      profile: { new: string[], updated: string[] },
      skill: { new: string[], updated: string[] },
      category: { new: string[], updated: string[] }
  }>({
      profile: { new: [], updated: [] },
      skill: { new: [], updated: [] },
      category: { new: [], updated: [] }
  });
  const [pendingImportProfilesRows, setPendingImportProfilesRows] = useState<any[]>([]);
  const [pendingImportSkillsRows, setPendingImportSkillsRows] = useState<any[]>([]);
  const [pendingImportCategoriesRows, setPendingImportCategoriesRows] = useState<any[]>([]);



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
    setShowCreateSessionForm(false);
  };

  // Export data to XLSX
  const handleExportXLSX = () => {
    // Competencies sheet (Categories)
    const categoryData = categories.map(cat => {
        return {
            'ID': cat.id,
            'Title': cat.title,
            'Description': cat.description
        };
    });

    // Competencies sheet (Skills)
    const skillData = skills.map(skill => {
        const cat = categories.find(c => c.id === skill.categoryId);
        return {
            'ID': skill.id,
            'Category': cat?.title || '',
            'Skill Title': skill.title,
            'Description': skill.description,
            'Weight': skill.weight,
            'Level 0': skill.levels[0],
            'Level 1': skill.levels[1],
            'Level 2': skill.levels[2],
            'Level 3': skill.levels[3],
            'Level 4': skill.levels[4],
        };
    });
    
    // Profiles sheet
    const profileData = profiles.map(profile => {
        return {
            'ID': profile.id,
            'Title': profile.title,
            'Description': profile.description,
            'Next Profile ID': profile.nextProfileId || '',
            'Requirements': JSON.stringify(profile.requirements.map(req => ({
                skillId: req.skillId,
                targetLevel: req.targetLevel
            })))
        };
    });

    const worksheetCategories = XLSX.utils.json_to_sheet(categoryData);
    const worksheetSkills = XLSX.utils.json_to_sheet(skillData);
    const worksheetProfiles = XLSX.utils.json_to_sheet(profileData);
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheetCategories, 'Categories');
    XLSX.utils.book_append_sheet(workbook, worksheetSkills, 'Competencies');
    XLSX.utils.book_append_sheet(workbook, worksheetProfiles, 'Profiles');
    
    XLSX.writeFile(workbook, 'data.xlsx');
  };

  // Import data from XLSX (Profile import logic refactored for confirmation modal)                
  const handleImportXLSX = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Import Categories
        if (workbook.Sheets['Categories']) {
            const sheet = workbook.Sheets['Categories'];
            const rows = XLSX.utils.sheet_to_json(sheet) as any[];
            
            const newCategories: string[] = [];
            const updatedCategories: string[] = [];
            rows.forEach((row: any) => {
                const title = row['Title'] || '';
                if (categories.find(c => c.title === title)) {
                    updatedCategories.push(title);
                } else {
                    newCategories.push(title);
                }
            });
            setImportDiff(prev => ({ ...prev, category: { new: newCategories, updated: updatedCategories } }));
            setPendingImportCategoriesRows(rows);
            setIsImportModalOpen(true);
        }

        // Import Skills
        if (workbook.Sheets['Competencies']) {
            const sheet = workbook.Sheets['Competencies'];
            const rows = XLSX.utils.sheet_to_json(sheet) as any[];
            
            const newSkills: string[] = [];
            const updatedSkills: string[] = [];
            rows.forEach((row: any) => {
                const title = row['Skill Title'] || '';
                if (skills.find(s => s.title === title)) {
                    updatedSkills.push(title);
                } else {
                    newSkills.push(title);
                }
            });
            setImportDiff(prev => ({ ...prev, skill: { new: newSkills, updated: updatedSkills } }));
            setPendingImportSkillsRows(rows);
            setIsImportModalOpen(true);
        }
        
        // Import Profiles
        if (workbook.Sheets['Profiles']) {
            const sheet = workbook.Sheets['Profiles'];
            const rows = XLSX.utils.sheet_to_json(sheet) as any[];
            
            // Calculate Diff
            const newProfiles: string[] = [];
            const updatedProfiles: string[] = [];
            rows.forEach((row: any) => {
                const title = row['Title'] || '';
                if (profiles.find(p => p.title === title)) {
                    updatedProfiles.push(title);
                } else {
                    newProfiles.push(title);
                }
            });
            setImportDiff(prev => ({ ...prev, profile: { new: newProfiles, updated: updatedProfiles } }));
            setPendingImportProfilesRows(rows); // Save for later
            setIsImportModalOpen(true);
        }
        
        event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExportEvaluationsXLSX = () => {
    const evaluationMeta = evaluations.map(e => {
      const sess = sessions.find(s => s.id === e.sessionId);
      return {
        'ID': e.id,
        'Session ID': e.sessionId,
        'Session Title': sess ? sess.title : '',
        'Designer Name': e.designerName,
        'Status': e.status,
        'Date Submitted': e.dateSubmitted || '',
        'Date Calibrated': e.dateCalibrated || '',
        'Action Plan': e.actionPlan || ''
      };
    });

    const evaluationScores: any[] = [];
    evaluations.forEach(e => {
      skills.forEach(s => {
        const selfScore = e.selfScores[s.id] !== undefined ? e.selfScores[s.id] : '';
        const calibratedScore = e.calibratedScores[s.id] !== undefined ? e.calibratedScores[s.id] : '';
        const justification = e.calibrationJustifications[s.id] || '';
        
        evaluationScores.push({
          'Evaluation ID': e.id,
          'Designer Name': e.designerName,
          'Skill ID': s.id,
          'Skill Title': s.title,
          'Self Score': selfScore,
          'Calibrated Score': calibratedScore,
          'Justification': justification
        });
      });
    });

    const worksheetMeta = XLSX.utils.json_to_sheet(evaluationMeta);
    const worksheetScores = XLSX.utils.json_to_sheet(evaluationScores);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheetMeta, 'Evaluations');
    XLSX.utils.book_append_sheet(workbook, worksheetScores, 'Scores');

    XLSX.writeFile(workbook, 'evaluations_data.xlsx');
  };

  const handleImportEvaluationsXLSX = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (!workbook.Sheets['Evaluations']) {
          console.error('Не найден лист "Evaluations" во временном файле импорта.');
          return;
        }

        const metaSheet = workbook.Sheets['Evaluations'];
        const metaRows = XLSX.utils.sheet_to_json(metaSheet) as any[];

        const scoresSheet = workbook.Sheets['Scores'];
        const scoreRows = scoresSheet ? (XLSX.utils.sheet_to_json(scoresSheet) as any[]) : [];

        const scoresByEvalId: {
          [evalId: string]: {
            selfScores: { [skillId: string]: number };
            calibratedScores: { [skillId: string]: number };
            justifications: { [skillId: string]: string };
          };
        } = {};

        scoreRows.forEach((row: any) => {
          const evalId = row['Evaluation ID'] || row['evaluation_id'] || '';
          const skillId = row['Skill ID'] || row['skill_id'] || '';
          if (!evalId || !skillId) return;

          if (!scoresByEvalId[evalId]) {
            scoresByEvalId[evalId] = {
              selfScores: {},
              calibratedScores: {},
              justifications: {}
            };
          }

          const selfScoreVal = row['Self Score'];
          const calScoreVal = row['Calibrated Score'];
          const justificationVal = row['Justification'] || '';

          if (selfScoreVal !== undefined && selfScoreVal !== '') {
            scoresByEvalId[evalId].selfScores[skillId] = parseInt(selfScoreVal, 10);
          }
          if (calScoreVal !== undefined && calScoreVal !== '') {
            scoresByEvalId[evalId].calibratedScores[skillId] = parseInt(calScoreVal, 10);
          }
          if (justificationVal) {
            scoresByEvalId[evalId].justifications[skillId] = String(justificationVal);
          }
        });

        const importedEvaluations: Evaluation[] = metaRows.map((row: any) => {
          const id = row['ID'] || row['id'] || `eval-${Date.now()}-${Math.random()}`;
          const sessionId = row['Session ID'] || row['session_id'] || (sessions[0]?.id || 'session-general');
          const designerName = row['Designer Name'] || row['designer_name'] || 'Без имени';
          const status = row['Status'] || row['status'] || 'submitted';
          const dateSubmitted = row['Date Submitted'] || row['date_submitted'] || new Date().toISOString().split('T')[0];
          const dateCalibrated = row['Date Calibrated'] || row['date_calibrated'] || undefined;
          const actionPlan = row['Action Plan'] || row['action_plan'] || '';

          const scoresObj = scoresByEvalId[id] || { selfScores: {}, calibratedScores: {}, justifications: {} };

          return {
            id,
            sessionId,
            designerName,
            status: status === 'calibrated' ? 'calibrated' : 'submitted',
            dateSubmitted,
            dateCalibrated,
            actionPlan,
            selfScores: scoresObj.selfScores,
            calibratedScores: scoresObj.calibratedScores,
            calibrationJustifications: scoresObj.justifications
          };
        });

        let mergedEvaluations = [...evaluations];
        importedEvaluations.forEach(imp => {
          const index = mergedEvaluations.findIndex(e => e.id === imp.id);
          if (index > -1) {
            mergedEvaluations[index] = imp;
          } else {
            mergedEvaluations.push(imp);
          }
        });

        onStateChange({
          ...appState,
          evaluations: mergedEvaluations
        });
      } catch (err) {
        console.error('Error importing evaluations:', err);
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const applyImportChanges = () => {
    // 1. Apply Categories
    let updatedCategories = [...categories];
    pendingImportCategoriesRows.forEach((row: any) => {
        const title = row['Title'] || '';
        const index = updatedCategories.findIndex(c => c.title === title);
        
        const catData = {
            title: title,
            description: row['Description'] || ''
        };
        
        if (index > -1) {
            updatedCategories[index] = { ...updatedCategories[index], ...catData };
        } else {
            updatedCategories.push({
                id: row['ID'] || `cat-${Date.now()}-${Math.random()}`,
                ...catData
            });
        }
    });

    // 2. Apply Skills (Process Skills before Profiles, so Profile Requirements have a valid up-to-date Skill list)
    let updatedSkills = [...skills];
    pendingImportSkillsRows.forEach((row: any) => {
        const title = row['Skill Title'] || '';
        const idVal = row['ID'] || row['id'] || '';
        let index = -1;
        if (idVal) {
            index = updatedSkills.findIndex(s => s.id === idVal);
        }
        if (index === -1) {
            index = updatedSkills.findIndex(s => s.title === title);
        }
        const catTitle = row['Category'] || '';
        let cat = updatedCategories.find(c => c.title === catTitle) || updatedCategories[0]; // Look in updatedCategories
        
        const valWeight = row['Weight'] !== undefined ? row['Weight'] : row['weight'];
        const skillData = {
            categoryId: cat?.id || '',
            title: title,
            description: row['Description'] || '',
            weight: valWeight !== undefined ? (parseFloat(valWeight) || 0.20) : 0.20,
            levels: [
                row['Level 0'] || '',
                row['Level 1'] || '',
                row['Level 2'] || '',
                row['Level 3'] || '',
                row['Level 4'] || ''
            ] as [string, string, string, string, string]
        };
        
        if (index > -1) {
            updatedSkills[index] = { ...updatedSkills[index], ...skillData };
        } else {
            updatedSkills.push({
                id: idVal || `skill-${Date.now()}-${Math.random()}`,
                ...skillData
            });
        }
    });

    // 3. Apply Profiles
    let updatedProfiles = [...profiles];
    pendingImportProfilesRows.forEach((row: any) => {
        const title = row['Title'] || '';
        const idVal = row['ID'] || row['id'] || '';
        let index = -1;
        if (idVal) {
            index = updatedProfiles.findIndex(p => p.id === idVal);
        }
        if (index === -1) {
            index = updatedProfiles.findIndex(p => p.title === title);
        }
        
        let checkedRequirements: any[] = [];
        const reqKey = Object.keys(row).find(k => {
            const kl = k.toLowerCase();
            return kl === 'requirements' || kl === 'requirements json' || kl === 'requirements list' || kl === 'требования';
        });
        const rawReqsStr = reqKey ? row[reqKey] : '';
        if (rawReqsStr) {
            try {
                let parsedJson: any = null;
                if (typeof rawReqsStr === 'string') {
                    let cleaned = rawReqsStr.trim();
                    
                    // Remove enclosing quotes if Excel added them (often happens on CSV/XLSX text fields)
                    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
                        cleaned = cleaned.substring(1, cleaned.length - 1).trim();
                    }
                    
                    // Replace escaped double quotes \" with "
                    cleaned = cleaned.replace(/\\"/g, '"');
                    // Replace double-double quotes "" with "
                    cleaned = cleaned.replace(/""/g, '"');
                    
                    // Handle single quotes if no double quotes are present
                    if (cleaned.includes("'") && !cleaned.includes('"')) {
                        cleaned = cleaned.replace(/'/g, '"');
                    }
                    
                    try {
                        parsedJson = JSON.parse(cleaned);
                    } catch (err) {
                        // Fallback to evaluating as JS if standard JSON parse fails
                        try {
                            parsedJson = (new Function(`return ${cleaned}`))();
                        } catch (err2) {
                            console.error('Failed to parse clean rawReqsStr:', cleaned, err2);
                        }
                    }
                } else {
                    parsedJson = rawReqsStr;
                }
                
                if (Array.isArray(parsedJson)) {
                    checkedRequirements = parsedJson.map((req: any) => {
                        if (!req || typeof req !== 'object') return null;
                        
                        const sIdKey = Object.keys(req).find(k => {
                            const kl = k.toLowerCase();
                            return kl === 'skillid' || kl === 'skill_id' || kl === 'id' || kl === 'навык' || kl === 'id навыка';
                        });
                        const sId = sIdKey ? req[sIdKey] : '';
                        
                        const tLevelKey = Object.keys(req).find(k => {
                            const kl = k.toLowerCase();
                            return kl === 'targetlevel' || kl === 'target_level' || kl === 'level' || kl === 'уровень' || kl === 'целевой уровень';
                        });
                        const tLevelRaw = tLevelKey ? req[tLevelKey] : undefined;
                        let tLevel = 0;
                        if (tLevelRaw !== undefined && tLevelRaw !== null) {
                            tLevel = typeof tLevelRaw === 'number' ? tLevelRaw : (parseInt(tLevelRaw, 10) || 0);
                        }
                        return {
                            skillId: sId || '',
                            targetLevel: tLevel
                        };
                    }).filter(Boolean);
                }
            } catch (err) {
                console.error('Error parsing requirements on import', err);
            }
        }

        const profileData = {
            title: title,
            description: row['Description'] || '',
            nextProfileId: row['Next Profile ID'] || undefined,
            requirements: checkedRequirements
        };
        
        if (index > -1) {
            updatedProfiles[index] = { ...updatedProfiles[index], ...profileData };
        } else {
            updatedProfiles.push({
                id: idVal || `profile-${Date.now()}-${Math.random()}`,
                ...profileData
            });
        }
    });
    
    // Reset Diffs
    setImportDiff({ profile: { new: [], updated: [] }, skill: { new: [], updated: [] }, category: { new: [], updated: [] } });
    setPendingImportProfilesRows([]);
    setPendingImportSkillsRows([]);
    setPendingImportCategoriesRows([]);

    onStateChange({
        ...appState,
        profiles: updatedProfiles,
        skills: updatedSkills,
        categories: updatedCategories
    });
    setIsImportModalOpen(false);
  };

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
    setConfirmDeleteCat(false);
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
    onStateChange(prev => {
      const remainingSkills = prev.skills.filter(s => s.categoryId !== id);
      const remainingSkillIds = new Set(remainingSkills.map(s => s.id));
      return {
        ...prev,
        categories: prev.categories.filter(c => c.id !== id),
        skills: remainingSkills,
        profiles: prev.profiles.map(p => ({
          ...p,
          requirements: p.requirements.filter(r => remainingSkillIds.has(r.skillId))
        }))
      };
    });
    setEditingCategory(null);
    setConfirmDeleteCat(false);
  };

  // Skills Constructor updates
  const startEditSkill = (sk: Skill | null, categoryId?: string) => {
    setConfirmDeleteSkill(false);
    if (sk) {
      setEditingSkill(sk);
      setSkillTitle(sk.title);
      setSkillDesc(sk.description);
      setSkillCatId(sk.categoryId);
      setSkillLevels([...sk.levels]);
      setSkillWeight(sk.weight ?? 0.20);
    } else {
      setEditingSkill({
        id: '',
        categoryId: categoryId || categories[0]?.id || '',
        title: '',
        description: '',
        levels: [
          'Навык не применяется / отсутствует.',
          'Выполняет базовые задачи по инструкции под присмотром',
          'Самостоятельно решает стандартные практические задачи',
          'Решает нестандартные задачи, консультирует и обучает других',
          'Трансформирует методы, задает отраслевые стандарты'
        ],
        weight: 0.20
      });
      setSkillTitle('');
      setSkillDesc('');
      setSkillCatId(categoryId || categories[0]?.id || '');
      setSkillLevels([
        'Навык не применяется / отсутствует.',
        'Выполняет базовые задачи по инструкции под присмотром',
        'Самостоятельно решает стандартные практические задачи',
        'Решает нестандартные задачи, консультирует и обучает других',
        'Трансформирует методы, задает отраслевые стандарты'
      ]);
      setSkillWeight(0.20);
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
        levels: skillLevels,
        weight: skillWeight
      } : s);
    } else {
      const newSkill: Skill = {
        id: `skill-${Date.now()}`,
        categoryId: skillCatId,
        title: skillTitle,
        description: skillDesc,
        levels: skillLevels,
        weight: skillWeight
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
    onStateChange(prev => {
      const remainingSkills = prev.skills.filter(s => s.id !== id);
      const remainingSkillIds = new Set(remainingSkills.map(s => s.id));
      return {
        ...prev,
        skills: remainingSkills,
        profiles: prev.profiles.map(p => ({
          ...p,
          requirements: p.requirements.filter(r => remainingSkillIds.has(r.skillId))
        }))
      };
    });
    setEditingSkill(null);
    setConfirmDeleteSkill(false);
  };

  const moveCategory = (id: string, direction: 'up' | 'down') => {
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categories.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newCategories = [...categories];
    const temp = newCategories[index];
    newCategories[index] = newCategories[targetIndex];
    newCategories[targetIndex] = temp;

    onStateChange({
      ...appState,
      categories: newCategories
    });
  };

  const moveSkill = (skillId: string, direction: 'up' | 'down') => {
    const skill = skills.find(s => s.id === skillId);
    if (!skill) return;
    const catId = skill.categoryId;

    const catSkills = skills.filter(s => s.categoryId === catId);
    const localIndex = catSkills.findIndex(s => s.id === skillId);
    if (localIndex === -1) return;
    if (direction === 'up' && localIndex === 0) return;
    if (direction === 'down' && localIndex === catSkills.length - 1) return;

    const targetIndex = direction === 'up' ? localIndex - 1 : localIndex + 1;
    const updatedCatSkills = [...catSkills];
    const temp = updatedCatSkills[localIndex];
    updatedCatSkills[localIndex] = updatedCatSkills[targetIndex];
    updatedCatSkills[targetIndex] = temp;

    let catSkillInsertedCount = 0;
    const newGlobalSkills = skills.map(s => {
      if (s.categoryId === catId) {
        const replacement = updatedCatSkills[catSkillInsertedCount];
        catSkillInsertedCount++;
        return replacement;
      }
      return s;
    });

    onStateChange({
      ...appState,
      skills: newGlobalSkills
    });
  };

  const distributeWeightsEvenly = (catId: string) => {
    const catSkills = skills.filter(s => s.categoryId === catId);
    if (catSkills.length === 0) return;
    
    const N = catSkills.length;
    const baseWeight = Math.floor((1.0 / N) * 100) / 100;
    const remainder = Math.round((1.0 - (baseWeight * N)) * 100) / 100;
    
    const updatedSkills = skills.map(s => {
      if (s.categoryId === catId) {
        const subIndex = catSkills.findIndex(cs => cs.id === s.id);
        const weight = subIndex === 0 ? (baseWeight + remainder) : baseWeight;
        return { ...s, weight: Math.round(weight * 100) / 100 };
      }
      return s;
    });

    onStateChange({
      ...appState,
      skills: updatedSkills
    });
  };

  const scaleWeightsProportionally = (catId: string) => {
    const catSkills = skills.filter(s => s.categoryId === catId);
    if (catSkills.length === 0) return;

    const sum = catSkills.reduce((acc, s) => acc + (s.weight ?? 0), 0);
    if (sum === 0) {
      distributeWeightsEvenly(catId);
      return;
    }

    let scaledSkills = catSkills.map(s => ({
      ...s,
      weight: Math.round(((s.weight ?? 0) / sum) * 100) / 100
    }));

    const newSum = scaledSkills.reduce((acc, s) => acc + s.weight, 0);
    const diff = Math.round((1.0 - newSum) * 100) / 100;
    
    if (diff !== 0 && scaledSkills.length > 0) {
      let maxIdx = 0;
      let maxVal = -1;
      scaledSkills.forEach((s, idx) => {
        if (s.weight > maxVal) {
          maxVal = s.weight;
          maxIdx = idx;
        }
      });
      scaledSkills[maxIdx].weight = Math.round((scaledSkills[maxIdx].weight + diff) * 100) / 100;
    }

    const updatedSkills = skills.map(s => {
      if (s.categoryId === catId) {
        const matching = scaledSkills.find(cs => cs.id === s.id);
        return matching ? matching : s;
      }
      return s;
    });

    onStateChange({
      ...appState,
      skills: updatedSkills
    });
  };

  const updateSkillWeightDirectly = (skillId: string, newWeight: number) => {
    const updatedSkills = skills.map(s => {
      if (s.id === skillId) {
        return { ...s, weight: Math.max(0, Math.min(1.0, Math.round(newWeight * 100) / 100)) };
      }
      return s;
    });

    onStateChange({
      ...appState,
      skills: updatedSkills
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
      // Setup blank requirements (all skills with target level 1)
      const initialReqs = skills.map(s => ({
        skillId: s.id,
        targetLevel: 1
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

  const handleRequirementChange = (skillId: string, field: 'targetLevel', value: number) => {
    setProfRequirements(prev => {
      // Check if skillId already exists in requirements
      const exists = prev.some(r => r.skillId === skillId);
      if (!exists) {
        return [...prev, { skillId, targetLevel: value }];
      }
      return prev.map(r => r.skillId === skillId ? {
        ...r,
        targetLevel: value
      } : r);
    });
  };

  const validateAndSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profTitle.trim()) return;

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
      
      {/* Import Confirmation Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col max-h-[85vh]">
            <h3 className="text-lg font-extrabold text-slate-900 mb-4">Подтвердите импорт профилей</h3>
            <div className="text-sm text-slate-600 space-y-4 overflow-y-auto flex-1 pr-1 pb-4">
              <p>Будут внесены следующие изменения:</p>
              
              {(importDiff.profile.new.length > 0 || importDiff.profile.updated.length > 0) && (
                <div className="space-y-2">
                    <p className="font-bold text-slate-900 border-b pb-1">Профили</p>
                    {importDiff.profile.new.length > 0 && (
                        <div className="bg-emerald-50 p-3 rounded-lg">
                        <p className="font-bold text-emerald-800 text-xs">Добавится ({importDiff.profile.new.length}):</p>
                        <ul className="text-[11px] list-disc list-inside mt-1">
                            {importDiff.profile.new.map((n, i) => <li key={i}>{n}</li>)}
                        </ul>
                        </div>
                    )}
                    {importDiff.profile.updated.length > 0 && (
                        <div className="bg-amber-50 p-3 rounded-lg">
                        <p className="font-bold text-amber-800 text-xs">Обновится ({importDiff.profile.updated.length}):</p>
                        <ul className="text-[11px] list-disc list-inside mt-1">
                            {importDiff.profile.updated.map((u, i) => <li key={i}>{u}</li>)}
                        </ul>
                        </div>
                    )}
                </div>
              )}

              {(importDiff.skill.new.length > 0 || importDiff.skill.updated.length > 0) && (
                <div className="space-y-2">
                    <p className="font-bold text-slate-900 border-b pb-1">Навыки</p>
                    {importDiff.skill.new.length > 0 && (
                        <div className="bg-emerald-50 p-3 rounded-lg">
                        <p className="font-bold text-emerald-800 text-xs">Добавится ({importDiff.skill.new.length}):</p>
                        <ul className="text-[11px] list-disc list-inside mt-1">
                            {importDiff.skill.new.map((n, i) => <li key={i}>{n}</li>)}
                        </ul>
                        </div>
                    )}
                    {importDiff.skill.updated.length > 0 && (
                        <div className="bg-amber-50 p-3 rounded-lg">
                        <p className="font-bold text-amber-800 text-xs">Обновится ({importDiff.skill.updated.length}):</p>
                        <ul className="text-[11px] list-disc list-inside mt-1">
                            {importDiff.skill.updated.map((u, i) => <li key={i}>{u}</li>)}
                        </ul>
                        </div>
                    )}
                </div>
              )}

              {(importDiff.category.new.length > 0 || importDiff.category.updated.length > 0) && (
                <div className="space-y-2">
                    <p className="font-bold text-slate-900 border-b pb-1">Категории</p>
                    {importDiff.category.new.length > 0 && (
                        <div className="bg-emerald-50 p-3 rounded-lg">
                        <p className="font-bold text-emerald-800 text-xs">Добавится ({importDiff.category.new.length}):</p>
                        <ul className="text-[11px] list-disc list-inside mt-1">
                            {importDiff.category.new.map((n, i) => <li key={i}>{n}</li>)}
                        </ul>
                        </div>
                    )}
                    {importDiff.category.updated.length > 0 && (
                        <div className="bg-amber-50 p-3 rounded-lg">
                        <p className="font-bold text-amber-800 text-xs">Обновится ({importDiff.category.updated.length}):</p>
                        <ul className="text-[11px] list-disc list-inside mt-1">
                            {importDiff.category.updated.map((u, i) => <li key={i}>{u}</li>)}
                        </ul>
                        </div>
                    )}
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800">Отмена</button>
              <button onClick={applyImportChanges} className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Принять изменения</button>
            </div>
          </div>
        </div>
      )}

      {/* Main interactive sub-tabs selector */}
      <div className="hidden flex border-b border-slate-200 overflow-x-auto scrollbar-none gap-2 select-none">
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-0">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Анкеты
              </h1>
              <p className="text-slate-500 mt-2 text-sm max-w-2xl">
                Просмотр и калибровка заполненных анкет сотрудников. Сравнивайте оценки самопроверки с профессиональными ожиданиями и утверждайте карьерные действия.
              </p>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={handleExportEvaluationsXLSX}
                    className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                    <Download className="w-4 h-4" />
                    Экспорт
                </button>
                <label className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Импорт
                    <input type="file" accept=".xlsx" onChange={handleImportEvaluationsXLSX} className="hidden" />
                </label>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
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
                            <span className="text-sm bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold px-2 py-0.5 rounded-full">
                              ✓ Утверждена
                            </span>
                          ) : (
                            <span className="text-sm bg-amber-50 text-amber-800 border border-amber-100 font-bold px-2 py-0.5 rounded-full">
                              ⌛ Нужна калибровка
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">
                          Сессия: <span className="font-semibold">{sess?.title}</span> • Профиль: <span className="font-bold">{prof?.title}</span>
                        </p>
                        <span className="text-sm text-slate-400 block">Отправлено сотрудником: {e.dateSubmitted}</span>
                      </div>

                      <div className="flex gap-2.5 shrink-0 items-center">
                        {e.status === 'calibrated' ? (
                          <button
                            onClick={() => startCalibration(e)}
                            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 p-2 rounded-lg cursor-pointer flex items-center justify-center transition-all shadow-sm"
                            title="Редактировать калибровку"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => startCalibration(e)}
                            className="bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
                            title="Откалибровать баллы"
                          >
                            <MessageSquareCode className="w-3.5 h-3.5" />
                            <span>Откалибровать баллы</span>
                          </button>
                        )}

                        {e.status === 'calibrated' && (
                          <a
                            href={`?link=designer-profile&designerId=${e.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:bg-slate-100 bg-white border border-slate-200 p-2 text-slate-700 rounded-lg flex items-center justify-center transition-all no-underline shadow-sm"
                            title="Просмотр ЛК"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
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
                weight: skill.weight ?? null,
                isPartofRequired: !!req
              };
            })
          : prof.requirements.map(req => {
              const skill = skills.find(s => s.id === req.skillId);
              return {
                skill,
                targetLevel: req.targetLevel,
                weight: skill ? (skill.weight ?? null) : null,
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
              <div className="pb-4">
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
                            🎯 Требуемый уровень профиля {prof.title}: {targetLevel} (Вес навыка: {(skill.weight ?? 0.20).toFixed(2)})
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
                          <span className="text-sm text-slate-400 block font-semibold tracking-wider mb-2">Самооценка дизайнера: {currentSelfValue} балла</span>
                          <p className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed font-medium">
                            {skill.levels[currentSelfValue] || 'Описание отсутствует'}
                          </p>
                        </div>

                        {/* RIGHT COLUMN: Calibration Controls */}
                        <div className="space-y-3">
                          <span className="text-sm text-slate-400 block font-semibold tracking-wider">Калибровка лидера компетенции:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {[0, 1, 2, 3, 4].map(lvl => {
                              const isChecked = currentCalibratedValue === lvl;
                              return (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => handleCalibrationScoreChange(skill.id, lvl)}
                                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border transition-all cursor-pointer ${
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
                          <p className="text-sm text-slate-400 italic font-medium lines-2-capped">
                            Выбран: {skill.levels[currentCalibratedValue]}
                          </p>

                          {/* Mandatory Justification (Justification text input Scenario 4.3) */}
                          {isModified && (
                            <div className="space-y-1.5 pt-2 animate-fadeIn">
                              <label className="block text-sm text-amber-800 font-extrabold tracking-wide">
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
                                className="w-full text-sm font-medium p-2.5 bg-amber-50/40 focus:bg-white text-slate-800 rounded-lg border border-amber-200/80 outline-none focus:ring-2 focus:ring-indigo-500 h-20"
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
                <h4 className="font-extrabold text-slate-900 text-sm tracking-wider">
                  План действий (рекомендуемые книги, курсы, цели)
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-0">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Сессии
              </h1>
              <p className="text-slate-500 mt-2 text-sm max-w-2xl">
                Запуск новых сессий оценки. Анкеты будут обрабатываться индивидуально по итогам заполнения.
              </p>
            </div>
            {!showCreateSessionForm && (
              <button
                onClick={() => setShowCreateSessionForm(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Create new Session Form */}
          {showCreateSessionForm && (
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

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowCreateSessionForm(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Создать</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List of active/archive sessions (Scenario 2) */}
          <div className={`${showCreateSessionForm ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden`}>
            <div className="divide-y divide-slate-150">
              {sessions.length === 0 ? (
                <p className="text-sm text-slate-400 italic p-6 text-center">Созданных сессий нет.</p>
              ) : (
                sessions.map(sess => {
                  const mappedProfile = profiles.find(p => p.id === sess.profileId);
                  const isCopied = copiedSessionId === sess.id;

                  return (
                    <div key={sess.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 text-sm font-extrabold leading-normal">{sess.title}</strong>
                          {sess.status === 'active' ? (
                            <span className="text-sm bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold px-1.5 py-0.5 rounded">
                              Активна
                            </span>
                          ) : (
                            <span className="text-sm bg-slate-100 text-slate-500 border border-slate-200 font-bold px-1.5 py-0.5 rounded">
                              В архиве
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 font-semibold mb-1">
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

                        <a
                          href={`?link=designer&sessionId=${sess.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white hover:bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                          title="Открыть анкету"
                        >
                          <Eye className="w-4 h-4" />
                        </a>

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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-0">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Профили
              </h1>
              <p className="text-slate-500 mt-2 text-sm max-w-2xl">
                Добавляйте профили должностей сотрудников и настраивайте уровни владения навыками
              </p>
            </div>
            <button
              onClick={() => startEditProfile(null)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить</span>
            </button>
          </div>

          {/* Radar Chart Comparison */}
          {sortedProfiles.length > 0 && categories.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900">Сравнение профилей</h3>
              </div>
              <div className="h-[400px] w-full" key={activeTab}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={categories.map(cat => {
                    const row: any = { subject: cat.title };
                    sortedProfiles.forEach(p => {
                      const catSkills = skills.filter(s => s.categoryId === cat.id);
                      const catReqs = p.requirements.filter(r => catSkills.some(s => s.id === r.skillId));
                      if (catReqs.length > 0) {
                        let weightedSum = 0;
                        let weightTotal = 0;
                        catReqs.forEach(r => {
                          const skill = catSkills.find(s => s.id === r.skillId);
                          const w = skill && skill.weight !== undefined ? skill.weight : 0.20;
                          weightedSum += r.targetLevel * w;
                          weightTotal += w;
                        });
                        const avg = weightTotal > 0 ? (weightedSum / weightTotal) : 0;
                        row[p.id] = Math.round(avg * 10) / 10;
                      } else {
                        row[p.id] = 0;
                      }
                    });
                    return row;
                  })}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 4]} 
                      tick={{ fill: '#94a3b8', fontSize: 8 }}
                    />
                    {sortedProfiles.slice(0, 6).map((p, idx) => {
                      const colors = [
                        '#4f46e5', // Indigo
                        '#10b981', // Emerald
                        '#f59e0b', // Amber
                        '#ef4444', // Red
                        '#8b5cf6', // Violet
                        '#06b6d4'  // Cyan
                      ];
                      const color = colors[idx % colors.length];
                      return (
                        <Radar
                          key={p.id}
                          name={p.title}
                          dataKey={p.id}
                          stroke={color}
                          fill={color}
                          fillOpacity={0.1}
                          strokeWidth={2}
                        />
                      );
                    })}
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        fontSize: '11px',
                        fontWeight: '700'
                      }} 
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center"
                      wrapperStyle={{ fontSize: '10px', fontWeight: '700', paddingTop: '20px' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedProfiles.map(p => {
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

                  <div className="pt-2 border-t border-slate-100 flex justify-end items-center gap-1.5">
                    <button
                      onClick={() => startEditProfile(p)}
                      className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs p-1.5 rounded-lg border border-slate-200 cursor-pointer flex items-center justify-center"
                      title="Редактировать"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteProfile(p.id)}
                      className="bg-white hover:bg-red-50 text-slate-400 hover:text-red-700 p-1.5 border border-slate-200 rounded-lg cursor-pointer flex items-center justify-center"
                      title="Удалить"
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
                className="w-full text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-lg min-h-[70px] outline-none focus:bg-white"
              />
            </div>

            {/* MATRIX OF TARGET LEVELS */}
            <div className="space-y-3">
              <span className="text-sm font-bold tracking-wide text-slate-500 block">Матрица навыков: целевые уровни:</span>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                {categories.length === 0 ? (
                  <p className="text-sm text-slate-400 p-5 italic text-center bg-white">Для настройки требований профиля необходимо сначала создать навык и категорию в разделе «Навыки».</p>
                ) : (
                  categories.map(cat => {
                    const catSkills = skills.filter(s => s.categoryId === cat.id);
                    if (catSkills.length === 0) return null;

                    return (
                      <div key={cat.id} className="p-4 space-y-3 bg-slate-50/30">
                        <span className="text-sm text-indigo-900 font-extrabold tracking-wider block bg-indigo-50/50 p-2 rounded">
                          {cat.title}
                        </span>
                        <div className="space-y-4">
                          {catSkills.map(sk => {
                            const req = profRequirements.find(r => r.skillId === sk.id) || { skillId: sk.id, targetLevel: 0 };
                            return (
                              <div key={sk.id} className="bg-white p-4 border border-slate-250/70 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-0.5">
                                  <strong className="text-slate-800 text-sm font-bold block">{sk.title}</strong>
                                  <p className="text-sm text-slate-400 leading-normal max-w-sm font-medium">{sk.description}</p>
                                </div>

                                <div className="flex items-center gap-6 text-sm text-slate-600">
                                  {/* Target Level Select */}
                                  <div className="space-y-1">
                                    <span className="text-sm text-slate-400 block font-bold">Целевой уровень (0-4)</span>
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
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-0">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Навыки
              </h1>
              <p className="text-slate-500 mt-2 text-sm max-w-2xl">
                Управление базой навыков и категорий должностного развития. Настраивайте детальные описания и поведенческие индикаторы для каждого уровня владения.
              </p>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={handleExportXLSX}
                    className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                    <Download className="w-4 h-4" />
                    Экспорт
                </button>
                <label className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Импорт
                    <input type="file" accept=".xlsx" onChange={handleImportXLSX} className="hidden" />
                </label>
                <div className="relative">
                  <button
                    onClick={() => setIsSkillsDropdownOpen(!isSkillsDropdownOpen)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить
                  </button>
                  {isSkillsDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-10 p-1">
                      <button
                        onClick={() => { setIsSkillsDropdownOpen(false); startEditCategory(null); }}
                        className="block w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded"
                      >
                        Добавить категорию навыков
                      </button>
                      <button
                        onClick={() => { setIsSkillsDropdownOpen(false); startEditSkill(null); }}
                        className="block w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded"
                      >
                        Добавить навык
                      </button>
                    </div>
                  )}
                </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-6 pt-2">
              {categories.length === 0 ? (
                <div className="text-center py-12 px-4 border border-slate-200 rounded-2xl bg-white max-w-xl mx-auto space-y-4 shadow-sm w-full">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto" strokeWidth={1.5} />
                  <h3 className="text-sm font-bold text-slate-800">Нет категорий или навыков</h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Вы начали с чистого листа. Добавьте свою первую категорию компетенций, а затем наполните её профессиональными навыками.
                  </p>
                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      onClick={() => startEditCategory(null)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
                    >
                      Создать категорию
                    </button>
                    <label className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors shadow-2xs">
                      <Upload className="w-3.5 h-3.5" />
                      Импортировать XLSX
                      <input type="file" accept=".xlsx" onChange={handleImportXLSX} className="hidden" />
                    </label>
                  </div>
                </div>
              ) : (
                categories.map((cat, catIdx) => {
                  const associatedSkills = skills.filter(s => s.categoryId === cat.id);
                  const sumOfWeights = associatedSkills.reduce((sum, sk) => sum + (sk.weight ?? 0), 0);
                  const isBalanced = Math.abs(sumOfWeights - 1.0) < 0.001;

                  return (
                    <div key={cat.id} className="relative border border-slate-200 rounded-xl p-5 bg-white shadow-sm space-y-3">
                      <div className="absolute top-4 right-4 flex gap-1 items-center">
                        <button
                          disabled={catIdx === 0}
                          onClick={() => moveCategory(cat.id, 'up')}
                          className={`bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 p-1.5 rounded-lg flex items-center justify-center cursor-pointer shadow-2xs transition-colors ${
                            catIdx === 0 ? 'opacity-35 cursor-not-allowed hover:bg-white' : ''
                          }`}
                          title="Переместить категорию вверх"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={catIdx === categories.length - 1}
                          onClick={() => moveCategory(cat.id, 'down')}
                          className={`bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 p-1.5 rounded-lg flex items-center justify-center cursor-pointer shadow-2xs transition-colors ${
                            catIdx === categories.length - 1 ? 'opacity-35 cursor-not-allowed hover:bg-white' : ''
                          }`}
                          title="Переместить категорию вниз"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => startEditCategory(cat)}
                          className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 p-1.5 rounded-lg flex items-center justify-center cursor-pointer shadow-2xs transition-colors"
                          title="Редактировать категорию"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 truncate pr-16 border-b pb-2">
                        {cat.title}
                      </h3>
                      {cat.description && <p className="text-sm text-slate-500 mt-1">{cat.description}</p>}
                      
                      {/* Live Category Weight Validation display */}
                      <div className="flex flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg mt-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="text-sm font-bold text-slate-400 whitespace-nowrap">Балансировка весов:</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded transition-all text-sm font-bold font-mono ${
                            isBalanced 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-250/50' 
                              : 'bg-amber-50 text-amber-700 border border-amber-250/50 animate-pulse'
                          }`}>
                            {sumOfWeights.toFixed(2)} / 1.00 {isBalanced ? ' (✔️ Сбалансировано)' : ' (⚠️ Требуется балансировка)'}
                          </span>
                        </div>
                        
                        {associatedSkills.length > 0 && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => distributeWeightsEvenly(cat.id)}
                              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-205 text-sm font-bold px-2.5 py-1 rounded cursor-pointer transition-colors shadow-2xs"
                              title="Распределить вес поровну между всеми навыками в этой категории"
                            >
                              Авто-баланс
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 pt-1">
                        {associatedSkills.length === 0 ? (
                          <p className="text-sm text-slate-400 italic">Навыков в этой группе нет.</p>
                        ) : (
                          associatedSkills.map((sk, skIdx) => (
                            <div key={sk.id} className="bg-white p-3.5 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-2xs hover:scale-[1.002]">
                              <div className="space-y-0.5 flex-1 w-full truncate">
                                <strong className="text-slate-800 text-sm font-bold block truncate">{sk.title}</strong>
                                <p className="text-sm text-slate-450 leading-snug">{sk.description}</p>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-slate-100 sm:border-0 w-full sm:w-auto">
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-slate-400 font-bold">Вес:</span>
                                  <input
                                    type="number"
                                    min="0.0"
                                    max="1.0"
                                    step="0.05"
                                    value={Math.round((sk.weight ?? 0.20) * 100) / 100}
                                    onChange={(e) => updateSkillWeightDirectly(sk.id, parseFloat(e.target.value) || 0)}
                                    className="w-14 text-center text-sm p-1 border border-slate-200 rounded-lg font-bold font-mono bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                                  />
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    disabled={skIdx === 0}
                                    onClick={() => moveSkill(sk.id, 'up')}
                                    className={`bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-sm font-bold p-1.5 rounded cursor-pointer flex items-center justify-center shadow-2xs ${
                                      skIdx === 0 ? 'opacity-30 cursor-not-allowed hover:bg-slate-50' : ''
                                    }`}
                                    title="Переместить навык вверх"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    disabled={skIdx === associatedSkills.length - 1}
                                    onClick={() => moveSkill(sk.id, 'down')}
                                    className={`bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-sm font-bold p-1.5 rounded cursor-pointer flex items-center justify-center shadow-2xs ${
                                      skIdx === associatedSkills.length - 1 ? 'opacity-30 cursor-not-allowed hover:bg-slate-50' : ''
                                    }`}
                                    title="Переместить навык вниз"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => startEditSkill(sk)}
                                    className="bg-slate-50 hover:bg-slate-150 text-slate-700 border border-slate-200 text-sm font-bold p-1.5 rounded cursor-pointer flex items-center justify-center shadow-2xs"
                                    title="Редактировать навык"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })
              )}
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
            {editingCategory.id ? 'Изменить категорию навыков' : 'Добавить категорию навыков'}
          </h4>
          <form onSubmit={saveCategory} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Название</label>
              <input
                type="text"
                required
                value={catTitle}
                onChange={(e) => setCatTitle(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Описание</label>
              <textarea
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg min-h-[80px] outline-none edit:bg-white font-medium"
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              {editingCategory.id ? (
                confirmDeleteCat ? (
                  <div className="flex gap-1.5 items-center bg-rose-50 border border-rose-100 p-1.5 rounded-lg">
                    <span className="text-[10px] text-rose-700 font-bold px-1">Удалить вместе с навыками?</span>
                    <button
                      type="button"
                      onClick={() => {
                        deleteCategory(editingCategory.id);
                        setEditingCategory(null);
                        setConfirmDeleteCat(false);
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      Да, удалить
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteCat(false)}
                      className="px-2.5 py-1 bg-slate-250 hover:bg-slate-300 text-slate-700 rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteCat(true)}
                    className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    Удалить категорию
                  </button>
                )
              ) : (
                <div />
              )}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-300 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-700 transition-colors"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* EDIT SKILL MODAL DIALOG WITH BEHAVIORAL MARKERS LIST */}
      {editingSkill && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xl space-y-6">
          <h4 className="font-extrabold text-slate-900 border-b border-indigo-50 pb-2">
            {editingSkill.id ? 'Редактировать навык' : 'Добавить навык'}
          </h4>
          <form onSubmit={saveSkill} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-1">
                <label className="block text-xs font-bold text-slate-700">Название</label>
                <input
                  type="text"
                  required
                  placeholder="Например: Анимация переходов"
                  value={skillTitle}
                  onChange={(e) => setSkillTitle(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white font-semibold"
                />
              </div>

              <div className="space-y-1.5 col-span-1">
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
              <label className="block text-xs font-bold text-slate-700">Описание</label>
              <textarea
                required
                value={skillDesc}
                onChange={(e) => setSkillDesc(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none min-h-[60px]"
              />
            </div>

            {/* Editing 5 behavioral description markers */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">Уровни владения навыком</label>
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
                      className="w-full text-xs font-medium p-2 bg-white border border-slate-200 rounded-lg outline-none"
                      placeholder={`Описание уровня ${n}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-50 border-t border-slate-100 p-4 -m-6 mt-4">
              {editingSkill.id ? (
                confirmDeleteSkill ? (
                  <div className="flex gap-1.5 items-center bg-rose-50 border border-rose-100 p-1.5 rounded-lg">
                    <span className="text-[10px] text-rose-700 font-bold px-1">Удалить этот навык?</span>
                    <button
                      type="button"
                      onClick={() => {
                        deleteSkill(editingSkill.id);
                        setEditingSkill(null);
                        setConfirmDeleteSkill(false);
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      Да, удалить
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteSkill(false)}
                      className="px-2.5 py-1 bg-slate-250 hover:bg-slate-300 text-slate-700 rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteSkill(true)}
                    className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold cursor-pointer transition-colors font-sans"
                  >
                    Удалить навык
                  </button>
                )
              ) : (
                <div />
              )}
              <div className="flex gap-3.5">
                <button
                  type="button"
                  onClick={() => setEditingSkill(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-300 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-700 transition-colors"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
