import { describe, it, expect } from 'vitest';
import {
  cleanAIContent,
  stripLeadingTitle,
  cleanGeminiJson,
  removeEmptyParagraphs,
} from '../contentUtils';

describe('contentUtils (内容处理工具)', () => {
  describe('removeEmptyParagraphs', () => {
    it('应移除空的 p 标签', () => {
      expect(removeEmptyParagraphs('<p></p>')).toBe('');
    });

    it('应移除只包含非中断空格(&nbsp;)的 p 标签', () => {
      expect(removeEmptyParagraphs('<p>&nbsp;</p>')).toBe('');
      expect(removeEmptyParagraphs('<p>&nbsp;&nbsp;</p>')).toBe('');
    });

    it('应移除只包含普通空格的 p 标签', () => {
      expect(removeEmptyParagraphs('<p> </p>')).toBe('');
      expect(removeEmptyParagraphs('<p>   </p>')).toBe('');
    });

    it('应移除包含 <br> 的空段落 (根据目前的正则逻辑)', () => {
      // Regex: (?:&nbsp;|\s|<br\s*\/?>)*
      expect(removeEmptyParagraphs('<p><br></p>')).toBe('');
      expect(removeEmptyParagraphs('<p><br/></p>')).toBe('');
    });

    it('不应移除有实际内容的 p 标签', () => {
      expect(removeEmptyParagraphs('<p>Content</p>')).toBe('<p>Content</p>');
      expect(removeEmptyParagraphs('<p> Content </p>')).toBe('<p> Content </p>'); // 空格包围的内容也不算空
    });

    it('应保留虽然包含空内容但有重要内容的 p', () => {
      // 比如如果是图片？目前正则 <p[^>]*>...<\/p> 会匹配所有属性
      // 如果内容只有 img?
      // Regex (?:&nbsp;|\s|<br\s*\/?>)* 只匹配空白和br
      // 所以 <p><img src=""/></p> 不会被匹配，会被保留。这是预期的。
      expect(removeEmptyParagraphs('<p><img src="foo.jpg"/></p>')).toBe(
        '<p><img src="foo.jpg"/></p>',
      );
    });
  });

  describe('cleanAIContent', () => {
    it('当输入是普通字符串时，应原样返回', () => {
      expect(cleanAIContent('Hello World')).toBe('Hello World');
    });

    it('当输入是像 JSON 数组的字符串时，应清洗掉数组包装', () => {
      // 模拟 Gemini API 经常返回这种带 ["..."] 的奇怪格式
      expect(cleanAIContent('["Key Insight 1.", "Key Insight 2."]')).toBe(
        'Key Insight 1.\n\nKey Insight 2.',
      );
    });

    it('当输入是真正的数组时，应连接为字符串', () => {
      expect(cleanAIContent(['Point 1', 'Point 2'])).toBe('Point 1\n\nPoint 2');
    });

    it('应能处理数组中的非字符串项（过滤掉）', () => {
      expect(cleanAIContent(['Valid String', 123, null])).toBe('Valid String');
    });

    it('当输入为空或 undefined 时，应返回空字符串', () => {
      expect(cleanAIContent(null)).toBe('');
      expect(cleanAIContent(undefined)).toBe('');
    });

    it('当 JSON 格式错误时，应回退到简单的字符串移除逻辑', () => {
      // 只有前括号没有后括号，或者无法 parse，但我们仍想尝试去掉头尾的 [" "]
      expect(cleanAIContent('["Broken JSON')).toBe('Broken JSON');
    });
  });

  describe('stripLeadingTitle', () => {
    it('当文章开头包含与标题重复的 H1 时，应移除该 H1', () => {
      const title = 'My Great Post';
      const content = `<h1>My Great Post</h1><p>Real content starts here.</p>`;
      // 期望 H1 被移除
      expect(stripLeadingTitle(content, title)).toBe('<p>Real content starts here.</p>');
    });

    it('当文章开头的 H1 包含标题关键词时，也应移除', () => {
      const title = 'Gemini 2.0';
      const content = `<h1>Google Releases Gemini 2.0 Today</h1><p>Content.</p>`;
      expect(stripLeadingTitle(content, title)).toBe('<p>Content.</p>');
    });

    it('当文章开头是纯文本重复标题时，应移除重复部分', () => {
      const title = 'Simple Title';
      const content = `Simple Title \n <p>Content after title.</p>`;
      // 注意：这个函数的实现逻辑是替换掉开头的文本
      expect(stripLeadingTitle(content, title).trim()).toBe('<p>Content after title.</p>');
    });

    it('当标题没有重复时，应保持原样', () => {
      expect(stripLeadingTitle('<p>Just content.</p>', 'Different Title')).toBe(
        '<p>Just content.</p>',
      );
    });
  });

  describe('cleanGeminiJson', () => {
    it('应移除 Markdown 代码块标记', () => {
      const raw = '```json\n{"foo":"bar"}\n```';
      expect(cleanGeminiJson(raw)).toBe('{"foo":"bar"}');
    });

    it('应移除仅有 ``` 的代码块标记', () => {
      const raw = '```\n[1, 2]\n```';
      expect(cleanGeminiJson(raw)).toBe('[1, 2]');
    });

    it('当没有代码块时应保留原文本', () => {
      const raw = '{"foo":"bar"}';
      expect(cleanGeminiJson(raw)).toBe('{"foo":"bar"}');
    });
  });
});
