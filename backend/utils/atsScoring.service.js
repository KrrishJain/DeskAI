// services/atsScoring.service.js

const EDUCATION_RANK = {
  'PhD': 5, 'Ph.D': 5, 'Doctorate': 5,
  'Master': 4, 'M.Tech': 4, 'M.Sc': 4, 'MBA': 4, 'M.E': 4,
  'Bachelor': 3, 'B.Tech': 3, 'B.Sc': 3, 'B.E': 3, 'BCA': 3, 'BBA': 3,
  'Diploma': 2,
  '12th': 1, '10th': 0,
};

function countOccurrences(text, word) {
  const regex = new RegExp(`\\b${word}\\b`, 'gi');
  return (text.match(regex) || []).length;
}

export function calculateATSScore(candidate, jobSkills, job) {
  const parsedData      = candidate.parsed_data || {};
  const candidateSkills = (parsedData.skills || []).map(s => s.toLowerCase());
  const rawText         = (parsedData.raw_text || '').toLowerCase();
  const totalExp        = parsedData.total_experience || 0;
  const education       = parsedData.education || '';

  // ── 1. Skill Scoring (weighted) ─────────────────────────────────────────────
  let skillsScore      = 0;
  let totalSkillWeight = 0;
  let matchedSkills    = [];
  let missingMandatory = [];

  for (const skill of jobSkills) {
    const skillName = skill.skill_name.toLowerCase();
    const weight    = skill.weight || 10;

    totalSkillWeight += weight;

    const matched = candidateSkills.includes(skillName);

    if (matched) {
      skillsScore += weight;
      matchedSkills.push(skill.skill_name);

      // Bonus for repeated mentions (shows depth of experience)
      const occurrences = countOccurrences(rawText, skillName);
      if (occurrences >= 3) skillsScore += weight * 0.2;

    } else if (skill.is_mandatory) {
      missingMandatory.push(skill.skill_name);
    }
  }

  const skillMatchPercent = totalSkillWeight > 0
    ? Math.round((skillsScore / totalSkillWeight) * 100)
    : 100;

  // ── 2. Experience Scoring ────────────────────────────────────────────────────
  const expMin = job.experience_required_min || 0;
  const expMax = job.experience_required_max || expMin + 5;

  let experienceScore = totalExp < expMin && expMin > 0
    ? (totalExp / expMin) * 100
    : 100;

  experienceScore = Math.min(experienceScore, 100);

  // ── 3. Education Scoring ─────────────────────────────────────────────────────
  const candidateEduRank = EDUCATION_RANK[education] ?? 0;
  const requiredEduRank  = EDUCATION_RANK[job.education_required] ?? 0;

  // Hard reject if job has strict education flag and candidate doesn't meet it
  if (job.education_strict && candidateEduRank < requiredEduRank) {
    return {
      ats_score: 0,
      score_breakdown: { rejected_reason: 'Education criteria not met' },
      relevant_experience: null,
    };
  }

  let educationScore = 100;
  if (requiredEduRank > 0) {
    educationScore = candidateEduRank >= requiredEduRank
      ? 100
      : (candidateEduRank / requiredEduRank) * 100;
  }

  // ── 4. Project Keyword Boost ─────────────────────────────────────────────────
  const projectKeywords = job.project_keywords || [];
  let projectBoost = 0;

  for (const keyword of projectKeywords) {
    if (rawText.includes(keyword.toLowerCase())) projectBoost += 2;
  }

  // ── 5. Final Weighted Score ──────────────────────────────────────────────────
  const skillWeight      = job.skill_weight      || 50;
  const experienceWeight = job.experience_weight || 30;
  const educationWeight  = job.education_weight  || 20;

  const finalScore =
    (skillMatchPercent * skillWeight      / 100) +
    (experienceScore   * experienceWeight / 100) +
    (educationScore    * educationWeight  / 100) +
    projectBoost;

  // Cap at 60 if any mandatory skill is missing
  const mandatoryCapApplied = missingMandatory.length > 0;
  const ats_score = mandatoryCapApplied ? Math.min(finalScore, 60) : finalScore;

  // ── 6. Breakdown (stored in JSONB) ───────────────────────────────────────────
  const score_breakdown = {
    skills: {
      match_percent:     skillMatchPercent,
      matched:           matchedSkills,
      missing_mandatory: missingMandatory,
      total_weight:      totalSkillWeight,
    },
    experience: {
      match_percent:   Math.round(experienceScore),
      candidate_years: totalExp,
      required_min:    expMin,
      required_max:    expMax,
    },
    education: {
      match_percent: Math.round(educationScore),
      candidate:     education,
      required:      job.education_required || 'Not specified',
    },
    project_boost:         projectBoost,
    mandatory_cap_applied: mandatoryCapApplied,
    final_ats_score:       Math.round(ats_score),
  };

  return {
    ats_score:           Math.round(ats_score),
    score_breakdown,
    relevant_experience: totalExp,
  };
}