import { db } from '../db/index.js';
import { eq, and, desc, countDistinct } from 'drizzle-orm';
import { jobs, jobSkills, candidates } from '../db/schema/index.js';

// ─── GET /jobs ────────────────────────────────────────────────────────────────
export const getJobs = async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const rows = await db
      .select({
        ...jobs,
        skill_count: countDistinct(jobSkills.id),
        candidate_count: countDistinct(candidates.id),
      })
      .from(jobs)
      .leftJoin(jobSkills, eq(jobSkills.jobId, jobs.id))
      .leftJoin(candidates, eq(candidates.jobId, jobs.id))
      .where(eq(jobs.companyId, companyId))
      .groupBy(jobs.id)
      .orderBy(desc(jobs.createdAt));

    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /jobs/:id ────────────────────────────────────────────────────────────
export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const jobRows = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.companyId, companyId)));

    if (!jobRows.length) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const skills = await db
      .select()
      .from(jobSkills)
      .where(eq(jobSkills.jobId, id))
      .orderBy(desc(jobSkills.isMandatory), jobSkills.skillName);

    return res.json({
      success: true,
      data: { ...jobRows[0], skills },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /jobs ───────────────────────────────────────────────────────────────
export const createJob = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const {
      title, department, description,
      experience_required_min, experience_required_max,
      education_required, education_strict,
      max_resumes,
      skill_weight, experience_weight, education_weight,
      project_keywords,
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Job title is required' });
    }

    const sw = skill_weight      ?? 50;
    const ew = experience_weight ?? 30;
    const dw = education_weight  ?? 20;

    if (sw + ew + dw !== 100) {
      return res.status(400).json({
        success: false,
        message: `Scoring weights must sum to 100. Got: ${sw + ew + dw}`,
      });
    }

    const rows = await db
      .insert(jobs)
      .values({
        companyId,
        title,
        department:            department             || null,
        description:           description            || null,
        experienceRequiredMin: experience_required_min || 0,
        experienceRequiredMax: experience_required_max || null,
        educationRequired:     education_required      || null,
        educationStrict:       education_strict        || false,
        maxResumes:            max_resumes             || 10,
        createdBy:             req.user.id,
        skillWeight:           sw,
        experienceWeight:      ew,
        educationWeight:       dw,
        projectKeywords:       project_keywords        || [],
      })
      .returning();

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /jobs/:id ────────────────────────────────────────────────────────────
export const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;
    const {
      title, department, description,
      experience_required_min, experience_required_max,
      education_required, education_strict, status, max_resumes,
      skill_weight, experience_weight, education_weight,
      project_keywords,
    } = req.body;

    const existing = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.companyId, companyId)));

    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Validate weights if any provided
    if (skill_weight !== undefined || experience_weight !== undefined || education_weight !== undefined) {
      const sw = skill_weight      ?? existing[0].skillWeight;
      const ew = experience_weight ?? existing[0].experienceWeight;
      const dw = education_weight  ?? existing[0].educationWeight;
      if (sw + ew + dw !== 100) {
        return res.status(400).json({
          success: false,
          message: `Scoring weights must sum to 100. Got: ${sw + ew + dw}`,
        });
      }
    }

    const updateData = { updatedAt: new Date() };
    if (title !== undefined)                  updateData.title                = title;
    if (department !== undefined)             updateData.department           = department;
    if (description !== undefined)            updateData.description          = description;
    if (experience_required_min !== undefined) updateData.experienceRequiredMin = experience_required_min;
    if (experience_required_max !== undefined) updateData.experienceRequiredMax = experience_required_max;
    if (education_required !== undefined)     updateData.educationRequired    = education_required;
    if (education_strict !== undefined)       updateData.educationStrict      = education_strict;
    if (status !== undefined)                 updateData.status               = status;
    if (max_resumes !== undefined)            updateData.maxResumes           = max_resumes;
    if (skill_weight !== undefined)           updateData.skillWeight          = skill_weight;
    if (experience_weight !== undefined)      updateData.experienceWeight     = experience_weight;
    if (education_weight !== undefined)       updateData.educationWeight      = education_weight;
    if (project_keywords !== undefined)       updateData.projectKeywords      = project_keywords;

    const rows = await db
      .update(jobs)
      .set(updateData)
      .where(and(eq(jobs.id, id), eq(jobs.companyId, companyId)))
      .returning();

    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE /jobs/:id ─────────────────────────────────────────────────────────
export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const existing = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.companyId, companyId)));

    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    await db.delete(jobs).where(and(eq(jobs.id, id), eq(jobs.companyId, companyId)));

    return res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /jobs/:id/skills ────────────────────────────────────────────────────
export const addJobSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;
    const { skill_name, is_mandatory } = req.body;

    if (!skill_name) {
      return res.status(400).json({ success: false, message: 'skill_name is required' });
    }

    const job = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.companyId, companyId)));

    if (!job.length) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const rows = await db
      .insert(jobSkills)
      .values({
        jobId: id,
        skillName: skill_name.trim(),
        isMandatory: is_mandatory === true || is_mandatory === 'true',
      })
      .onConflictDoNothing()
      .returning();

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE /job-skills/:id ───────────────────────────────────────────────────
export const deleteJobSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const rows = await db
      .select({ id: jobSkills.id })
      .from(jobSkills)
      .innerJoin(jobs, eq(jobs.id, jobSkills.jobId))
      .where(and(eq(jobSkills.id, id), eq(jobs.companyId, companyId)));

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Job skill not found' });
    }

    await db.delete(jobSkills).where(eq(jobSkills.id, id));

    return res.json({ success: true, message: 'Skill removed successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};