const WIN1252_MAP = {
  '\u20AC': 0x80, '\u201A': 0x82, '\u0192': 0x83, '\u201E': 0x84, '\u2026': 0x85,
  '\u2020': 0x86, '\u2021': 0x87, '\u02C6': 0x88, '\u2030': 0x89, '\u0160': 0x8A,
  '\u2039': 0x8B, '\u0152': 0x8C, '\u017D': 0x8E, '\u2018': 0x91, '\u2019': 0x92,
  '\u201C': 0x93, '\u201D': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
  '\u02DC': 0x98, '\u2122': 0x99, '\u0161': 0x9A, '\u203A': 0x9B, '\u0153': 0x9C,
  '\u017E': 0x9E, '\u0178': 0x9F
};

function fixMojibake(str) {
  if (!str || typeof str !== 'string') return str;
  if (!/[\u00C0-\u00FF\u2018-\u2026]/.test(str)) return str;
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
          return str;
        }
      }
    }
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
    if (/[\u0600-\u06FF]/.test(decoded)) {
      return decoded;
    }
  } catch (e) {}
  return str;
}

const tests = [
  'ØªØ¹Ø§Ù‚Ø¯Ø§Øª',
  'ØªÙˆØ±ÙŠØ¯Ø§Øª',
  'Ù…Ù†Ø§Ù‚ØµØ© Ø¹Ø§Ù…Ø©',
  'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø´Ø±ÙˆØ¹Ø§Øª'
];

tests.forEach(t => console.log(t, '===>', fixMojibake(t)));
