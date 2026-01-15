
import assert from 'assert';

const CITATION_REGEX = /(\[\s*\d+(?:\.\d+)?\s*\]|[¹²³⁴⁵⁶⁷⁸⁹⁰]+)/g;

const cleanMessageContent = (content) => {
  if (!content) return '';

  let cleaned = content;

  // 1. 拆分合并的引用
  cleaned = cleaned.replace(
    /\[((?:\d+(?:\.\d+)?\s*(?:,|，|\s)\s*)+\d+(?:\.\d+)?\s*)\]/g,
    (match, inner) => {
      return inner
        .split(/[,，\s]/)
        .filter((n) => n.trim())
        .map((n) => `[${n.trim()}]`)
        .join('');
    },
  );

  // 2. 移除加粗内部符号
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, (match, innerContent) => {
    const cleanInner = innerContent.replace(/["“(\uFF08"”)\uFF09]/g, ' ').trim();
    return `**${cleanInner}**`;
  });

  // 3. 引用去重逻辑 (全文去重)
  const seenIndices = new Set();

  // a. 连续重复去重
  cleaned = cleaned.replace(/(\[\d+(?:\.\d+)?\])\s*\1+/g, '$1');

  // b. 全文去重
  cleaned = cleaned.replace(/\[(\d+(?:\.\d+)?)\]/g, (match, id) => {
    if (seenIndices.has(id)) {
      return ''; 
    }
    seenIndices.add(id);
    return match;
  });

  return cleaned;
};

// Test cases
try {
  console.log('Running tests...');

  // Test 1: Single citation
  assert.strictEqual(cleanMessageContent('Test [1].'), 'Test [1].');
  console.log('✅ Test 1 passed');

  // Test 2: Duplicate removal
  assert.strictEqual(cleanMessageContent('First [1]. Second [1].'), 'First [1]. Second .');
  console.log('✅ Test 2 passed');

  // Test 3: Consecutive removal
  assert.strictEqual(cleanMessageContent('Double [1][1].'), 'Double [1].');
  console.log('✅ Test 3 passed');

  // Test 4: Split citations
  assert.strictEqual(cleanMessageContent('Split [1, 2].'), 'Split [1][2].');
  console.log('✅ Test 4 passed');
  
  // Test 5: Mixed complex case
  const complexInput = 'Start [1]. Then [2]. Again [1]. Finally [1, 2].';
  const expectedOutput = 'Start [1]. Then [2]. Again . Finally .';
  assert.strictEqual(cleanMessageContent(complexInput), expectedOutput);
  console.log('✅ Test 5 passed');

  console.log('🎉 All tests passed!');
} catch (e) {
  console.error('❌ Test failed:', e.message);
  console.error('Expected:', e.expected);
  console.error('Actual:', e.actual);
  process.exit(1);
}
