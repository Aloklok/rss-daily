import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../serverSanitize';

describe('serverSanitize (服务端 HTML 清洗)', () => {
  it('应移除 <script> 标签及其内容', () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    expect(sanitizeHtml(input)).toBe('<p>Hello</p>');
  });

  it('应保留允许的标签，如 <img>', () => {
    const input = '<img src="test.jpg" alt="test" />';
    // sanitize-html 可能会微调输出格式（如自闭合标签），所以我们检查包含关系或标准化输出
    // 这里我们简单检查是否包含 img 标签
    expect(sanitizeHtml(input)).toContain('<img');
    expect(sanitizeHtml(input)).toContain('src="test.jpg"');
  });

  it('应保留白名单内的 <iframe> 属性', () => {
    const input = '<iframe src="https://youtube.com/embed/xyz" width="500" height="300"></iframe>';
    const output = sanitizeHtml(input);
    expect(output).toContain('iframe');
    expect(output).toContain('src="https://youtube.com/embed/xyz"');
    expect(output).toContain('width="500"'); // 验证允许的属性被保留
  });

  it('应移除不在白名单内的危险属性 (如 onclick)', () => {
    const input = '<a href="#" onclick="stealCookies()">Click me</a>';
    const output = sanitizeHtml(input);
    expect(output).toContain('<a href="#">');
    expect(output).not.toContain('onclick');
  });

  it('处理空输入应返回空字符串', () => {
    expect(sanitizeHtml('')).toBe('');
    // @ts-expect-error -- Intentionally testing invalid input
    expect(sanitizeHtml(null)).toBe('');
  });
});
