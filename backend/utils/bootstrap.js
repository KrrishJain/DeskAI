// ─── Bootstrap Recruitment Module ────────────────────────────────────────────
// Import this file once in your app.js / server.js BEFORE starting the server
// e.g.:  import './recruitment/bootstrap.js';

// import './events/recruitmentListeners.js';
// import './queues/resumeParseWorker.js';
// import './queues/resumeScoreWorker.js';

import './recruitmentListeners.js';
import './resumeParseWoker.js';
import './resumeScoreWoker.js';


console.log('[Recruitment] Module bootstrapped successfully.');