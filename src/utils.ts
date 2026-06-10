/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Skill, Profile, SkillScores, Category } from './types';

/**
 * Calculates the percentage of coverage for a specific category based on the profile requirements.
 * Ceiling rule is applied: if actual score exceeds target level, it is capped at target level.
 */
export function calculateCategoryCoverage(
  categoryId: string,
  skills: Skill[],
  profile: Profile,
  scores: SkillScores
): number {
  const categorySkills = skills.filter(s => s.categoryId === categoryId);
  const categorySkillIds = new Set(categorySkills.map(s => s.id));

  // Find requirements for this category
  const categoryReqs = profile.requirements.filter(r => categorySkillIds.has(r.skillId));

  if (categoryReqs.length === 0) {
    return 100; // No requirements means 100% covered by default
  }

  let weightedFactSum = 0;
  let weightedTargetSum = 0;

  for (const req of categoryReqs) {
    const target = req.targetLevel;
    const weight = req.weight;
    const rawFact = scores[req.skillId] ?? 0;

    // Apply rule: if Fact > Target, cap at Target
    const consideredFact = rawFact > target ? target : rawFact;

    weightedFactSum += consideredFact * weight;
    weightedTargetSum += target * weight;
  }

  if (weightedTargetSum === 0) {
    return 100; // If nothing is expected, coverage is 100%
  }

  const coverage = (weightedFactSum / weightedTargetSum) * 100;
  return Math.round(coverage * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculates the overall profile coverage as the arithmetic average of categories coverage.
 */
export function calculateOverallCoverage(
  categories: Category[],
  skills: Skill[],
  profile: Profile,
  scores: SkillScores
): number {
  // Find which categories are active in this profile (have at least one skill requirement)
  const requiredSkillIds = new Set(profile.requirements.map(r => r.skillId));
  const activeCategories = categories.filter(cat => {
    const catSkills = skills.filter(s => s.categoryId === cat.id);
    return catSkills.some(s => requiredSkillIds.has(s.id));
  });

  if (activeCategories.length === 0) {
    return 0;
  }

  let totalCoverage = 0;
  for (const cat of activeCategories) {
    totalCoverage += calculateCategoryCoverage(cat.id, skills, profile, scores);
  }

  return Math.round((totalCoverage / activeCategories.length) * 10) / 10;
}

export interface PrioritySkill {
  skill: Skill;
  currentScore: number;
  targetLevel: number;
  weight: number;
  priorityIndex: number;
}

/**
 * Calculates and prioritizes development items for the next grade.
 */
export function calculateIDPPriorities(
  skills: Skill[],
  currentScores: SkillScores,
  nextProfile: Profile
): PrioritySkill[] {
  const list: PrioritySkill[] = [];

  for (const req of nextProfile.requirements) {
    const currentScore = currentScores[req.skillId] ?? 0;
    const target = req.targetLevel;

    // If current score is lower than the target for the next role, it's a development item
    if (currentScore < target) {
      const skill = skills.find(s => s.id === req.skillId);
      if (skill) {
        const gap = target - currentScore;
        const priorityIndex = gap * req.weight;
        list.push({
          skill,
          currentScore,
          targetLevel: target,
          weight: req.weight,
          priorityIndex: Math.round(priorityIndex * 100) / 100
        });
      }
    }
  }

  // Sort by priority index descending, then by target level descending
  return list.sort((a, b) => {
    if (b.priorityIndex !== a.priorityIndex) {
      return b.priorityIndex - a.priorityIndex;
    }
    return b.targetLevel - a.targetLevel;
  });
}

/**
 * Automatically determines the most suitable profile based on skill scores.
 * It evaluates coverage for all profiles, orders them from highest requirements to lowest,
 * and selects the highest profile that has at least 70% overall coverage.
 * Defaults to the lowest profile if none match the 70% threshold.
 */
export function determineMostSuitableProfile(
  categories: Category[],
  skills: Skill[],
  profiles: Profile[],
  scores: SkillScores
): Profile {
  if (profiles.length === 0) {
    throw new Error('No profiles available');
  }

  // Calculate average target level for each profile to sort them from highest to lowest demand
  const profilesWithAvgDemand = profiles.map(p => {
    const totalTarget = p.requirements.reduce((sum, r) => sum + r.targetLevel, 0);
    const avgTarget = totalTarget / (p.requirements.length || 1);
    const coverage = calculateOverallCoverage(categories, skills, p, scores);
    return { profile: p, avgTarget, coverage };
  });

  // Sort descending (Senior -> Middle -> Junior)
  profilesWithAvgDemand.sort((a, b) => b.avgTarget - a.avgTarget);

  // Find the highest-demanding profile where the designer has >= 70% coverage
  const threshold = 70;
  const matched = profilesWithAvgDemand.find(p => p.coverage >= threshold);

  if (matched) {
    return matched.profile;
  }

  // Default to the lowest profile (last in the sorted list)
  return profilesWithAvgDemand[profilesWithAvgDemand.length - 1].profile;
}

