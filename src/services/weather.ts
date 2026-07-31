export interface Coordinates {
  lat: number;
  lng: number;
}

export const weatherService = {
  // 1. Get current GPS Location
  getCurrentLocation: (): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolokalizacja nie jest wspierana przez Twoją przeglądarkę.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (err) => {
          reject(new Error(`Nie można pobrać lokalizacji: ${err.message}. Upewnij się, że masz włączony GPS.`));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  },

  // 2. Geocode address using Nominatim (OpenStreetMap)
  geocodeAddress: async (address: string): Promise<Coordinates> => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      throw new Error('Nie znaleziono adresu.');
    } catch (e) {
      throw new Error('Błąd wyszukiwania adresu. Spróbuj inaczej sformułować zapytanie.');
    }
  },

  // 3. Get Route using OSRM
  getRoute: async (start: Coordinates, end: Coordinates): Promise<[number, number][]> => {
    try {
      // OSRM format: lon,lat
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        // GeoJSON returns [lon, lat], Leaflet polyline needs [lat, lon]
        const coordinates = data.routes[0].geometry.coordinates;
        return coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
      }
      throw new Error('Nie udało się wytyczyć trasy.');
    } catch (e) {
      throw new Error('Błąd serwera tras.');
    }
  },

  // 4. Get Latest RainViewer Timestamp
  getLatestRadarTimestamp: async (): Promise<number> => {
    try {
      const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
      const data = await response.json();
      if (data && data.radar && data.radar.past && data.radar.past.length > 0) {
        // Get the most recent past timestamp
        const past = data.radar.past;
        return past[past.length - 1].time;
      }
      return 0;
    } catch (e) {
      console.error('Rainviewer API error', e);
      return 0;
    }
  }
};
