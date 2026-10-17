import { describe, it, expect } from 'vitest';
import { parseHttpRange, formatContentDisposition } from '../services/download.service.js';

describe('HTTP Range & Content-Disposition Handling', () => {
  const FILE_SIZE = 10000; // 10,000 bytes (0 - 9999)

  describe('parseHttpRange', () => {
    it('returns isRange: false when no Range header is provided', () => {
      const result = parseHttpRange('', FILE_SIZE);
      expect(result.valid).toBe(true);
      expect(result.isRange).toBe(false);
      expect(result.range).toBeUndefined();
    });

    it('parses standard range bytes=0-499', () => {
      const result = parseHttpRange('bytes=0-499', FILE_SIZE);
      expect(result.valid).toBe(true);
      expect(result.isRange).toBe(true);
      expect(result.range).toEqual({
        start: 0,
        end: 499,
        chunkSize: 500,
      });
    });

    it('parses open-ended range bytes=5000-', () => {
      const result = parseHttpRange('bytes=5000-', FILE_SIZE);
      expect(result.valid).toBe(true);
      expect(result.isRange).toBe(true);
      expect(result.range).toEqual({
        start: 5000,
        end: 9999,
        chunkSize: 5000,
      });
    });

    it('parses suffix range bytes=-500 (last 500 bytes)', () => {
      const result = parseHttpRange('bytes=-500', FILE_SIZE);
      expect(result.valid).toBe(true);
      expect(result.isRange).toBe(true);
      expect(result.range).toEqual({
        start: 9500,
        end: 9999,
        chunkSize: 500,
      });
    });

    it('handles single-byte range bytes=0-0', () => {
      const result = parseHttpRange('bytes=0-0', FILE_SIZE);
      expect(result.valid).toBe(true);
      expect(result.isRange).toBe(true);
      expect(result.range).toEqual({
        start: 0,
        end: 0,
        chunkSize: 1,
      });
    });

    it('rejects range where start > end', () => {
      const result = parseHttpRange('bytes=500-200', FILE_SIZE);
      expect(result.valid).toBe(false);
      expect(result.isRange).toBe(true);
      expect(result.error).toContain('Range Not Satisfiable');
    });

    it('rejects range exceeding file size', () => {
      const result = parseHttpRange('bytes=10000-12000', FILE_SIZE);
      expect(result.valid).toBe(false);
      expect(result.isRange).toBe(true);
      expect(result.error).toContain('Range Not Satisfiable');
    });

    it('rejects negative start values or non-numeric tokens', () => {
      const result = parseHttpRange('bytes=-abc', FILE_SIZE);
      expect(result.valid).toBe(false);
      expect(result.isRange).toBe(true);
    });

    it('rejects multipart ranges', () => {
      const result = parseHttpRange('bytes=0-100, 200-300', FILE_SIZE);
      expect(result.valid).toBe(false);
      expect(result.isRange).toBe(true);
      expect(result.error).toContain('Multiple ranges');
    });
  });

  describe('formatContentDisposition', () => {
    it('produces safe ASCII and RFC 5987 UTF-8 encoded disposition', () => {
      const disposition = formatContentDisposition('my file 2026.pdf', 'inline');
      expect(disposition).toContain('inline;');
      expect(disposition).toContain('filename="my file 2026.pdf"');
      expect(disposition).toContain("filename*=UTF-8''my%20file%202026.pdf");
    });

    it('neutralizes header injection attempts with CRLF and quotes', () => {
      const maliciousName = 'file\r\nSet-Cookie: evil=1\r\n"inject".txt';
      const disposition = formatContentDisposition(maliciousName, 'attachment');

      // Crucial: no raw \r or \n or raw unescaped double quotes that could split HTTP headers!
      expect(disposition).not.toContain('\r');
      expect(disposition).not.toContain('\n');
      expect(disposition).toContain('attachment;');
    });

    it('handles unicode filenames gracefully', () => {
      const unicodeName = 'レポート_2026_🔥.zip';
      const disposition = formatContentDisposition(unicodeName, 'attachment');

      expect(disposition).toContain("filename*=UTF-8''");
      expect(disposition).toContain(encodeURIComponent(unicodeName));
    });
  });
});
