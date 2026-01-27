const cleanAIContent = (text: string | undefined | null): string => {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.startsWith('["') && trimmed.endsWith('"]')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        // Current logic: returns parsed[0]
        return parsed[0];
      }
    } catch (_) {
      return trimmed.slice(2, -2);
    }
  }
  return text;
};

const parseFormattedText = (text: string) => {
  // Old Regex
  // const parts = text.split(/(\*\*.*?\*\*|`.*? `)/g);
  // New Regex
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts;
};

const inputs = [
  '["1. `proxy_pass` 带不带斜杠"]',
  '["1. `proxy_pass`"]',
  '["1. `proxy_pass`..."]',
  `["1. \`proxy_pass\`"]`, // Escaped in JS string
];

inputs.forEach((input) => {
  console.log(`Input: ${input}`);
  const cleaned = cleanAIContent(input);
  console.log(`Cleaned: ${cleaned}`);

  // Simulate Markdown Parsing
  const parts = parseFormattedText(cleaned);
  console.log(`Parts:`, parts);
  console.log('---');
});
