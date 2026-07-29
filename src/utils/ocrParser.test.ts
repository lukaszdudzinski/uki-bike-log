import { describe, it, expect } from 'vitest';
import { parseReceiptText } from './ocrParser';

describe('OCR Parser', () => {
  it('should correctly parse an Orlen-style receipt', () => {
    const mockOcrText = `
      ORLEN S.A.
      09-411 PŁOCK, UL. CHEMIKÓW 7
      NIP: 774-00-01-454
      PARAGON FISKALNY
      EFECTA 95 CN27101245 (A)D(6) 5.96*7.69
                                      45.83A
      Sprzedaż opodatkowana A:         45.83
      Kwota PTU A 23%                   8.57
      SUMA PTU                          8.57
      SUMA :               PLN         45.83
      DO ZAPŁATY:                      45.83
      Karta:
      26-07-2026 11:52
    `;

    const result = parseReceiptText(mockOcrText);

    expect(result.total).toBe(45.83);
    expect(result.liters).toBe(5.96);
    expect(result.pricePerLiter).toBe(7.69);
    expect(result.date).toBe('2026-07-26');
  });

  it('should fallback to picking 3 highest numbers if specific format is missing', () => {
    const fallbackText = `
      Some random gas station
      Total: 150.50
      Amount: 20.30
      Price: 7.41
    `;

    const result = parseReceiptText(fallbackText);
    
    expect(result.total).toBe(150.50);
    expect(result.liters).toBe(20.30);
    expect(result.pricePerLiter).toBe(7.41);
  });
});
