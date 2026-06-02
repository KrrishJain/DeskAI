import EventEmitter from 'events';

class RecruitmentEventEmitter extends EventEmitter {}

export const recruitmentEmitter = new RecruitmentEventEmitter();

export const EVENTS = {
  RESUME_UPLOADED: 'RESUME_UPLOADED',
  RESUME_PARSED: 'RESUME_PARSED',
  RESUME_SCORED: 'RESUME_SCORED',
  RESUME_FAILED: 'RESUME_FAILED',
};