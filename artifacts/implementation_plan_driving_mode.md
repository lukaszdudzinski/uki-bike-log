# Przebudowa Trybu Jazdy (Driving Mode)

Obecny tryb jazdy jest funkcjonalny, ale ma na stałe zakodowany układ dwukolumnowy (`1fr 1fr`), co sprawia, że w orientacji poziomej (landscape) na telefonie marnuje się dużo miejsca na boki, a interfejs wymaga przewijania w dół.

Celem jest stworzenie nowoczesnego, dynamicznego interfejsu (Dashboard), który automatycznie dostosowuje się do tego, czy telefon wisi na kierownicy pionowo, czy poziomo.

## User Review Required

> [!IMPORTANT]  
> Poniżej przedstawiam koncepcję. Zanim przejdę do kodowania, proszę o zatwierdzenie kierunku zmian. Jeśli masz dodatkowe uwagi co do układu, daj znać!

## Proposed Changes

### Nowa Architektura Układu (Flexbox + CSS Grid + Media Queries)

Zamiast sztywnych stylów inline w React, wprowadzimy responsywny plik CSS (lub użyjemy zapytań `@media` w stylach), aby obsłużyć dwa stany telefonu:

**1. Układ Pionowy (Portrait - domyślny)**
- **Góra:** Prędkościomierz (bardzo duży, wyśrodkowany) - najważniejsza informacja.
- **Środek:** Siatka 2x2 z kafelkami: Trip, Czas Jazdy, Spalanie, Najbliższa Stacja. Kafelki w stylu *Glassmorphism* (rozmyte tło).
- **Dół:** Przyciski do mapy i powrotu. Kiedy włączona jest mapa, zajmuje dolną połowę ekranu, lekko przysłaniając kafelki.

**2. Układ Poziomy (Landscape)**
- **Podział ekranu 50/50:**
  - **Lewa strona:** Wielki prędkościomierz wyśrodkowany w pionie oraz przycisk wyjścia/sterowania.
  - **Prawa strona:** Siatka 2x2 dla pozostałych parametrów (Trip, Czas, Spalanie, CPN).
- **Gdy włączona jest mapa (Landscape):**
  - Lewa strona to Prędkościomierz.
  - Prawa strona w 100% zostaje zastąpiona interaktywną mapą z radarem pogodowym.

### Usprawnienia Wizualne (Premium Design)
- **Glassmorphism:** Półprzezroczyste, ciemne panele z efektem rozmycia (blur) i subtelnymi obramowaniami świecącymi kolorem głównym aplikacji (pomarańczowym/żółtym).
- **Dynamiczny Prędkościomierz:** Zmiana koloru cyfr powyżej określonych prędkości (np. przy autostradowych wartościach) lub dodanie okrągłego paska postępu wokół prędkości.
- **Większa czytelność:** Ukrycie paska przewijania (`overflow: hidden` dla głównego kontenera) - cały interfejs w obu orientacjach ma mieścić się idealnie na jednym ekranie bez konieczności odrywania rąk od kierownicy, aby przewijać w dół.

#### [MODIFY] src/pages/DrivingMode.tsx
- Zmiana struktury divów z `style={{...}}` na klasy CSS.
- Dodanie nasłuchiwania na orientację ekranu lub użycie czystego CSS `@media (orientation: landscape)`.
- Reorganizacja komponentu `MapContainer`, aby w układzie poziomym idealnie wpasowywał się w prawą sekcję ekranu.

#### [NEW] src/styles/drivingMode.css (lub modyfikacja istniejącego index.css)
- Definicje gridów, flexboxów, animacji tła i układów dla `@media (orientation: landscape)`.

## Open Questions

> [!WARNING]  
> 1. Czy podoba Ci się pomysł podziału ekranu 50/50 w poziomie (lewa = prędkość, prawa = szczegóły/mapa)?
> 2. Czy prędkościomierz powinien w jakiś sposób reagować na prędkość (np. kolorować się na czerwono powyżej 140 km/h), czy wolisz zachować obecny, jednolity kolor przewodni?

## Verification Plan

### Manual Verification
- Przetestowanie widoku w DevTools przeglądarki w trybie mobilnym z włączoną rotacją ekranu (Pion/Poziom).
- Uruchomienie E2E dla nawigacji (skrypt Playwright), aby upewnić się, że przycisk zamykania trybu jazdy (z `aria-label`) jest nadal łatwo dostępny i klikalny.
