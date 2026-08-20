# 📋 Standard Tworzenia Opisów Aktualizacji i Komunikatów (CHANGELOG & Copywriting)

Podczas wdrażania zmian, podbijania wersji i tworzenia wpisów w `CHANGELOG.json` oraz komunikatów w aplikacji, musisz ściśle przestrzegać poniższych zasad:

### 1. Styl i Ton Wypowiedzi (Tone of Voice):
*   **Profesjonalny z lekkim, sportowym duchem:** Aplikacja jest narzędziem dla ambitnych osób dbających o formę/pasję. Komunikaty muszą brzmieć rzeczowo, nowocześnie i motywująco.
*   **BEZWZGLĘDNY ZAKAZ WULGARYZMÓW I SŁABEGO HUMORU:** Żadnych przekleństw, tekstów typu "luzuj gacie", "jedziemy z...", prostackiego slangu czy żenujących żartów.
*   **Perspektywa korzyści dla użytkownika:** Nie pisz technicznego żargonu ("zrefaktoryzowano instrukcję switch-case"), lecz napisz, co zyskał użytkownik ("Zoptymalizowano płynność przewijania wykresów").

### 2. Formatowanie Wpisów w `CHANGELOG.json`:
*   Każdy punkt na liście zmian **musi zaczynać się od dopasowanej tematycznie emotikony**:
    *   ✨ / 🚀 – Nowe, duże funkcjonalności.
    *   🛠️ / 🩹 – Poprawki błędów (Bugfixy) i stabilność.
    *   📱 / 🎨 – Usprawnienia interfejsu (UI/UX) i responsywności.
    *   📊 / 📈 – Wykresy, analityka i obliczenia.
    *   ⚡ – Optymalizacja szybkości działania i bazy danych.
    *   🔒 / 📦 – Bezpieczeństwo, kopie zapasowe i PWA.
*   Wpisy muszą być w języku polskim, zwięzłe (1-2 zdania) i poprawne gramatycznie.

### 3. Format Wersjonowania:
*   Zawsze stosuj schemat: `vRRRR.M.D.NR` (np. `v2026.8.15.3`).
*   **ZAKAZ stawiania kropki bezpośrednio po literze `v`** (niedozwolone: `v.2026...`, poprawne: `v2026...`).
*   Wersja musi być spójnie podbita w: `CHANGELOG.json`, `index.html` (meta tag), `sw.js` (nazwa cache) oraz głównym pliku UI.

---
**Przykład idealnego wpisu do `CHANGELOG.json`:**
```json
{
  "version": "v2026.8.15.3",
  "date": "2026-08-15",
  "changes": [
    "✨ Nowy Wykres Hybrydowy: Pełna obsługa aktywności tlenowych oraz automatyczne przeliczanie parametrów ze smartwatcha.",
    "📱 Usprawniono ergonomię ekranów dotykowych: Ikony informacyjne otwierają teraz dedykowane okna modalne.",
    "🛠️ Zoptymalizowano procedurę importu archiwalnych baz danych."
  ]
}
```

---

# 📝 Wytyczne i Szablon Promptu Transferowego (Uki's Bike Log)

Ten plik definiuje standard przekazywania kontekstu między kolejnymi sesjami z agentami AI (np. Antigravity) pracującymi nad projektem Uki's Bike Log.

Celem promptu transferowego jest płynne przekazanie pałeczki, aby nowy agent od pierwszej sekundy znał stan projektu, najważniejsze pliki i swoje najbliższe zadanie, bez konieczności ponownego analizowania całości od zera.

Gdy użytkownik poprosi Cię o stworzenie "promptu transferowego" (lub zbliżonej komendy na koniec sesji), wypełnij i wygeneruj poniższy szablon.

## Szablon do wygenerowania na żądanie:

```markdown
# 🚀 PROMPT TRANSFEROWY (Kontekst Projektu Uki's Bike Log)

**Jesteś Antigravity, agentem AI pracującym nad aplikacją Uki's Bike Log.**
Oto pełny kontekst naszego projektu, abyś mógł płynnie przejąć pałeczkę i kontynuować pracę.

## 🔗 Powiązania i Metadane
- **Poprzednia konwersacja (ID):** [WSTAW_TUTAJ_ID_BIEŻĄCEJ_KONWERSACJI]
- **Aktualna Wersja Aplikacji:** [WSTAW_AKTUALNĄ_WERSJĘ_NP_v2026.8.20.1]

## 📂 Najważniejsze Pliki do Zapoznania się (Otwórz je przez `view_file`)
Przed rozpoczęciem kodowania użyj narzędzia do odczytania struktury, w szczególności:
1. `src/App.tsx` - główny plik wejściowy i nawigacja UI.
2. [WSTAW_PLIK_2_NAD_KTÓRYM_PRACOWALIŚCIE] - [OPIS_DLACZEGO_WAŻNY]
3. `public/changelog.json` - zawsze aktualizuj historię zmian po wdrożeniach (sprawdź najwyższą zapisaną wersję).
4. `ROADMAP.md` - bieżące plany i lista zgłoszonych pomysłów do realizacji.

## ✅ Co Zostało Zrobione (Stan Obecny)
- [WSTAW_CO_WYKONANO_W_OSTATNIEJ_SESJI_1]
- [WSTAW_CO_WYKONANO_W_OSTATNIEJ_SESJI_2]

## 🏗️ Ważny Kontekst Architektoniczny
Pamiętaj, że aplikacja to PWA stworzona w React (TypeScript) + Vite. Używamy Leaflet do map i zapytań o radary pogodowe. Baza danych opiera się na interfejsie IndexedDB (LocalForage - serwis storage.ts), a aplikacja musi obsługiwać pełne działanie offline (Service Worker).

## 🗺 Najbliższy Cel / Twoje Zadanie
Obecnie pracujemy nad funkcjonalnością: [WSTAW_TEMAT_Z_ROADMAPY_LUB_OSTATNI_CEL].
Twoim pierwszym zadaniem po przeczytaniu tego promptu będzie:
[OPIS_PIERWSZEGO_ZADANIA_DO_WYKONANIA_DLA_NOWEGO_AGENTA]

Zaczynamy!
```
