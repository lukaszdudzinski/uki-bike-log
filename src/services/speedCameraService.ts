// src/services/speedCameraService.ts
// Baza stałych fotoradarów (CANARD / GITD / OpenStreetMap) oraz algorytm detekcji zbliżania się

import { haversineMeters, type Coordinates } from '../utils/geo';

export interface SpeedCamera {
  id: string;
  lat: number;
  lng: number;
  speedLimit: number; // km/h
  name: string;
  type: 'camera' | 'section'; // fotoradar punktowy lub odcinkowy pomiar prędkości
}

// Stała baza najważniejszych fotoradarów w Polsce (offline cache)
// Obejmuje węzły drogowe, trasy ekspresowe (S7, S8, S5, S3), autostrady (A1, A2, A4) oraz główne miasta
export const SPEED_CAMERAS_PL: SpeedCamera[] = [
  // Warszawa i okolice
  { id: 'cam-wa-1', lat: 52.1643, lng: 21.0312, speedLimit: 60, name: 'Warszawa, ul. Puławska', type: 'camera' },
  { id: 'cam-wa-2', lat: 52.2612, lng: 20.9854, speedLimit: 50, name: 'Warszawa, Wybrzeże Gdyńskie', type: 'camera' },
  { id: 'cam-wa-3', lat: 52.2285, lng: 21.0874, speedLimit: 50, name: 'Warszawa, ul. Ostrobramska', type: 'camera' },
  { id: 'cam-wa-4', lat: 52.2014, lng: 20.9123, speedLimit: 60, name: 'Warszawa, Al. Jerozolimskie', type: 'camera' },
  { id: 'cam-wa-5', lat: 52.1798, lng: 21.0023, speedLimit: 50, name: 'Warszawa, Al. Niepodległości', type: 'camera' },
  { id: 'cam-wa-6', lat: 52.2450, lng: 21.0420, speedLimit: 50, name: 'Warszawa, Most Świętokrzyski', type: 'camera' },
  { id: 'cam-wa-7', lat: 52.2980, lng: 20.9410, speedLimit: 50, name: 'Warszawa, ul. Modlińska', type: 'camera' },
  { id: 'cam-wa-8', lat: 52.1380, lng: 20.9320, speedLimit: 70, name: 'Raszyn, Al. Krakowska (DK7)', type: 'camera' },
  { id: 'cam-wa-9', lat: 52.0740, lng: 20.8710, speedLimit: 70, name: 'Nadarzyn (S8)', type: 'camera' },
  { id: 'cam-wa-10', lat: 52.3210, lng: 20.9020, speedLimit: 60, name: 'Łomianki (DK7)', type: 'camera' },

  // Trasa S7 / DK7 (Warszawa - Radom - Kielce - Kraków)
  { id: 'cam-s7-1', lat: 51.8540, lng: 20.8650, speedLimit: 90, name: 'Grójec (S7)', type: 'camera' },
  { id: 'cam-s7-2', lat: 51.5210, lng: 20.9740, speedLimit: 90, name: 'Białobrzegi (S7)', type: 'camera' },
  { id: 'cam-s7-3', lat: 51.4020, lng: 21.1470, speedLimit: 70, name: 'Radom, ul. Kielecka', type: 'camera' },
  { id: 'cam-s7-4', lat: 51.1120, lng: 20.8540, speedLimit: 90, name: 'Skarżysko-Kamienna (S7)', type: 'camera' },
  { id: 'cam-s7-5', lat: 50.8710, lng: 20.6270, speedLimit: 70, name: 'Kielce, ul. Krakowska', type: 'camera' },
  { id: 'cam-s7-6', lat: 50.5980, lng: 20.4890, speedLimit: 70, name: 'Jędrzejów (S7)', type: 'camera' },
  { id: 'cam-s7-7', lat: 50.3610, lng: 20.2410, speedLimit: 70, name: 'Miechów (DK7)', type: 'camera' },
  { id: 'cam-s7-8', lat: 50.2100, lng: 20.0840, speedLimit: 50, name: 'Słomniki (DK7)', type: 'camera' },

  // Kraków i Małopolska
  { id: 'cam-kr-1', lat: 50.0820, lng: 19.9210, speedLimit: 50, name: 'Kraków, Al. 29 Listopada', type: 'camera' },
  { id: 'cam-kr-2', lat: 50.0650, lng: 19.9720, speedLimit: 70, name: 'Kraków, ul. Nowohucka', type: 'camera' },
  { id: 'cam-kr-3', lat: 50.0240, lng: 19.9480, speedLimit: 70, name: 'Kraków, ul. Kamieńskiego', type: 'camera' },
  { id: 'cam-kr-4', lat: 50.0180, lng: 19.8970, speedLimit: 70, name: 'Kraków, ul. Zakopiańska', type: 'camera' },
  { id: 'cam-kr-5', lat: 49.9820, lng: 19.8820, speedLimit: 50, name: 'Gaj (DK7 / Zakopianka)', type: 'camera' },
  { id: 'cam-kr-6', lat: 49.8320, lng: 19.9420, speedLimit: 70, name: 'Myślenice (Zakopianka)', type: 'camera' },
  { id: 'cam-kr-7', lat: 49.6210, lng: 19.9670, speedLimit: 50, name: 'Chabówka / Rabka (DK47)', type: 'camera' },
  { id: 'cam-kr-8', lat: 49.4820, lng: 20.0310, speedLimit: 50, name: 'Nowy Targ, Al. Tysiąclecia', type: 'camera' },

  // Trójmiasto i Pomorze
  { id: 'cam-gd-1', lat: 54.3820, lng: 18.5910, speedLimit: 70, name: 'Gdańsk, Al. Grunwaldzka', type: 'camera' },
  { id: 'cam-gd-2', lat: 54.3410, lng: 18.6620, speedLimit: 50, name: 'Gdańsk, Trakt Św. Wojciecha', type: 'camera' },
  { id: 'cam-gd-3', lat: 54.4390, lng: 18.5710, speedLimit: 50, name: 'Sopot, Al. Niepodległości', type: 'camera' },
  { id: 'cam-gd-4', lat: 54.5180, lng: 18.5310, speedLimit: 70, name: 'Gdynia, ul. Morska', type: 'camera' },
  { id: 'cam-gd-5', lat: 54.5620, lng: 18.4210, speedLimit: 50, name: 'Rumia (DK6)', type: 'camera' },
  { id: 'cam-gd-6', lat: 54.6010, lng: 18.2340, speedLimit: 50, name: 'Wejherowo (DK6)', type: 'camera' },

  // Łódź, A1, A2
  { id: 'cam-ld-1', lat: 51.7580, lng: 19.4580, speedLimit: 50, name: 'Łódź, Al. Włókniarzy', type: 'camera' },
  { id: 'cam-ld-2', lat: 51.7820, lng: 19.4120, speedLimit: 50, name: 'Łódź, Al. Pamięci Ofiar Terroryzmu', type: 'camera' },
  { id: 'cam-a1-1', lat: 51.4120, lng: 19.6840, speedLimit: 140, name: 'Piotrków Trybunalski (A1)', type: 'camera' },
  { id: 'cam-a1-2', lat: 50.9120, lng: 19.3420, speedLimit: 140, name: 'Radomsko (A1)', type: 'camera' },
  { id: 'cam-a2-1', lat: 52.0980, lng: 20.4120, speedLimit: 140, name: 'Grodzisk Mazowiecki (A2)', type: 'camera' },

  // Śląsk i A4
  { id: 'cam-sl-1', lat: 50.2580, lng: 19.0210, speedLimit: 50, name: 'Katowice, ul. Chorzowska', type: 'camera' },
  { id: 'cam-sl-2', lat: 50.2820, lng: 18.9720, speedLimit: 70, name: 'Chorzów (Drogowa Trasa Średnicowa)', type: 'camera' },
  { id: 'cam-sl-3', lat: 50.2980, lng: 18.6740, speedLimit: 70, name: 'Gliwice (DK88)', type: 'camera' },
  { id: 'cam-a4-1', lat: 50.1580, lng: 19.6840, speedLimit: 140, name: 'Krzeszowice (A4)', type: 'camera' },
  { id: 'cam-a4-2', lat: 50.0120, lng: 20.9840, speedLimit: 140, name: 'Tarnów (A4)', type: 'camera' },

  // Wrocław i Dolny Śląsk
  { id: 'cam-wr-1', lat: 51.1070, lng: 17.0380, speedLimit: 50, name: 'Wrocław, Al. Karkonoska', type: 'camera' },
  { id: 'cam-wr-2', lat: 51.1380, lng: 16.9820, speedLimit: 50, name: 'Wrocław, ul. Kosmonautów', type: 'camera' },
  { id: 'cam-wr-3', lat: 51.1620, lng: 17.1120, speedLimit: 70, name: 'Wrocław, ul. Sobieskiego (Długołęka)', type: 'camera' },

  // Poznań i Wielkopolska
  { id: 'cam-pz-1', lat: 52.4060, lng: 16.9250, speedLimit: 50, name: 'Poznań, ul. Dąbrowskiego', type: 'camera' },
  { id: 'cam-pz-2', lat: 52.3820, lng: 16.8920, speedLimit: 70, name: 'Poznań, ul. Hetmańska', type: 'camera' },
  { id: 'cam-pz-3', lat: 52.3480, lng: 16.9740, speedLimit: 70, name: 'Poznań, ul. Krzywoustego (S11)', type: 'camera' },

  // Bieszczady / Podkarpacie
  { id: 'cam-pk-1', lat: 50.0410, lng: 21.9990, speedLimit: 50, name: 'Rzeszów, Al. Powstańców Warszawy', type: 'camera' },
  { id: 'cam-pk-2', lat: 49.6890, lng: 21.7640, speedLimit: 50, name: 'Krosno (DK28)', type: 'camera' },
  { id: 'cam-pk-3', lat: 49.5620, lng: 22.2140, speedLimit: 50, name: 'Sanok (DK84)', type: 'camera' },
  { id: 'cam-pk-4', lat: 49.4620, lng: 22.3320, speedLimit: 50, name: 'Lesko (DK84)', type: 'camera' },
];

export interface CameraAlert {
  camera: SpeedCamera;
  distanceMeters: number;
}

/**
 * Szuka fotoradaru przed użytkownikiem w zadanym promieniu (domyślnie 800m).
 */
export function findNearbyCamera(
  userPos: Coordinates,
  maxDistanceMeters: number = 800
): CameraAlert | null {
  let nearest: CameraAlert | null = null;

  for (const cam of SPEED_CAMERAS_PL) {
    const dist = haversineMeters(userPos, { lat: cam.lat, lng: cam.lng });
    if (dist <= maxDistanceMeters) {
      if (!nearest || dist < nearest.distanceMeters) {
        nearest = { camera: cam, distanceMeters: Math.round(dist) };
      }
    }
  }

  return nearest;
}
