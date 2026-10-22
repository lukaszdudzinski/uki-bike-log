import type { BikeSettings } from '../services/storage';

// Logika przypomnień bez efektów ubocznych: kiedy wypada przypomnienie, jaka jest jego treść
// i które etapy zostały już wysłane. Wysyłkę obsługuje notifications.ts.

export type ReminderType = 'oc' | 'ac' | 'inspection' | 'chain';
export type LeadDays = 30 | 14 | 7 | 3;
export type ReminderStage = 'lead' | 'tomorrow' | 'expired' | 'due' | 'urgent';

export const LEAD_DAYS_OPTIONS: readonly LeadDays[] = [30, 14, 7, 3];

export interface ReminderPrefs {
  leadDays: LeadDays;
  enabled: Record<ReminderType, boolean>;
}

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = {
  leadDays: 14,
  enabled: { oc: true, ac: true, inspection: true, chain: true },
};

export interface Reminder {
  /** `${bikeId}:${type}:${termin lub stan licznika}` — zmiana terminu daje nowe id i zaczyna liczenie od nowa */
  id: string;
  stage: ReminderStage;
  type: ReminderType;
  bikeId: string;
  title: string;
  body: string;
}

/** Rejestr wysłanych etapów: id przypomnienia → lista etapów. */
export type SentLog = Record<string, ReminderStage[]>;

const DEFAULT_CHAIN_INTERVAL_KM = 500;
const CHAIN_URGENT_FACTOR = 1.4;
const MAX_SENT_ENTRIES = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

