const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildProcurementOfficeLocationResponse,
} = require('../../lib/procurement-office-location.js');

test('Procurement Office location response identifies STTC as the temporary location and explains why', () => {
  const result = buildProcurementOfficeLocationResponse();

  assert.match(result.response, /Science and Technology Training Center \\(STTC\\)/i);
  assert.match(result.response, /Y-Building was damaged by the earthquake/i);
  assert.match(result.response, /until further notice/i);
  assert.deepEqual(result.sources, ['MSU-GenSan Procurement Office location update']);
  assert.doesNotMatch(result.response, /please confirm the current temporary office assignment/i);
});
