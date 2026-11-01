const PROCUREMENT_OFFICE_LOCATION_RESPONSE = [
  '📍 **MSU-GenSan Procurement Management Office**',
  '',
  'The Procurement Office is temporarily located at the **Science and Technology Training Center (STTC)**.',
  '',
  'It is operating there because the **Y-Building was damaged by the earthquake**. Please visit STTC for Procurement Office transactions and inquiries until further notice.',
  '',
  'For directory information, the Procurement Management Office is under the Office of the Vice Chancellor for Administration and Finance. The university directory lists **Assoc. Prof. Nelson P. Benares, Jr.** as Director and **0908-810-5634** as the office contact number.',
  '',
  'The directory separately lists the campus address as **Fatima, General Santos City, South Cotabato, Philippines, 9500**. This is the campus address; the current temporary Procurement Office location is STTC.',
].join('\n');

function buildProcurementOfficeLocationResponse() {
  return {
    response: PROCUREMENT_OFFICE_LOCATION_RESPONSE,
    sources: [
      'MSU-GenSan Procurement Office location update',
      'MSU-GenSan University Directory',
    ],
  };
}

module.exports = { buildProcurementOfficeLocationResponse };
