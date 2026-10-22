import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REMINDER_PREFS,
  buildDigest,
  computeReminders,
  daysUntil,
  markSent,
  nextInspectionDate,
  selectNew,
  type ReminderPrefs,
} from './reminders';
import type { BikeSettings } from '../services/storage';

// 22.10.2026, południe czasu lokalnego (unikamy przesunięć przy północy)
const TODAY = new Date(2026, 9, 22, 12, 0, 0);
const BIKE = { id: 'default', name: 'Royal Enfield Bullet 350' };

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const base = (over: Partial<BikeSettings> = {}): Partial<BikeSettings> => ({
  insuranceExpiry: '',
  insuranceAcExpiry: '',
  lastInspectionDate: '',
  chainIntervalKm: 500,
  lastChainOdo: 10000,
  ...over,
});

const only = (type: keyof ReminderPrefs['enabled'], leadDays: ReminderPrefs['leadDays'] = 14): ReminderPrefs => ({
  leadDays,
  enabled: { oc: false, ac: false, inspection: false, chain: false, [type]: true },
});

describe('daysUntil', () => {
  it('liczy dni kalendarzowe, niezależnie od godziny', () => {
    expect(daysUntil(iso(2026, 10, 22), TODAY)).toBe(0);
    expect(daysUntil(iso(2026, 10, 23), TODAY)).toBe(1);
    expect(daysUntil(iso(2026, 11, 5), TODAY)).toBe(14);
    expect(daysUntil(iso(2026, 10, 20), TODAY)).toBe(-2);
  });
});

describe('nextInspectionDate', () => {
  it('termin przeglądu to data ostatniego przeglądu + 1 rok', () => {
    expect(nextInspectionDate('2025-11-12')).toBe('2026-11-12');
  });
  it('pusta lub błędna data nie daje terminu', () => {
    expect(nextInspectionDate('')).toBeNull();
    expect(nextInspectionDate('nie-data')).toBeNull();
  });
});

describe('computeReminders: OC', () => {
  const settings = (expiry: string) =>
    base({ insuranceExpiry: expiry, insurerName: 'PZU', policyNumber: 'POL-123456', insuranceHotline: '112233445' });

  it('poza oknem przypomnień nic nie zwraca', () => {
    expect(computeReminders(BIKE, settings(iso(2026, 11, 6)), 10000, only('oc'), TODAY)).toEqual([]);
  });

  it('etap „lead”: dokładnie tyle dni, ile ustawił użytkownik, z ubezpieczycielem i numerem polisy', () => {
    const [r] = computeReminders(BIKE, settings(iso(2026, 11, 5)), 10000, only('oc'), TODAY);
    expect(r.id).toBe('default:oc:2026-11-05');
    expect(r.stage).toBe('lead');
    expect(r.title).toBe('🛡️ OC wygasa za 14 dni');
    expect(r.body).toBe('Royal Enfield Bullet 350: polisa OC (PZU, nr POL-123456) jest ważna do 5.11.2026. Odnów ją na czas, żeby jeździć legalnie.');
  });

  it('krótszy czas wyprzedzenia (7 dni) przesuwa początek przypomnień', () => {
    expect(computeReminders(BIKE, settings(iso(2026, 11, 5)), 10000, only('oc', 7), TODAY)).toEqual([]);
    const [r] = computeReminders(BIKE, settings(iso(2026, 10, 29)), 10000, only('oc', 7), TODAY);
    expect(r.title).toBe('🛡️ OC wygasa za 7 dni');
  });

  it('etap „tomorrow” podaje infolinię', () => {
    const [r] = computeReminders(BIKE, settings(iso(2026, 10, 23)), 10000, only('oc'), TODAY);
    expect(r.stage).toBe('tomorrow');
    expect(r.title).toBe('🛡️ OC wygasa jutro');
    expect(r.body).toBe('Royal Enfield Bullet 350: polisa OC kończy się 23.10.2026. Infolinia ubezpieczyciela: 112233445.');
  });

  it('etap „expired” w dniu terminu i po nim', () => {
    for (const d of [iso(2026, 10, 22), iso(2026, 9, 1)]) {
      const [r] = computeReminders(BIKE, settings(d), 10000, only('oc'), TODAY);
      expect(r.stage).toBe('expired');
      expect(r.title).toBe('⛔ OC wygasło');
      expect(r.body).toContain('Nie wyjeżdżaj bez ważnego ubezpieczenia.');
    }
  });

  it('bez ubezpieczyciela i numeru polisy treść jest krótsza, ale poprawna', () => {
    const [r] = computeReminders(BIKE, base({ insuranceExpiry: iso(2026, 11, 1) }), 10000, only('oc'), TODAY);
    expect(r.body).toBe('Royal Enfield Bullet 350: polisa OC jest ważna do 1.11.2026. Odnów ją na czas, żeby jeździć legalnie.');
  });
});