const parseDate = (value: string | undefined): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const formatDate = (d: Date) => `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;

/** Liczba dni kalendarzowych od dziś do daty (0 = dziś, ujemne = w przeszłości). */
export const daysUntil = (dateIso: string, today: Date): number => {
  const target = parseDate(dateIso);
  if (!target) return NaN;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - start.getTime()) / DAY_MS);
};

/** Termin kolejnego przeglądu: data ostatniego przeglądu + 1 rok (jak w AlertsList). */
export const nextInspectionDate = (lastInspectionDate: string): string | null => {
  const last = parseDate(lastInspectionDate);
  if (!last) return null;
  return toIso(new Date(last.getFullYear() + 1, last.getMonth(), last.getDate()));
};

const dateStage = (days: number, leadDays: LeadDays): ReminderStage | null => {
  if (Number.isNaN(days)) return null;
  if (days <= 0) return 'expired';
  if (days === 1) return 'tomorrow';
  if (days <= leadDays) return 'lead';
  return null;
};

const policyDetails = (s: Partial<BikeSettings>) => {
  const parts = [s.insurerName?.trim(), s.policyNumber?.trim() ? `nr ${s.policyNumber.trim()}` : ''].filter(Boolean);
  return parts.length ? ` (${parts.join(', ')})` : '';
};

const insuranceTexts = (kind: 'OC' | 'AC', stage: ReminderStage, days: number, bike: string, date: string, s: Partial<BikeSettings>) => {
  if (stage === 'lead') {
    return {
      title: `🛡️ ${kind} wygasa za ${days} dni`,
      body: `${bike}: polisa ${kind}${policyDetails(s)} jest ważna do ${date}. Odnów ją na czas, żeby jeździć legalnie.`,
    };
  }
  if (stage === 'tomorrow') {
    const hotline = s.insuranceHotline?.trim() ? ` Infolinia ubezpieczyciela: ${s.insuranceHotline.trim()}.` : '';
    return { title: `🛡️ ${kind} wygasa jutro`, body: `${bike}: polisa ${kind} kończy się ${date}.${hotline}` };
  }
  return kind === 'OC'
    ? { title: '⛔ OC wygasło', body: `${bike}: polisa OC straciła ważność ${date}. Nie wyjeżdżaj bez ważnego ubezpieczenia.` }
    : { title: '⛔ AC wygasło', body: `${bike}: polisa AC straciła ważność ${date}. Odnów ją, jeśli chcesz zachować ochronę autocasco.` };
};

const inspectionTexts = (stage: ReminderStage, days: number, bike: string, date: string) => {
  if (stage === 'lead') {
    return { title: `🔧 Przegląd za ${days} dni`, body: `${bike}: badanie techniczne jest ważne do ${date}. Umów stację kontroli pojazdów.` };
  }
  if (stage === 'tomorrow') {
    return { title: '🔧 Przegląd jutro', body: `${bike}: badanie techniczne kończy się ${date}. Jutro to ostatni dzień ważności.` };
  }
  return { title: '⛔ Przegląd techniczny nieważny', body: `${bike}: badanie techniczne straciło ważność ${date}. Bez ważnego przeglądu nie wolno jeździć.` };
};

/** Przypomnienia, które obowiązują dziś dla jednego pojazdu (bez sprawdzania, co już wysłano). */
export const computeReminders = (
  bike: { id: string; name: string },
  settings: Partial<BikeSettings>,
  odo: number,
  prefs: ReminderPrefs,
  today: Date,
): Reminder[] => {
  const out: Reminder[] = [];
  const add = (type: ReminderType, ref: string, stage: ReminderStage, texts: { title: string; body: string }) =>
    out.push({ id: `${bike.id}:${type}:${ref}`, stage, type, bikeId: bike.id, ...texts });

  const dated: Array<{ type: 'oc' | 'ac' | 'inspection'; date: string | null }> = [
    { type: 'oc', date: settings.insuranceExpiry || null },
    { type: 'ac', date: settings.insuranceAcExpiry || null },
    { type: 'inspection', date: nextInspectionDate(settings.lastInspectionDate ?? '') },
  ];
  for (const { type, date } of dated) {
    if (!prefs.enabled[type] || !date) continue;
    const days = daysUntil(date, today);
    const stage = dateStage(days, prefs.leadDays);
    if (!stage) continue;
    const pretty = formatDate(parseDate(date)!);
    const texts = type === 'inspection'
      ? inspectionTexts(stage, days, bike.name, pretty)
      : insuranceTexts(type === 'oc' ? 'OC' : 'AC', stage, days, bike.name, pretty, settings);
    add(type, date, stage, texts);
  }

  if (prefs.enabled.chain && typeof settings.lastChainOdo === 'number') {
    const interval = settings.chainIntervalKm && settings.chainIntervalKm > 0 ? settings.chainIntervalKm : DEFAULT_CHAIN_INTERVAL_KM;
    const traveled = odo - settings.lastChainOdo;
    if (traveled >= Math.round(interval * CHAIN_URGENT_FACTOR)) {
      add('chain', String(settings.lastChainOdo), 'urgent', {
        title: '⛓️ Pilnie nasmaruj łańcuch',
        body: `${bike.name}: bez smarowania minęło już ${traveled} km (zalecane co ${interval} km). Suchy łańcuch szybciej się zużywa.`,
      });
    } else if (traveled >= interval) {
      add('chain', String(settings.lastChainOdo), 'due', {
        title: '⛓️ Czas nasmarować łańcuch',
        body: `${bike.name}: od ostatniego smarowania minęło ${traveled} km (zalecane co ${interval} km).`,
      });
    }
  }
  return out;
};

/** Przypomnienia, których etap nie został jeszcze wysłany. */
export const selectNew = (reminders: Reminder[], sent: SentLog): Reminder[] =>
  reminders.filter(r => !(sent[r.id] ?? []).includes(r.stage));

/** Dopisuje wysłane etapy; najstarsze wpisy wypadają po przekroczeniu limitu. */
export const markSent = (sent: SentLog, reminders: Reminder[]): SentLog => {
  const next: SentLog = { ...sent };
  for (const r of reminders) {
    const stages = next[r.id] ?? [];
    delete next[r.id]; // przenosimy na koniec, żeby kolejność odpowiadała świeżości
    next[r.id] = stages.includes(r.stage) ? stages : [...stages, r.stage];
  }
  const ids = Object.keys(next);
  for (const id of ids.slice(0, Math.max(0, ids.length - MAX_SENT_ENTRIES))) delete next[id];
  return next;
};

const pluralPrzypomnienie = (n: number) => {
  const last = n % 10;
  const lastTwo = n % 100;
  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'przypomnienia' : 'przypomnień';
};

/** Jedno zbiorcze powiadomienie zamiast kilku naraz. */
export const buildDigest = (reminders: Reminder[]) => ({
  title: `Uki's Bike Log: ${reminders.length} ${pluralPrzypomnienie(reminders.length)}`,
  body: reminders.map(r => r.title).join(' · '),
});
