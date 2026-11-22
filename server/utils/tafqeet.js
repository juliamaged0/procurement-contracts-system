/**
 * محرك التفقيط المالي باللغة العربية المعتمد للمعاملات الحكومية والعقود
 * Arabic Financial Tafqeet Utility for ASDCO Procurement System
 */

const ones = [
  '', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
  'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر',
  'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'
];

const tens = [
  '', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'
];

const hundreds = [
  '', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'
];

function convertThreeDigits(num) {
  let result = '';
  const h = Math.floor(num / 100);
  const remainder = num % 100;
  const t = Math.floor(remainder / 10);
  const o = remainder % 10;

  if (h > 0) {
    result += hundreds[h];
  }

  if (remainder > 0) {
    if (result.length > 0) result += ' و';

    if (remainder < 20) {
      result += ones[remainder];
    } else {
      if (o > 0) {
        result += ones[o] + ' و' + tens[t];
      } else {
        result += tens[t];
      }
    }
  }

  return result;
}

/**
 * تحويل الأرقام الصحيحة إلى كلمات باللغة العربية
 * @param {number} n 
 * @returns {string}
 */
function integerToWords(n) {
  if (n === 0) return 'صفر';

  const scales = [
    { value: 1000000000, single: 'مليار', pair: 'ملياران', plural: 'مليارات', standard: 'مليار' },
    { value: 1000000, single: 'مليون', pair: 'مليونان', plural: 'ملايين', standard: 'مليون' },
    { value: 1000, single: 'ألف', pair: 'ألفان', plural: 'آلاف', standard: 'ألف' }
  ];

  let current = n;
  const parts = [];

  for (const scale of scales) {
    if (current >= scale.value) {
      const quotient = Math.floor(current / scale.value);
      current = current % scale.value;

      let scaleWord = '';
      if (quotient === 1) {
        scaleWord = scale.single;
      } else if (quotient === 2) {
        scaleWord = scale.pair;
      } else if (quotient >= 3 && quotient <= 10) {
        scaleWord = `${convertThreeDigits(quotient)} ${scale.plural}`;
      } else {
        scaleWord = `${convertThreeDigits(quotient)} ${scale.standard}`;
      }
      parts.push(scaleWord);
    }
  }

  if (current > 0) {
    parts.push(convertThreeDigits(current));
  }

  return parts.join(' و');
}

/**
 * تفقيط المبالغ المالية بالجنيه المصري والقرش
 * @param {number|string} amount المبلغ المالي المراد تفقيطه
 * @returns {string} نص التفقيط الرسمي (مثال: فقط خمسمائة ألف جنيهاً مصرياً لا غير)
 */
function tafqeetCurrency(amount) {
  const num = parseFloat(amount);
  if (isNaN(num) || num < 0) return 'فقط صفر جنيهاً مصرياً لا غير';

  const pounds = Math.floor(num);
  const piasters = Math.round((num - pounds) * 100);

  let result = 'فقط ';

  if (pounds === 0) {
    result += 'صفر جنيه مصري';
  } else if (pounds === 1) {
    result += 'جنيه مصري واحد';
  } else if (pounds === 2) {
    result += 'جنيهان مصريان';
  } else if (pounds >= 3 && pounds <= 10) {
    result += `${integerToWords(pounds)} جنيهات مصرية`;
  } else {
    result += `${integerToWords(pounds)} جنيهاً مصرياً`;
  }

  if (piasters > 0) {
    result += ' و';
    if (piasters === 1) {
      result += 'قرش واحد';
    } else if (piasters === 2) {
      result += 'قرشان';
    } else if (piasters >= 3 && piasters <= 10) {
      result += `${integerToWords(piasters)} قروش`;
    } else {
      result += `${integerToWords(piasters)} قرشاً`;
    }
  }

  result += ' لا غير';
  return result;
}

module.exports = {
  integerToWords,
  tafqeetCurrency
};
