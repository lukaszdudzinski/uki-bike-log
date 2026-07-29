export interface OcrResult {
  total: number;
  liters: number;
  pricePerLiter: number;
  date: string;
}

export function parseReceiptText(text: string): OcrResult {
  const upperText = text.toUpperCase();
  
  let extTotal = 0;
  let extLiters = 0;
  let extPricePerLiter = 0;
  let extDate = "";

  // 1. Total (e.g. SUMA: PLN 45.83 or DO ZAPŁATY: 45.83)
  const sumMatch = upperText.match(/(?:DO\s+ZAPŁATY|DO\s+ZAPLATY|SUMA\s*:)[^\d]*(\d+[.,]\d{2})/);
  if (sumMatch) extTotal = parseFloat(sumMatch[1].replace(',', '.'));

  // 2. Liters * Price (e.g. 5.96*7.69, OCR might read * as x, X, k, +, etc)
  const literPriceMatch = upperText.match(/(\d+[.,]\d{1,3})\s*[xX*+kK%•-]\s*(\d+[.,]\d{1,3})/);
  if (literPriceMatch) {
    extLiters = parseFloat(literPriceMatch[1].replace(',', '.'));
    extPricePerLiter = parseFloat(literPriceMatch[2].replace(',', '.'));
  }

  // 3. Date
  // Fix common OCR mistakes for numbers (O -> 0, I/L -> 1, Z -> 2)
  const fixedDateText = upperText.replace(/[O]/g, '0').replace(/[IL]/g, '1').replace(/[Z]/g, '2');
  
  // Match either YYYY-MM-DD or DD-MM-YYYY (enforce 20xx for the year)
  const dateMatch = fixedDateText.match(/(?:(20\d{2})\s*[-/.]\s*(\d{2})\s*[-/.]\s*(\d{2})|(\d{2})\s*[-/.]\s*(\d{2})\s*[-/.]\s*(20\d{2}))/);
  
  if (dateMatch) {
    if (dateMatch[1]) {
      // Matched YYYY-MM-DD: dateMatch[1]=YYYY, dateMatch[2]=MM, dateMatch[3]=DD
      extDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    } else {
      // Matched DD-MM-YYYY: dateMatch[4]=DD, dateMatch[5]=MM, dateMatch[6]=YYYY
      extDate = `${dateMatch[6]}-${dateMatch[5]}-${dateMatch[4]}`;
    }
  }

  // Fallback
  if (!extTotal || !extLiters) {
    const numbers = upperText.match(/\d+[.,]\d{2,3}/g);
    if (numbers && numbers.length >= 2) {
      const parsed = Array.from(new Set(numbers.map(n => parseFloat(n.replace(',', '.'))))).sort((a,b)=>b-a);
      extTotal = parsed[0] || extTotal;
      extLiters = parsed[1] || extLiters;
      extPricePerLiter = parsed[2] || extPricePerLiter;
    }
  }

  return {
    total: extTotal,
    liters: extLiters,
    pricePerLiter: extPricePerLiter,
    date: extDate
  };
}
