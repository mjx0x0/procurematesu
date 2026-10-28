'use strict';

/**
 * Maps specialized official-issuance questions to exact source records.
 * The active retrieval implementation uses bounded keyword searches; these
 * source-scoped targets make important, newer issuances retrievable even when
 * broad terms match older documents first.
 */
function getOfficialIssuanceRetrievalTargets(query) {
  const q = String(query || '');
  const targets = [];
  const add = (matches, documentName, priorityBoost = 1000, limit = 12) => {
    if (matches && !targets.some((item) => item.documentName === documentName)) {
      targets.push({ documentName, priorityBoost, limit });
    }
  };

  const asksForms =
    /\b(?:standard procurement forms?|standard forms?|market scoping form|annual procurement plan|project procurement management plan|ppmp|pbd|philippine bidding documents)\b/i.test(q)
    || (/\bforms?\b/i.test(q) && /\b(?:procurement|bidding|ra\s*\.?\s*12009|market scoping|ppmp|app)\b/i.test(q));
  add(asksForms, 'GPPB Resolution No. 03-2025');

  const asksModeSelection =
    /\bprocurement mode selection\b|\bdecision tree\b/i.test(q)
    || /\bwhich procurement mode\b|\bchoose (?:the )?procurement mode\b|\bselect(?:ing)? a procurement mode\b/i.test(q);
  add(asksModeSelection, 'GPPB Resolution No. 12-2025');

  add(
    /\b(?:sale of bidding documents|bidding documents? (?:fee|fees|price|cost)|standard rate for bidding documents|how much (?:are|is) (?:the )?bidding documents)\b/i.test(q),
    'GPPB Circular No. 02-2026'
  );
  add(
    /\b(?:printing services|recognized government printers?|government printer|National Printing Office|APO Production Unit)\b/i.test(q),
    'GPPB Circular No. 03-2026'
  );
  add(
    /\b(?:tied bids?|tie[- ]breaking|tie-break(?:ing)? method|break a tie between bidders)\b/i.test(q),
    'GPPB Circular No. 04-2026'
  );
  add(
    /\b(?:legal assistance|indemnification|indemnity)\b/i.test(q)
      && /\b(?:BAC|Bids and Awards Committee|TWG|Secretariat|procurement|committee|support staff)\b/i.test(q),
    'GPPB Circular No. 05-2026'
  );
  add(/\bframework agreements?\b/i.test(q), 'GPPB Circular No. 07-2026');
  add(
    /\b(?:disaster preparedness|disaster-related procurement|disaster procurement|emergency procurement|Negotiated Procurement.{0,35}Emergency Cases)\b/i.test(q),
    'GPPB Circular No. 08-2026'
  );
  add(
    /\b(?:election period|BSKE|Barangay and Sangguniang Kabataan elections|election-related procurement)\b/i.test(q),
    'GPPB Circular No. 09-2026'
  );
  add(
    /\b(?:direct procurement for STI|science, technology, and innovation|science technology innovation|STI procurement)\b/i.test(q),
    'GPPB Circular No. 01-2026'
  );

  return targets;
}

module.exports = { getOfficialIssuanceRetrievalTargets };
