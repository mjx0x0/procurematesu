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

  // Version/withdrawal questions must cite the actual July 2026 Public Advisory,
  // not Circular No. 01-2025 (which concerns transition rules under RA 12009).
  const asksCurrentIrrEdition =
    /\b(?:which|what)\s+(?:version|edition)\b/i.test(q)
      && /\b(?:IRR|implementing rules and regulations)\b/i.test(q)
      && /\b12009\b/i.test(q)
    || /\b(?:march|31 march)\s+2026\b/i.test(q)
      && /\b(?:IRR|implementing rules and regulations)\b/i.test(q)
      && /\b12009\b/i.test(q)
    || /\b(?:withdrawn|withdrawal|no longer use|should no longer be used)\b/i.test(q)
      && /\b(?:IRR|implementing rules and regulations)\b/i.test(q)
      && /\b12009\b/i.test(q);
  add(asksCurrentIrrEdition, 'GPPB Public Advisory No. 09-2026', 1800, 4);
  add(asksCurrentIrrEdition, 'Implementing Rules and Regulations of RA 12009', 1400, 8);

  const asksModeSelection =
    /\bprocurement mode selection\b|\bdecision tree\b/i.test(q)
    || /\bwhich procurement mode\b|\bchoose (?:the )?procurement mode\b|\bselect(?:ing)? a procurement mode\b/i.test(q)
    || /\b(?:what|which|list|name)\b.{0,45}\b(?:procurement modes|modes of procurement)\b/i.test(q)
    || /\b(?:available|allowed|recognized|possible) procurement modes\b/i.test(q);
  add(asksModeSelection, 'GPPB Resolution No. 12-2025', 1700, 8);
  add(
    asksModeSelection,
    'Implementing Rules and Regulations of RA 12009',
    1350,
    8
  );

  // SVP answers are cross-source: Section 34 of the approved IRR controls the
  // method procedure; Circular 06-2026 only supplies supplementary documents.
  const asksSvp =
    /\b(?:small value procurement|\bSVP\b)\b/i.test(q)
    || (/\b(?:supplier|price) quotations?\b/i.test(q)
      && /\b(?:threshold|posting|supplier documents|eligibility documents|documentary requirements)\b/i.test(q));
  const asksSvpDocuments = asksSvp
    && /\b(?:documentary requirements?|eligibility documents?|supplier documents?|documents? to submit|required documents?|document checklist)\b/i.test(q);
  add(asksSvp, 'Implementing Rules and Regulations of RA 12009', asksSvpDocuments ? 1500 : 1250, 10);
  add(asksSvpDocuments, 'GPPB Circular No. 06-2026', 1850, 10);

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
