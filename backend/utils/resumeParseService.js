// utils/resumeParseService.js

import axios from 'axios';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function parseResume(fileUrl) {
  try {
    // 1. Download PDF
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
    });
    

    const pdfBuffer = new Uint8Array(response.data);

    // 2. Load PDF
    const loadingTask = getDocument({
      data: pdfBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
    });

    const pdfDoc = await loadingTask.promise;

    // 3. Extract text
    let rawText = '';

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      rawText += pageText + '\n';
    }

    return {
      full_name: extractName(rawText),
      email: extractEmail(rawText),
      phone: extractPhone(rawText),
      total_experience: extractTotalExperience(rawText),
      relevant_experience: null,
      education: extractEducation(rawText),
      skills: extractSkills(rawText),
      raw_text: rawText,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

/* ─────────────────────────────────────────────
   Extraction Helpers
───────────────────────────────────────────── */

function extractEmail(text) {
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

function extractPhone(text) {
  const match = text.match(/(\+?\d[\d\s\-().]{8,14}\d)/);
  return match ? match[0].trim() : null;
}

function extractName(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;

  const firstLine = lines[0];

  // Remove email
  let cleaned = firstLine.replace(
    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/,
    ''
  );

  // Remove phone
  cleaned = cleaned.replace(/(\+?\d[\d\s\-().]{8,14}\d)/, '');

  // Remove separators like —
  cleaned = cleaned.split('—')[0].trim();

  return cleaned.slice(0, 100); // safety limit
}

function extractTotalExperience(text) {
  const match = text.match(
    /(\d+(?:\.\d+)?)\s*\+?\s*years?(?:\s+of\s+experience)?/i
  );
  return match ? parseFloat(match[1]) : null;
}

function extractEducation(text) {
  const levels = [
    'Ph.D', 'PhD', 'Doctorate',
    'Master', 'M.Tech', 'M.Sc', 'MBA', 'M.E',
    'Bachelor', 'B.Tech', 'B.Sc', 'B.E', 'BCA', 'BBA',
    'Diploma', '12th', '10th',
  ];

  for (const level of levels) {
    if (text.includes(level)) return level;
  }

  return null;
}

function extractSkills(text) {
  const knownSkills = [
    'JavaScript', 'TypeScript', 'Node.js', 'React', 'Angular', 'Vue',
    'Python', 'Django', 'Flask', 'Java', 'Spring Boot', 'Kotlin',
    'C++', 'C#', '.NET', 'PHP', 'Laravel',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
    'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform',
    'Git', 'CI/CD', 'Jenkins', 'GitHub Actions',
    'REST API', 'GraphQL', 'gRPC', 'Microservices',
    'Machine Learning', 'TensorFlow', 'PyTorch', 'Data Science',
    'HTML', 'CSS', 'Tailwind', 'SASS',
    'Agile', 'Scrum', 'Jira', 'Leadership', 'Communication',
  ];

  const lowerText = text.toLowerCase();

  return knownSkills.filter(skill =>
    lowerText.includes(skill.toLowerCase())
  );
}