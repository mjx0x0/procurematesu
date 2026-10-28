'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getOfficialIssuanceRetrievalTargets } = require('../../lib/procurement-issuance-intents.js');

function names(query) {
  return getOfficialIssuanceRetrievalTargets(query).map((target) => target.documentName);
}

test('standard procurement forms questions scope to Resolution No. 03-2025', () => {
  assert.deepEqual(
    names('When did the standard procurement forms become mandatory under RA 12009?'),
    ['GPPB Resolution No. 03-2025'],
  );
  assert.deepEqual(
    names('What forms should an SUC use for procurement under RA 12009?'),
    ['GPPB Resolution No. 03-2025'],
  );
});

test('procurement mode selection and decision-tree questions scope to Resolution No. 12-2025', () => {
  assert.deepEqual(
    names('What does the Procurement Mode Selection Decision Tree do?'),
    ['GPPB Resolution No. 12-2025', 'Implementing Rules and Regulations of RA 12009'],
  );
  assert.deepEqual(
    names('Which procurement mode should we examine?'),
    ['GPPB Resolution No. 12-2025', 'Implementing Rules and Regulations of RA 12009'],
  );
});


test('IRR edition/withdrawal questions retrieve the actual Public Advisory and approved IRR', () => {
  assert.deepEqual(
    names('Which version of the Implementing Rules and Regulations of RA No. 12009 should MSU-General Santos use? Explain the status of the March 2026 edition and cite the official GPPB advisory and approved IRR.'),
    ['GPPB Public Advisory No. 09-2026', 'Implementing Rules and Regulations of RA 12009'],
  );
  assert.deepEqual(
    names('Was the March 2026 IRR edition of RA No. 12009 withdrawn?'),
    ['GPPB Public Advisory No. 09-2026', 'Implementing Rules and Regulations of RA 12009'],
  );
});


test('standard-forms questions retrieve Resolution No. 03-2025 directly', () => {
  assert.deepEqual(
    names('When did the new Standard Procurement Forms become mandatory, and what GPPB resolution approved them?'),
    ['GPPB Resolution No. 03-2025'],
  );
});

test('SVP threshold questions retrieve the approved IRR Section 34', () => {
  assert.deepEqual(
    names('What is the Small Value Procurement threshold under RA No. 12009 and how many quotations are required?'),
    ['Implementing Rules and Regulations of RA 12009'],
  );
});

test('SVP documentary questions retrieve both Section 34 and Circular No. 06-2026', () => {
  assert.deepEqual(
    names('For an SUC using Small Value Procurement, explain the threshold and applicable supplier documents.'),
    ['Implementing Rules and Regulations of RA 12009', 'GPPB Circular No. 06-2026'],
  );
});


test('procurement modes list questions retrieve Resolution No. 12-2025 and the approved IRR', () => {
  assert.deepEqual(
    names('What procurement modes are available under RA No. 12009?'),
    ['GPPB Resolution No. 12-2025', 'Implementing Rules and Regulations of RA 12009'],
  );
});

test('bidding-document fee questions scope to Circular No. 02-2026', () => {
  assert.deepEqual(
    names('What is the standard rate for bidding documents?'),
    ['GPPB Circular No. 02-2026'],
  );
});

test('the exact hyphenated bidding-document fee prompt routes to Circular No. 02-2026', () => {
  assert.deepEqual(
    names('Give all maximum bidding-document fees under GPPB Circular No. 02-2026 by Approved Budget for the Contract (ABC) range. Are these fees mandatory?'),
    ['GPPB Circular No. 02-2026'],
  );
});

test('printing-services questions scope to Circular No. 03-2026', () => {
  assert.deepEqual(
    names('Can an SUC use private printers for printing services?'),
    ['GPPB Circular No. 03-2026'],
  );
});

test('tied-bid questions scope to Circular No. 04-2026', () => {
  assert.deepEqual(
    names('What tie-breaking method applies to tied bids?'),
    ['GPPB Circular No. 04-2026'],
  );
});

test('BAC legal assistance and indemnification questions scope to Circular No. 05-2026', () => {
  assert.deepEqual(
    names('What legal assistance and indemnification applies to BAC support staff?'),
    ['GPPB Circular No. 05-2026'],
  );
});

test('framework agreement questions scope to Circular No. 07-2026', () => {
  assert.deepEqual(
    names('When can a procuring entity use a framework agreement?'),
    ['GPPB Circular No. 07-2026'],
  );
});

test('disaster and emergency procurement questions scope to Circular No. 08-2026', () => {
  assert.deepEqual(
    names('What rules apply to disaster preparedness procurement and emergency procurement?'),
    ['GPPB Circular No. 08-2026'],
  );
});

test('election-period questions scope to Circular No. 09-2026', () => {
  assert.deepEqual(
    names('What restrictions apply during the 2026 BSKE election period?'),
    ['GPPB Circular No. 09-2026'],
  );
});

test('science, technology, and innovation procurement questions scope to Circular No. 01-2026', () => {
  assert.deepEqual(
    names('What conditions apply to direct procurement for science, technology, and innovation?'),
    ['GPPB Circular No. 01-2026'],
  );
});

test('multi-intent prompts preserve distinct authoritative sources without duplicates', () => {
  assert.deepEqual(
    names('Explain standard procurement forms and when a framework agreement is appropriate.'),
    ['GPPB Resolution No. 03-2025', 'GPPB Circular No. 07-2026'],
  );
});

test('unrelated MSU purchase-request status question does not trigger specialized issuance retrieval', () => {
  assert.deepEqual(
    names('How can I check the status of my purchase request?'),
    [],
  );
});

test('target objects carry deterministic priority and source limits', () => {
  const targets = getOfficialIssuanceRetrievalTargets('What is the procurement mode selection decision tree?');
  assert.equal(targets.length, 2);
  assert.equal(targets[0].documentName, 'GPPB Resolution No. 12-2025');
  assert.equal(targets[0].priorityBoost, 1700);
  assert.equal(targets[0].limit, 8);
});
