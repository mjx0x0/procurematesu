const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildProcurementOfficeLocationResponse,
} = require('../../lib/procurement-office-location.js');

test('Procurement Office location response identifies STTC as temporary location and explains why', () => {
  const result = buildProcurementOfficeLocationResponse();

  assert.ok(result.response.includes('Science and Technology Training Center (STTC)'));
  assert.match(result.response, /Y-Building was damaged by the earthquake/i);
  assert.match(result.response, /until further notice/i);
  assert.ok(result.response.includes('Assoc. Prof. Nelson P. Benares, Jr.'));
  assert.ok(result.response.includes('0908-810-5634'));
  assert.match(result.response, /campus address; the current temporary Procurement Office location is STTC/i);
  assert.deepEqual(result.sources, [
    'MSU-GenSan Procurement Office location update',
    'MSU-GenSan University Directory',
  ]);
  assert.doesNotMatch(result.response, /please confirm the current temporary office assignment/i);
});
