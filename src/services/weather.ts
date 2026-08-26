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

  // 4. Get Latest RainViewer URL
  getLatestRadarUrl: async (): Promise<string | null> => {
    try {
      const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
      const data = await response.json();
      if (data && data.radar && data.radar.past && data.radar.past.length > 0) {
        const past = data.radar.past;
        const latest = past[past.length - 1];
        const host = data.host || 'https://tilecache.rainviewer.com';
        // Returns the base tile URL string format for Leaflet
        return `${host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;
      }
      return null;
    } catch (e) {
      console.error('Rainviewer API error', e);
      return null;
    }
  },

  // 5. Check if it's raining in radius
  checkRainWarning: async (lat: number, lng: number, radiusKm: number): Promise<boolean> => {
    try {
      // Calculate 4 points around the user (N, S, E, W) at given radius
      // 1 degree lat = ~111km
      const latOffset = radiusKm / 111;
      // 1 degree lng = ~111km * cos(lat)
      const lngOffset = radiusKm / (111 * Math.cos(lat * (Math.PI / 180)));
      
      const points = [
        { lat, lng }, // Center
        { lat: lat + latOffset, lng }, // North
        { lat: lat - latOffset, lng }, // South
        { lat, lng: lng + lngOffset }, // East
        { lat, lng: lng - lngOffset }, // West
      ];
      
      const lats = points.map(p => p.lat.toFixed(4)).join(',');
      const lngs = points.map(p => p.lng.toFixed(4)).join(',');
      
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=precipitation`);
      const data = await res.json();
      
      let isRaining = false;
      // Open-Meteo returns array when multiple coordinates are requested
      if (Array.isArray(data)) {
        isRaining = data.some(d => d.current?.precipitation > 0);
      } else if (data?.current?.precipitation !== undefined) {
        // Fallback if only one coordinate was somehow processed
        isRaining = data.current.precipitation > 0;
      }
      
      return isRaining;
    } catch (e) {
      console.error('Weather API error', e);
      return false;
    }
  }
};
