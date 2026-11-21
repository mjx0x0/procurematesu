/**
 * Language support for Gab AI.
 *
 * Translation is deliberately a presentation-only operation: it receives the
 * latest persisted assistant answer and must preserve its legal meaning,
 * citations, URLs, section numbers, amounts, and qualifications.
 */
export function isTagalogTranslationRequest(message: string): boolean {
  const text = message.normalize('NFKC').toLowerCase().trim();
  return /(?:\b(?:tagalog|filipino)\b| \b(?:isalin|itranslate|translate|salin)\b).{0,70}\b(?:tagalog|filipino|ito|iyan|po|naman)\b|\b(?:tagalog|filipino)\b.{0,70}\b(?:please|pls|naman|po|mo|version|translation|salin)\b|\b(?:paki(?:[- ]?)?translate|isalin\s+mo|pwede\s+bang\s+isalin|maaari\s+bang\s+isalin)\b/i.test(text);
}

export function buildTagalogTranslationPrompt(answer: string): string {
  return [
    'Translate the assistant answer below into clear, natural Filipino/Tagalog for a Philippine university user.',
    'This is a faithful translation, not a new answer and not new legal research.',
    'Preserve every factual claim, legal qualification, caveat, amount, date, section/subsection number, document title, citation, Markdown structure, and source URL.',
    'Do not add, remove, strengthen, weaken, or reinterpret any procurement rule.',
    'Keep official document names, Republic Act numbers, acronyms, procurement terms, and URLs in their original form where translating them could reduce precision; briefly explain a technical term in Tagalog only when the source already explains it.',
    'Return only the translated answer. If the source is already in Tagalog, return it unchanged.',
    '',
    '<ASSISTANT_ANSWER>',
    answer,
    '</ASSISTANT_ANSWER>',
  ].join('\n');
}
