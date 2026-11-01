const PROCUREMENT_OFFICE_LOCATION_RESPONSE = [
  '📍 **MSU-GenSan Procurement Management Office**',
  '',
  'The Procurement Office is temporarily located at the **Science and Technology Training Center (STTC)**.',
  '',
  'It is operating there because the **Y-Building was damaged by the earthquake**. Please visit STTC for Procurement Office transactions and inquiries until further notice.',
].join('\n');

function buildProcurementOfficeLocationResponse() {
  return {
    response: PROCUREMENT_OFFICE_LOCATION_RESPONSE,
    sources: ['MSU-GenSan Procurement Office location update'],
  };
}

module.exports = { buildProcurementOfficeLocationResponse };
