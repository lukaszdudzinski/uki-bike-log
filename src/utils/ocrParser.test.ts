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

  it('should correctly parse dates with spaces and common OCR mistakes', () => {
    const textWithOcrMistakes = `
      DO ZAPŁATY: 45.83
      26 - O7 - 2026 
    `;
    const result = parseReceiptText(textWithOcrMistakes);
    expect(result.date).toBe('2026-07-26');
    expect(result.total).toBe(45.83);

    const textWithYYYYMMDD = `
      DO ZAPŁATY: 45.83
      2026/07/26 
    `;
    const result2 = parseReceiptText(textWithYYYYMMDD);
    expect(result2.date).toBe('2026-07-26');
  });

  it('should correctly parse multiplier with OCR mistakes', () => {
    const text1 = `5.96x7.69`;
    const result1 = parseReceiptText(text1);
    expect(result1.liters).toBe(5.96);
    expect(result1.pricePerLiter).toBe(7.69);

    const text2 = `5.96 k 7.69`;
    const result2 = parseReceiptText(text2);
    expect(result2.liters).toBe(5.96);
    expect(result2.pricePerLiter).toBe(7.69);
  });
});
