/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Category {
  id: string;
  title: string;
  description: string;
}

export interface Skill {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  levels: [string, string, string, string, string]; // Descriptions for levels 0, 1, 2, 3, 4
  weight: number; // 0.01 - 1.00 (sum across category = 1.0)
}

export interface ProfileRequirement {
  skillId: string;
  targetLevel: number; // 0-4
}

export interface Profile {
  id: string;
  title: string;
  description: string;
  nextProfileId?: string; // Pointing to next career grade
  requirements: ProfileRequirement[];
}

export interface Session {
  id: string;
  title: string;
  profileId: string;
  status: 'active' | 'archived';
  shareToken: string;
}

export interface SkillScores {
  [skillId: string]: number; // 0-4
}

export interface SkillComments {
  [skillId: string]: string; // Calibrator justification comments
}

export interface Evaluation {
  id: string;
  sessionId: string;
  designerName: string;
  selfScores: SkillScores;
  calibratedScores: SkillScores;
  calibrationJustifications: SkillComments;
  actionPlan: string;
  status: 'submitted' | 'calibrated';
  dateSubmitted: string;
  dateCalibrated?: string;
}

// Current active simulation state
export type AppViewMode = 'lead' | 'designer' | 'designer-profile' | 'director-report' | 'welcome';

export interface AppState {
  categories: Category[];
  skills: Skill[];
  profiles: Profile[];
  sessions: Session[];
  evaluations: Evaluation[];
}
