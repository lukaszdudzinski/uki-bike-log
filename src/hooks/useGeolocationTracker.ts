import { useState, useEffect, useRef } from 'react';

// Haversine formula
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2-lat1) * (Math.PI/180);
  const dLon = (lon2-lon1) * (Math.PI/180); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

export interface GpsTrackPoint {
  lat: number;
  lng: number;
  ele: number | null;
  time: string;
}

export function useGeolocationTracker() {
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [tripDistance, setTripDistance] = useState<number>(0);
  const [rideTimeSec, setRideTimeSec] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  const watchId = useRef<number | null>(null);
  const lastCoord = useRef<{lat: number, lng: number} | null>(null);
  const gpsTrackRef = useRef<GpsTrackPoint[]>([]);

  // Ride Timer
  useEffect(() => {
    const timer = setInterval(() => {
      // Increment ride time only if we have GPS signal or after first fix
      if (lastCoord.current !== null) {
        setRideTimeSec(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolokalizacja nie wspierana');
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const currentLat = pos.coords.latitude;
        const currentLng = pos.coords.longitude;
        setUserLoc({ lat: currentLat, lng: currentLng });

        if (pos.coords.speed !== null) {
          setSpeed(Math.round(pos.coords.speed * 3.6));
        } else {
          setSpeed(0);
        }

        if (lastCoord.current) {
          const dist = getDistanceFromLatLonInKm(
            lastCoord.current.lat, lastCoord.current.lng, 
            currentLat, currentLng
          );
          if (dist > 0.01) { // Only update if moved more than 10m
            setTripDistance(prev => prev + dist);
            lastCoord.current = { lat: currentLat, lng: currentLng };
            // Save to GPX track
            gpsTrackRef.current.push({
              lat: currentLat,
              lng: currentLng,
              ele: pos.coords.altitude,
              time: new Date(pos.timestamp).toISOString()
            });
          }
        } else {
          lastCoord.current = { lat: currentLat, lng: currentLng };
          gpsTrackRef.current.push({
            lat: currentLat,
            lng: currentLng,
            ele: pos.coords.altitude,
            time: new Date(pos.timestamp).toISOString()
          });
        }
      },
      () => {
        setErrorMsg('Brak sygnału GPS');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const exportGPX = () => {
    const track = gpsTrackRef.current;
    if (track.length === 0) return;

    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Uki's Bike Log" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Trasa motocyklowa - ${new Date().toLocaleDateString()}</name>
    <trkseg>
`;
    track.forEach(pt => {
      gpx += `      <trkpt lat="${pt.lat}" lon="${pt.lng}">
        ${pt.ele !== null ? `<ele>${pt.ele}</ele>` : ''}
        <time>${pt.time}</time>
      </trkpt>\n`;
    });
    gpx += `    </trkseg>
  </trk>
</gpx>`;

    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UkiBikeLog_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return {
    userLoc,
    speed,
    tripDistance,
    rideTimeSec,
    errorMsg,
    gpsTrack: gpsTrackRef.current,
    exportGPX
  };
}
