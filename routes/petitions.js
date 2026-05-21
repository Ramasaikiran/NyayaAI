const express = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../utils/supabase');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Generate case ID
function genCaseId() {
  return 'NYA-' + Date.now().toString(36).toUpperCase();
}

// ── GENERATE PETITION (AI) ────────────────────────────────────
router.post('/generate', auth, async (req, res) => {
  try {
    const {
      case_type, case_label, complainant, opponent,
      court, facts, relief, amount, incident_date, docs_available
    } = req.body;

    if (!facts || !relief) return res.status(400).json({ error: 'Case facts and relief are required' });

    // Call Anthropic API
    const prompt = `You are a senior Indian legal drafter. Return ONLY a JSON object — no markdown, no backticks — with these exact keys:
"draft": string, "suggestions": array of 5 strings, "strength": number 1-10,
"strengthItems": array of 4 {text,type} where type is "good"/"warn"/"bad",
"sections": array of 2-4 {section,confidence} where confidence is "high"/"verify"/"consult"

CASE: ${case_label}
COMPLAINANT: ${complainant.name}, S/O ${complainant.father||'[father]'}, Age ${complainant.age||'[age]'}, ${complainant.occupation||'[occupation]'}, ${complainant.address}, Ph: ${complainant.phone}${complainant.email?', '+complainant.email:''}
OPPOSITE PARTY: ${opponent.name} (${opponent.role||'party'}), ${opponent.address||'[address]'}
COURT: ${court}
AMOUNT: ${amount||'not specified'}
INCIDENT DATE: ${incident_date||'not specified'}
FACTS: ${facts}
RELIEF: ${relief}
DOCUMENTS AVAILABLE: ${(docs_available||[]).join(', ')||'none'}

DRAFT RULES: Complete formal petition, Indian court format, numbered paragraphs, correct BNS/BNSS 2023. For missing facts write [TO BE FILLED BY COMPLAINANT: what is needed] — NEVER invent specifics. End with prayer clause, verification with note: "NOTE: This verification is a legal oath under Section 193 BNS."
SUGGESTIONS: 5 items: legal strength/weakness, missing document, filing tip, rejection risk, strategic tip. 1-2 sentences each.`;

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const aiData = await aiRes.json();
    const raw = aiData.content?.map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (e) {
      parsed = {
        draft: raw,
        suggestions: ['Verify all legal sections.', 'Attach all documents.', 'File within limitation period.', 'Get lawyer review.', 'Strengthen evidence.'],
        strength: 5,
        strengthItems: [{ text: 'Facts provided', type: 'good' }, { text: 'Sections need verification', type: 'warn' }, { text: 'Documents may be incomplete', type: 'warn' }, { text: 'Lawyer review recommended', type: 'bad' }],
        sections: [{ section: 'BNS 2023', confidence: 'verify' }]
      };
    }

    // Save petition to DB
    const case_id = genCaseId();
    const { data: petition, error } = await supabase.from('petitions').insert({
      case_id,
      user_id: req.user.id,
      case_type,
      case_label,
      complainant,
      opponent,
      court,
      facts,
      relief,
      amount,
      incident_date: incident_date || null,
      docs_available: docs_available || [],
      draft_text: parsed.draft,
      strength_score: parsed.strength,
      suggestions: { items: parsed.suggestions, strengthItems: parsed.strengthItems, sections: parsed.sections },
      status: 'draft'
    }).select().single();

    if (error) throw error;

    res.json({ petition_id: petition.id, case_id, ...parsed });
  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: 'Failed to generate petition' });
  }
});

// ── GET ALL PETITIONS FOR USER ────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('petitions')
      .select('id, case_id, case_label, case_type, opponent, court, status, strength_score, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ petitions: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch petitions' });
  }
});

// ── GET SINGLE PETITION ───────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('petitions')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Petition not found' });
    res.json({ petition: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch petition' });
  }
});

// ── DELETE PETITION ───────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('petitions').delete().eq('id', req.params.id).eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Petition deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete petition' });
  }
});

module.exports = router;
