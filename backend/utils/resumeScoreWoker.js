import { resumeScoreQueue } from './resumeQueue.js';
import { calculateATSScore } from './atsScoring.service.js';
import { query } from '../db/pool.js';

/**
 * Score Queue Worker
 * Concurrency = 5
 */
resumeScoreQueue.process(5, async (job) => {
  const { candidateId, jobId } = job.data;

  console.log(`[SCORE WORKER] Starting | candidateId: ${candidateId}`);

  try {
    // Mark as scoring
    await query(
      `UPDATE candidates 
       SET status = 'scoring', updated_at = NOW() 
       WHERE id = $1`,
      [candidateId]
    );

    // Fetch candidate
    const { rows: candidateRows } = await query(
      `SELECT * FROM candidates WHERE id = $1`,
      [candidateId]
    );
    if (!candidateRows.length) {
      throw new Error(`Candidate ${candidateId} not found`);
    }
    const candidate = candidateRows[0];

    // Fetch job
    const { rows: jobRows } = await query(
      `SELECT * FROM jobs WHERE id = $1`,
      [jobId]
    );
    if (!jobRows.length) {
      throw new Error(`Job ${jobId} not found`);
    }
    const job_data = jobRows[0];

    // Fetch job skills
    const { rows: jobSkills } = await query(
      `SELECT skill_name, is_mandatory 
       FROM job_skills 
       WHERE job_id = $1`,
      [jobId]
    );

    // Calculate ATS score
    const { ats_score, score_breakdown, relevant_experience } =
      calculateATSScore(candidate, jobSkills, job_data);

    // Update candidate
    await query(
      `UPDATE candidates
       SET
         status              = 'scored',
         ats_score           = $1,
         score_breakdown     = $2,
         relevant_experience = $3,
         updated_at          = NOW()
       WHERE id = $4`,
      [
        ats_score,
        JSON.stringify(score_breakdown),
        relevant_experience,
        candidateId,
      ]
    );

    console.log(
      `[SCORE WORKER] Done | candidateId: ${candidateId} | score: ${ats_score}`
    );

    return { success: true, candidateId, ats_score };
  } catch (err) {
    console.error(
      `[SCORE WORKER] Failed | candidateId: ${candidateId} | ${err.message}`
    );

    try {
      await query(
        `UPDATE candidates 
         SET status = 'failed', updated_at = NOW() 
         WHERE id = $1`,
        [candidateId]
      );
    } catch (updateErr) {
      console.error(
        `[SCORE WORKER] Failed to mark candidate as failed: ${updateErr.message}`
      );
    }

    throw err;
  }
});

// ── Queue-level error handlers ─────────────────────────────────────────────
resumeScoreQueue.on('failed', (job, err) => {
  console.error(
    `[SCORE QUEUE] Job ${job.id} failed after all retries: ${err.message}`
  );
});

resumeScoreQueue.on('completed', (job) => {
  console.log(`[SCORE QUEUE] Job ${job.id} completed.`);
});

console.log('[Recruitment] Resume Score Worker running (concurrency: 5)');