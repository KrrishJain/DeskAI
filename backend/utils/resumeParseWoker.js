import { resumeParseQueue } from './resumeQueue.js';
import { recruitmentEmitter, EVENTS } from './recruitmentEvents.js';
import { parseResume } from './resumeParseService.js';
import { query } from '../db/pool.js';

/**
 * Parse Queue Worker
 * Concurrency = 3
 */
resumeParseQueue.process(3, async (job) => {
  const { candidateId, fileUrl, jobId } = job.data;

  console.log(`[PARSE WORKER] Starting | candidateId: ${candidateId}`);

  try {
    // Mark as parsing
    await query(
      `UPDATE candidates 
       SET status = 'parsing', updated_at = NOW() 
       WHERE id = $1`,
      [candidateId]
    );

    // Parse resume
    const parsedData = await parseResume(fileUrl);

    // Update candidate
    await query(
      `UPDATE candidates
       SET
         status           = 'parsed',
         full_name        = $1,
         email            = $2,
         phone            = $3,
         total_experience = $4,
         education        = $5,
         parsed_data      = $6,
         updated_at       = NOW()
       WHERE id = $7`,
      [
        parsedData.full_name,
        parsedData.email,
        parsedData.phone,
        parsedData.total_experience,
        parsedData.education,
        JSON.stringify(parsedData),
        candidateId,
      ]
    );

    // Insert skills
    if (parsedData.skills && parsedData.skills.length > 0) {
      const skillValues = parsedData.skills
        .map((_, i) => `($1, $${i + 2})`)
        .join(', ');

      await query(
        `INSERT INTO candidate_skills (candidate_id, skill_name)
         VALUES ${skillValues}
         ON CONFLICT DO NOTHING`,
        [candidateId, ...parsedData.skills]
      );
    }

    console.log(`[PARSE WORKER] Done | candidateId: ${candidateId}`);

    recruitmentEmitter.emit(EVENTS.RESUME_PARSED, {
      candidateId,
      jobId,
    });

    return { success: true, candidateId };
  } catch (err) {
    console.error(
      `[PARSE WORKER] Failed | candidateId: ${candidateId} | ${err.message}`
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
        `[PARSE WORKER] Failed to mark candidate as failed: ${updateErr.message}`
      );
    }

    recruitmentEmitter.emit(EVENTS.RESUME_FAILED, {
      candidateId,
      reason: err.message,
    });

    throw err;
  }
});

// ── Queue-level error handlers ─────────────────────────────────────────────
resumeParseQueue.on('failed', (job, err) => {
  console.error(
    `[PARSE QUEUE] Job ${job.id} failed after all retries: ${err.message}`
  );
});

resumeParseQueue.on('completed', (job) => {
  console.log(`[PARSE QUEUE] Job ${job.id} completed.`);
});

console.log('[Recruitment] Resume Parse Worker running (concurrency: 3)');