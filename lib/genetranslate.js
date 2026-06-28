// genetranslate — turns a diagnostic report into a PII-free strengths profile.
//
// parseReport(filePath) extracts text from a PDF/DOCX, then asks the LLM to
// distill a neurodiversity profile. If the LLM is unavailable or the text is
// too thin, it falls back to deterministic keyword heuristics so the upload
// flow never breaks.
//
// Output shape:
//   {
//     neurodivergence: 'autistic' | 'adhd' | 'both' | 'other',
//     traits: string[],
//     strengths: string[],
//     accommodations: string[],
//     workStyleProfile: { summary: string, communication: string, environment: string },
//     confidence: number  // 0..1
//   }

import fs from 'fs';
import { llmJson } from '@/lib/llm';

const PRESETS = {
  autistic: {
    traits: ['Attention to detail', 'Pattern recognition', 'Deep focus'],
    strengths: ['Systematic thinking', 'Consistency', 'Honesty and reliability'],
    accommodations: ['Quiet space for focus', 'Written/async updates', 'Clear, structured tasks'],
    workStyleProfile: {
      summary: 'Prefers structured tasks with clear scope and predictable routines.',
      communication: 'Prefers written briefs over verbal updates; may take language literally.',
      environment: 'Low-sensory, quiet space supports sustained deep work.',
    },
  },
  adhd: {
    traits: ['Hyperfocus', 'Creative problem-solving', 'High energy'],
    strengths: ['Rapid ideation', 'Crisis responsiveness', 'Big-picture thinking'],
    accommodations: ['Flexible deadlines', 'Task chunking', 'Movement / break flexibility'],
    workStyleProfile: {
      summary: 'Thrives on varied, stimulating work and short feedback loops.',
      communication: 'Benefits from concise, prioritized asks and frequent check-ins.',
      environment: 'Flexible scheduling and the option to move helps sustain attention.',
    },
  },
  both: {
    traits: ['Attention to detail', 'Hyperfocus', 'Pattern recognition'],
    strengths: ['Systematic thinking', 'Creative problem-solving', 'Sustained focus on interests'],
    accommodations: ['Quiet space', 'Task chunking', 'Written + flexible updates'],
    workStyleProfile: {
      summary: 'Combines structured depth with bursts of creative energy.',
      communication: 'Clear written scope plus short, frequent check-ins works best.',
      environment: 'Low-sensory space with flexible pacing.',
    },
  },
  other: {
    traits: ['Unique cognitive profile'],
    strengths: ['Diverse problem-solving approaches'],
    accommodations: ['Individualized support', 'Open conversation about needs'],
    workStyleProfile: {
      summary: 'Has an individual profile; ask about preferences directly.',
      communication: 'Confirm preferred channels and pacing.',
      environment: 'Adjust based on stated needs.',
    },
  },
};

async function extractText(filePath) {
  const lower = filePath.toLowerCase();
  try {
    if (lower.endsWith('.pdf')) {
      // pdf-parse v2 exposes a PDFParse class.
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: fs.readFileSync(filePath) });
      const data = await parser.getText();
      return data.text || '';
    }
    if (lower.endsWith('.docx')) {
      const mod = await import('mammoth');
      const extractRawText = mod.extractRawText || mod.default?.extractRawText;
      const { value } = await extractRawText({ path: filePath });
      return value || '';
    }
  } catch (err) {
    console.error('genetranslate extract error:', err.message);
  }
  return '';
}

function detectNeurodivergence(text) {
  const t = (text || '').toLowerCase();
  const autism = /autis|asd|asperger/.test(t);
  const adhd = /adhd|attention[- ]deficit|hyperactiv/.test(t);
  if (autism && adhd) return 'both';
  if (autism) return 'autistic';
  if (adhd) return 'adhd';
  return null;
}

function deterministicProfile(text, hint) {
  const nd = detectNeurodivergence(text) || hint || 'other';
  const preset = PRESETS[nd] || PRESETS.other;
  return {
    neurodivergence: nd,
    ...preset,
    confidence: detectNeurodivergence(text) ? 0.6 : 0.3,
  };
}

/**
 * @param {string} filePath  Path to a DECRYPTED PDF/DOCX file.
 * @param {object} [opts]
 * @param {('autistic'|'adhd'|'both'|'other')} [opts.hint]  Known ND, if any.
 * @returns {Promise<object>} PII-free profile.
 */
export async function parseReport(filePath, opts = {}) {
  const text = await extractText(filePath);
  const fallback = deterministicProfile(text, opts.hint);

  // Not enough text to reason over — return the deterministic profile.
  if (!text || text.trim().length < 40) {
    return fallback;
  }

  const system =
    'You are genetranslate, a clinical-to-strengths translator for a neurodivergent hiring platform. ' +
    'Given the text of a diagnostic report, extract a workplace strengths profile. ' +
    'CRITICAL: never include any PII (names, dates, doctor names, addresses, IDs). ' +
    'Only include clinically relevant, workplace-useful information. ' +
    'Respond as JSON with keys: neurodivergence ("autistic"|"adhd"|"both"|"other"), ' +
    'traits (string[]), strengths (string[]), accommodations (string[]), ' +
    'workStyleProfile ({summary, communication, environment}), confidence (0..1).';

  // Cap the text we send; strip excessive whitespace.
  const snippet = text.replace(/\s+/g, ' ').slice(0, 6000);
  const parsed = await llmJson(system, `Diagnostic report text:\n${snippet}`);

  if (!parsed || !parsed.neurodivergence) return fallback;

  // Normalize to the expected shape, backfilling from the preset if needed.
  const nd = ['autistic', 'adhd', 'both', 'other'].includes(parsed.neurodivergence)
    ? parsed.neurodivergence
    : fallback.neurodivergence;
  const preset = PRESETS[nd] || PRESETS.other;
  return {
    neurodivergence: nd,
    traits: Array.isArray(parsed.traits) && parsed.traits.length ? parsed.traits : preset.traits,
    strengths:
      Array.isArray(parsed.strengths) && parsed.strengths.length ? parsed.strengths : preset.strengths,
    accommodations:
      Array.isArray(parsed.accommodations) && parsed.accommodations.length
        ? parsed.accommodations
        : preset.accommodations,
    workStyleProfile:
      parsed.workStyleProfile && parsed.workStyleProfile.summary
        ? parsed.workStyleProfile
        : preset.workStyleProfile,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
  };
}
