import { recruitmentEmitter, EVENTS } from './recruitmentEvents.js';
import { resumeParseQueue, resumeScoreQueue } from './resumeQueue.js';

// ─── RESUME_UPLOADED → push to parse queue ───────────────────────────────────
recruitmentEmitter.on(EVENTS.RESUME_UPLOADED, async (payload) => {
  try {
    await resumeParseQueue.add(payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: true,
    });

    console.log(
      `[EVENT] RESUME_UPLOADED → queued for parsing | candidateId: ${payload.candidateId}`
    );
  } catch (err) {
    console.error('[EVENT] Failed to enqueue parse job:', err.message);
  }
});

// ─── RESUME_PARSED → push to score queue ─────────────────────────────────────
recruitmentEmitter.on(EVENTS.RESUME_PARSED, async (payload) => {
  try {
    await resumeScoreQueue.add(payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: true,
    });

    console.log(
      `[EVENT] RESUME_PARSED → queued for scoring | candidateId: ${payload.candidateId}`
    );
  } catch (err) {
    console.error('[EVENT] Failed to enqueue score job:', err.message);
  }
});

// ─── RESUME_FAILED → log ─────────────────────────────────────────────────────
recruitmentEmitter.on(EVENTS.RESUME_FAILED, (payload) => {
  console.error(
    `[EVENT] RESUME_FAILED | candidateId: ${payload.candidateId} | reason: ${payload.reason}`
  );
});

console.log('[Recruitment] Event listeners registered.');