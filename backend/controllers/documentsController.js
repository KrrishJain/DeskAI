/**
 * controllers/documentsController.js
 * Document management: upload PDFs/Docs, list, delete.
 * Files are stored in backend/uploads/documents/.
 * Served statically via express.static('/uploads').
 */

import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { db } from '../db/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { documents, users } from '../db/schema/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Multer storage ────────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'documents');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${Date.now()}_${safe}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
    fileFilter: (_req, file, cb) => {
        const allowed = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
        ];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only PDF, Word, Excel, and TXT files are allowed.'));
    },
}).single('file');

// ── GET /api/documents ────────────────────────────────────────────────────────
const getAll = asyncHandler(async (req, res) => {
    try {
        const { category } = req.query;

        const conditions = [eq(documents.companyId, req.user.company_id)];
        if (category) {
            conditions.push(eq(documents.category, category));
        }

        const rows = await db
            .select({
                ...documents,
                uploader_username: users.username,
                uploader_name: sql`${users.firstName} || ' ' || ${users.lastName}`.as('uploader_name'),
            })
            .from(documents)
            .leftJoin(users, eq(users.id, documents.uploadedBy))
            .where(and(...conditions))
            .orderBy(sql`${documents.createdAt} DESC`);

        return res.json({ success: true, data: rows });
    } catch (error) {
        console.error('❌ Error in getAll:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch documents.' });
    }
});

// ── POST /api/documents ───────────────────────────────────────────────────────
const create = (req, res) => {
    upload(req, res, async (err) => {
        try {
            if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded.' });
            }

            const { title, description, category = 'policy', is_public = true } = req.body;
            if (!title?.trim()) {
                fs.unlink(req.file.path, () => { });
                return res.status(400).json({ success: false, message: 'Title is required.' });
            }

            const filePath = `/uploads/documents/${req.file.filename}`;

            const rows = await db
                .insert(documents)
                .values({
                    title: title.trim(),
                    description: description?.trim() || null,
                    category,
                    filePath,
                    fileName: req.file.originalname,
                    fileSize: req.file.size,
                    mimeType: req.file.mimetype,
                    uploadedBy: req.user.id,
                    isPublic: is_public === 'false' || is_public === false ? false : true,
                    companyId: req.user.company_id,
                })
                .returning();

            return res.status(201).json({ success: true, data: rows[0] });
        } catch (error) {
            if (req.file?.path) fs.unlink(req.file.path, () => { });
            console.error('❌ Error in create:', error.message);
            return res.status(500).json({ success: false, message: 'Failed to upload document.' });
        }
    });
};

// ── DELETE /api/documents/:id ─────────────────────────────────────────────────
const remove = asyncHandler(async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const found = await db
            .select({ filePath: documents.filePath })
            .from(documents)
            .where(and(eq(documents.id, id), eq(documents.companyId, req.user.company_id)));

        if (!found.length) return res.status(404).json({ success: false, message: 'Document not found.' });

        const absPath = path.join(__dirname, '..', found[0].filePath);
        fs.unlink(absPath, () => { });

        await db
            .delete(documents)
            .where(and(eq(documents.id, id), eq(documents.companyId, req.user.company_id)));

        return res.json({ success: true, message: 'Document deleted.' });
    } catch (error) {
        console.error('❌ Error in remove:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to delete document.' });
    }
});

// ── PUT /api/documents/:id  (update metadata only, not file) ─────────────────
const update = asyncHandler(async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { title, description, category, is_public } = req.body;

        // Build partial update — only include fields that were provided
        const updateData = { updatedAt: new Date() };
        if (title)                    updateData.title       = title;
        if (description)              updateData.description = description;
        if (category)                 updateData.category    = category;
        if (is_public !== undefined)  updateData.isPublic    = is_public;

        const rows = await db
            .update(documents)
            .set(updateData)
            .where(and(eq(documents.id, id), eq(documents.companyId, req.user.company_id)))
            .returning();

        if (!rows.length) return res.status(404).json({ success: false, message: 'Document not found.' });
        return res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('❌ Error in update:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to update document.' });
    }
});

export { getAll, create, update, remove };