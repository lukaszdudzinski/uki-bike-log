import type { Coordinates } from './weather';

// Haversine formula
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180); 
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c;
}

export const overpassService = {
  getSpeedCameras: async (lat: number, lng: number): Promise<Coordinates[]> => {
    try {
      const query = `[out:json];node(around:20000,${lat},${lng})["highway"="speed_camera"];out;`;
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.elements && data.elements.length > 0) {
          return data.elements.map((el: any) => ({ lat: el.lat, lng: el.lon }));
        }
      }
      return [];
    } catch (e) {
      console.error('Failed to fetch speed cameras:', e);
      return [];
    }
  },

  getNearestGasStation: async (lat: number, lng: number): Promise<{ distance: number; coords: Coordinates } | null> => {
    try {
      const query = `[out:json];node(around:20000,${lat},${lng})["amenity"="fuel"];out 1;`;
      const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data?.elements?.length > 0) {
        const stLat = data.elements[0].lat;
        const stLon = data.elements[0].lon;
        return {
          distance: getDistanceFromLatLonInKm(lat, lng, stLat, stLon),
          coords: { lat: stLat, lng: stLon }
        };
      }
      return null;
    } catch (e) {
      console.error('Overpass API error', e);
      return null;
    }
  },

  getDistanceFromLatLonInKm
};