describe('computeReminders: AC i przegląd', () => {
  it('AC ma własne komunikaty', () => {
    const [r] = computeReminders(BIKE, base({ insuranceAcExpiry: iso(2026, 10, 30) }), 10000, only('ac'), TODAY);
    expect(r.id).toBe('default:ac:2026-10-30');
    expect(r.title).toBe('🛡️ AC wygasa za 8 dni');
  });

  it('przegląd liczy termin od daty OSTATNIEGO przeglądu + 1 rok (nie „wygasł” codziennie)', () => {
    // ostatni przegląd pół roku temu: termin za ~6 miesięcy, więc brak przypomnienia
    expect(computeReminders(BIKE, base({ lastInspectionDate: iso(2026, 4, 22) }), 10000, only('inspection'), TODAY)).toEqual([]);
    const [r] = computeReminders(BIKE, base({ lastInspectionDate: iso(2025, 10, 29) }), 10000, only('inspection'), TODAY);
    expect(r.id).toBe('default:inspection:2026-10-29');
    expect(r.title).toBe('🔧 Przegląd za 7 dni');
    expect(r.body).toBe('Royal Enfield Bullet 350: badanie techniczne jest ważne do 29.10.2026. Umów stację kontroli pojazdów.');
  });

  it('przegląd po terminie', () => {
    const [r] = computeReminders(BIKE, base({ lastInspectionDate: iso(2025, 9, 1) }), 10000, only('inspection'), TODAY);
    expect(r.stage).toBe('expired');
    expect(r.title).toBe('⛔ Przegląd techniczny nieważny');
  });
});

describe('computeReminders: łańcuch', () => {
  it('używa interwału z danych pojazdu', () => {
    expect(computeReminders(BIKE, base({ chainIntervalKm: 800 }), 10600, only('chain'), TODAY)).toEqual([]);
    const [r] = computeReminders(BIKE, base({ chainIntervalKm: 800 }), 10820, only('chain'), TODAY);
    expect(r.id).toBe('default:chain:10000');
    expect(r.stage).toBe('due');
    expect(r.title).toBe('⛓️ Czas nasmarować łańcuch');
    expect(r.body).toBe('Royal Enfield Bullet 350: od ostatniego smarowania minęło 820 km (zalecane co 800 km).');
  });

  it('pilne przypomnienie od 140% interwału', () => {
    const [r] = computeReminders(BIKE, base(), 10700, only('chain'), TODAY);
    expect(r.stage).toBe('urgent');
    expect(r.title).toBe('⛓️ Pilnie nasmaruj łańcuch');
  });

  it('brak interwału w danych: domyślnie 500 km', () => {
    const [r] = computeReminders(BIKE, base({ chainIntervalKm: 0 }), 10500, only('chain'), TODAY);
    expect(r.body).toContain('(zalecane co 500 km)');
  });
});

describe('preferencje', () => {
  it('domyślnie wszystkie rodzaje włączone, 14 dni wcześniej', () => {
    expect(DEFAULT_REMINDER_PREFS).toEqual({ leadDays: 14, enabled: { oc: true, ac: true, inspection: true, chain: true } });
  });

  it('wyłączony rodzaj nie daje przypomnień', () => {
    const prefs: ReminderPrefs = { ...DEFAULT_REMINDER_PREFS, enabled: { ...DEFAULT_REMINDER_PREFS.enabled, oc: false } };
    expect(computeReminders(BIKE, base({ insuranceExpiry: iso(2026, 10, 23) }), 10000, prefs, TODAY)).toEqual([]);
  });
});

describe('bez powtórek', () => {
  const r = (id: string, stage: 'lead' | 'tomorrow' | 'expired') => ({ id, stage, type: 'oc' as const, bikeId: 'default', title: 't', body: 'b' });

  it('ten sam etap nie jest wysyłany drugi raz, kolejny etap tak', () => {
    let sent = markSent({}, [r('default:oc:2026-11-05', 'lead')]);
    expect(selectNew([r('default:oc:2026-11-05', 'lead')], sent)).toEqual([]);
    const next = r('default:oc:2026-11-05', 'tomorrow');
    expect(selectNew([next], sent)).toEqual([next]);
    sent = markSent(sent, [next]);
    expect(sent['default:oc:2026-11-05']).toEqual(['lead', 'tomorrow']);
  });

  it('nowa data OC (inne id) zaczyna liczenie od nowa', () => {
    const sent = markSent({}, [r('default:oc:2026-11-05', 'expired')]);
    const renewed = r('default:oc:2027-11-05', 'lead');
    expect(selectNew([renewed], sent)).toEqual([renewed]);
  });

  it('rejestr nie rośnie bez końca (najwyżej 100 wpisów)', () => {
    let sent = {};
    for (let i = 0; i < 150; i++) sent = markSent(sent, [r(`b:oc:${i}`, 'lead')]);
    expect(Object.keys(sent)).toHaveLength(100);
    expect(sent).toHaveProperty('b:oc:149');
    expect(sent).not.toHaveProperty('b:oc:0');
  });
});

describe('buildDigest', () => {
  it('zbiera kilka przypomnień w jedno powiadomienie z poprawną odmianą', () => {
    const items = ['🛡️ OC wygasa za 3 dni', '🔧 Przegląd jutro', '⛔ AC wygasło', '⛓️ Czas nasmarować łańcuch'].map((title, i) => ({
      id: `x${i}`, stage: 'lead' as const, type: 'oc' as const, bikeId: 'default', title, body: '',
    }));
    expect(buildDigest(items)).toEqual({
      title: "Uki's Bike Log: 4 przypomnienia",
      body: '🛡️ OC wygasa za 3 dni · 🔧 Przegląd jutro · ⛔ AC wygasło · ⛓️ Czas nasmarować łańcuch',
    });
    expect(buildDigest([...items, ...items.slice(0, 1)]).title).toBe("Uki's Bike Log: 5 przypomnień");
  });
});
