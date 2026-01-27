const cleanMessageContent = (content: string): string => {
  if (!content) return '';

  let cleaned = content;

  // 1. Split merged citations (unchanged)
  cleaned = cleaned.replace(/\[((?:\d+(?:\.\d+)?\s*,\s*)+\d+(?:\.\d+)?\s*)\]/g, (match, inner) => {
    return inner
      .split(',')
      .map((n: string) => `[${n.trim()}]`)
      .join('');
  });

  // 2. Core Logic

  // Rule A: Paired quotes inside bold (allow optional space)
  cleaned = cleaned.replace(/\*\*\s*["“(\uFF08](.*?)["”)\uFF09](.*?)\*\*/g, '**$1$2**');

  // Rule B: Fallback stripping (allow optional space)
  cleaned = cleaned.replace(/\*\*\s*["“(\uFF08]+/g, '**');
  cleaned = cleaned.replace(/["”)\uFF09]+\s*\*\*/g, '**');

  return cleaned;
};

// Test Cases derived from User Report
const cases = [
  {
    input: '**“AI落地”这条主线上的所有关键组件**',
    expected: '**AI落地这条主线上的所有关键组件**',
  },
  {
    input: '**（推理代工**',
    expected: '**推理代工**', // Assuming closing ** is implicit or later? User's text was cutoff? Assuming standard bold usage: **（推理代工**
  },
  {
    input: '**“可控性问题**', // Dangling start quote
    expected: '**可控性问题**',
  },
  {
    input: '**“可控性问题”**', // Standard paired
    expected: '**可控性问题**',
  },
  {
    input: '** “AI落地”这条主线上的所有关键组件**', // Space after **
    expected: '**AI落地这条主线上的所有关键组件**',
  },
  {
    input: '**“AI落地” 这条主线上的所有关键组件**', // Space inside suffix
    expected: '**AI落地 这条主线上的所有关键组件**',
  },
  {
    input: '__“AI落地”__', // Underscore bold
    expected: '__AI落地__', // Should it handle underscores?
  },
];

cases.forEach((c, i) => {
  const actual = cleanMessageContent(c.input);
  console.log(`Case ${i + 1}:`);
  console.log(`Input:    ${c.input}`);
  console.log(`Output:   ${actual}`);
  console.log(`Expected: ${c.expected}`);
  console.log(`Pass:     ${actual === c.expected ? '✅' : '❌'}`);
  console.log('---');
});
