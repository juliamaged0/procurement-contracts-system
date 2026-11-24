/**
 * High-performance client-side Mojibake detector and Arabic decoder.
 * Converts Windows-1252/Latin-1 misinterpreted UTF-8 Arabic bytes (e.g. ØªØ¹Ø§Ù‚Ø¯Ø§Øª)
 * back to native, crystal-clear Arabic text (تعاقدات).
 */

const WIN1252_MAP = {
  '\u20AC': 0x80, '\u201A': 0x82, '\u0192': 0x83, '\u201E': 0x84, '\u2026': 0x85,
  '\u2020': 0x86, '\u2021': 0x87, '\u02C6': 0x88, '\u2030': 0x89, '\u0160': 0x8A,
  '\u2039': 0x8B, '\u0152': 0x8C, '\u017D': 0x8E, '\u2018': 0x91, '\u2019': 0x92,
  '\u201C': 0x93, '\u201D': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
  '\u02DC': 0x98, '\u2122': 0x99, '\u0161': 0x9A, '\u203A': 0x9B, '\u0153': 0x9C,
  '\u017E': 0x9E, '\u0178': 0x9F
};

const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

export function fixMojibake(str) {
  if (!str || typeof str !== 'string') return str;
  // If string contains no character in the Latin-1 / Windows-1252 extended range, return directly
  if (!/[\u00C0-\u00FF\u2018-\u2026\u0152-\u017E]/.test(str)) return str;

  try {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (WIN1252_MAP[ch] !== undefined) {
        bytes.push(WIN1252_MAP[ch]);
      } else {
        const code = ch.charCodeAt(0);
        if (code <= 0xFF) {
          bytes.push(code);
        } else {
          // Contains a real non-Latin Unicode character, not pure mojibake
          return str;
        }
      }
    }

    const decoded = utf8Decoder.decode(new Uint8Array(bytes));
    // If decoding generated Arabic characters (\u0600-\u06FF) without errors, return decoded text
    if (/[\u0600-\u06FF]/.test(decoded)) {
      return decoded;
    }
  } catch (err) {
    // Decoding failed, keep original string
  }
  return str;
}

export function sanitizeMojibake(data) {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    // If it's a JSON array or object string, parse, sanitize, and re-stringify
    if ((data.startsWith('[') && data.endsWith(']')) || (data.startsWith('{') && data.endsWith('}'))) {
      try {
        const parsed = JSON.parse(data);
        const cleaned = sanitizeMojibake(parsed);
        return JSON.stringify(cleaned);
      } catch (e) {
        return fixMojibake(data);
      }
    }
    return fixMojibake(data);
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeMojibake);
  }
  if (typeof data === 'object') {
    const res = {};
    for (const key of Object.keys(data)) {
      res[key] = sanitizeMojibake(data[key]);
    }
    return res;
  }
  return data;
}

export default fixMojibake;
