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

  // 2. Liters * Price (e.g. 5.96*7.69)
  const literPriceMatch = upperText.match(/(\d+[.,]\d+)\s*\*\s*(\d+[.,]\d+)/);
  if (literPriceMatch) {
    extLiters = parseFloat(literPriceMatch[1].replace(',', '.'));
    extPricePerLiter = parseFloat(literPriceMatch[2].replace(',', '.'));
  }

  // 3. Date (e.g. 26-07-2026)
  const dateMatch = upperText.match(/(\d{2})[-/.](\d{2})[-/.](\d{4})/);
  if (dateMatch) {
    extDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
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
