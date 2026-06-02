import multer from "multer";
import { db } from "../db/index.js";
import { candidates, jobs } from "../db/schema/index.js";
import { and, eq, sql } from "drizzle-orm";
import cloudinary from "../utils/cloudinaryconfig.js";
import { recruitmentEmitter, EVENTS } from "../utils/recruitmentEvents.js";

// ─── Multer: store in memory before pushing to Cloudinary ────────────────────
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

export const uploadMiddleware = upload.array("resumes", 10);

// ─── Helper: upload single buffer to Cloudinary ───────────────────────────────
function uploadToCloudinary(buffer, originalname) {
  return new Promise((resolve, reject) => {
    const cleanName = originalname
      .replace(/\s+/g, "_")
      .replace(/\.pdf$/i, ""); // remove .pdf if already present

    const uploadStream = cloudinary.uploader.upload_stream(
  {
    folder: "recruitment/resumes",
    resource_type: "auto",
    type: "upload",
    access_mode: "public",     // ← VERY IMPORTANT
    public_id: `resume_${Date.now()}_${cleanName}`,
  },
  (error, result) => {
    if (error) return reject(error);
    resolve(result);
  }
);

    uploadStream.end(buffer);
  });
}

// ─── POST /jobs/:id/upload-resumes ────────────────────────────────────────────
export const uploadResumes = async (req, res) => {
  try {
    const { id: jobId } = req.params;
    const companyId = req.user.company_id;

    const jobRows = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, parseInt(jobId)), eq(jobs.companyId, companyId)));

    if (!jobRows.length) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No resume files uploaded" });
    }

    const existingCount = await db
      .select({ count: sql`COUNT(*)` })
      .from(candidates)
      .where(and(eq(candidates.jobId, parseInt(jobId)), eq(candidates.companyId, companyId)));

    const currentCount = parseInt(existingCount[0].count, 10);
    const maxAllowed = jobRows[0].max_resumes || 10;

    if (currentCount + req.files.length > maxAllowed) {
      return res.status(400).json({
        success: false,
        message: `Max ${maxAllowed} resumes allowed. Currently ${currentCount} uploaded.`,
      });
    }

    const results = [];

    for (const file of req.files) {
      try {
        const cloudResult = await uploadToCloudinary(
          file.buffer,
          file.originalname,
        );

        const candidateRows = await db
          .insert(candidates)
          .values({
            companyId,
            jobId: parseInt(jobId),
            resumeFilePath: cloudResult.secure_url,
            originalFilename: file.originalname,
            status: "uploaded",
          })
          .returning();

        const candidate = candidateRows[0];

        recruitmentEmitter.emit(EVENTS.RESUME_UPLOADED, {
          candidateId: candidate.id,
          fileUrl: cloudResult.secure_url,
          jobId,
        });

        results.push({
          candidateId: candidate.id,
          originalname: file.originalname,
          status: "uploaded",
          cloudinary_url: cloudResult.secure_url,
        });
      } catch (err) {
        results.push({
          originalname: file.originalname,
          status: "failed",
          error: err.message,
        });
      }
    }

    return res.status(202).json({
      success: true,
      message: `${
        results.filter((r) => r.status === "uploaded").length
      } resume(s) uploaded and queued for processing.`,
      data: results,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── GET /jobs/:id/candidates ─────────────────────────────────────────────────
export const getCandidatesByJob = async (req, res) => {
  try {
    const { id: jobId } = req.params;
    const companyId = req.user.company_id;
    const { status, sort_by = "final_score", order = "DESC" } = req.query;

    const jobRows = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.id, parseInt(jobId)), eq(jobs.companyId, companyId)));

    if (!jobRows.length) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const allowedSorts = [
      "final_score",
      "ats_score",
      "created_at",
      "full_name",
    ];
    const allowedOrders = ["ASC", "DESC"];

    const sortCol = allowedSorts.includes(sort_by) ? sort_by : "final_score";
    const sortOrder = allowedOrders.includes(order.toUpperCase())
      ? order.toUpperCase()
      : "DESC";

    const sortColumnMap = {
      final_score: sql.raw("c.final_score"),
      ats_score: sql.raw("c.ats_score"),
      created_at: sql.raw("c.created_at"),
      full_name: sql.raw("c.full_name"),
    };

    const whereConditions = [sql`c.job_id = ${parseInt(jobId)}`, sql`c.company_id = ${companyId}`];
    if (status) whereConditions.push(sql`c.status = ${status}`);

    const result = await db.execute(sql`
      SELECT 
        c.*,
        COALESCE(c.score_breakdown->'skills'->>'match_percent', '0')::int AS skill_match_percent,
        COALESCE(c.score_breakdown->'skills'->'missing_mandatory', '[]'::jsonb) AS missing_mandatory_skills
      FROM candidates c
      WHERE ${sql.join(whereConditions, sql` AND `)}
      ORDER BY ${sortColumnMap[sortCol]} ${sql.raw(sortOrder)} NULLS LAST
    `);
    const rows = result.rows;

    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── PATCH /candidates/:id ────────────────────────────────────────────────────
export const updateCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;
    const { hr_notes, manual_score_override } = req.body;

    const existing = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(and(eq(candidates.id, parseInt(id)), eq(candidates.companyId, companyId)));

    if (!existing.length) {
      return res
        .status(404)
        .json({ success: false, message: "Candidate not found" });
    }

    const rows = await db
      .update(candidates)
      .set({
        hrNotes: hr_notes ?? undefined,
        manualScoreOverride: manual_score_override ?? undefined,
        updatedAt: sql`now()`,
      })
      .where(and(eq(candidates.id, parseInt(id)), eq(candidates.companyId, companyId)))
      .returning();

    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── PATCH /candidates/:id/status ─────────────────────────────────────────────
export const updateCandidateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;
    const { status } = req.body;

    const validStatuses = [
  'uploaded', 'parsing', 'parsed', 'scoring',
  'scored', 'reviewed', 'shortlisted', 'rejected', 'failed', // ← add 'failed'
];


    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const existing = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(and(eq(candidates.id, parseInt(id)), eq(candidates.companyId, companyId)));

    if (!existing.length) {
      return res
        .status(404)
        .json({ success: false, message: "Candidate not found" });
    }

    const rows = await db
      .update(candidates)
      .set({ status, updatedAt: sql`now()` })
      .where(and(eq(candidates.id, parseInt(id)), eq(candidates.companyId, companyId)))
      .returning();

    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
