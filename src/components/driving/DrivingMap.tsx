import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface DrivingMapProps {
  userLoc: { lat: number; lng: number } | null;
  radarUrl: string | null;
  speedCameras: { lat: number; lng: number }[];
}

function MapCenter({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    // Zachowujemy obecny poziom zoomu użytkownika, centrujemy tylko pozycję
    map.setView(position, map.getZoom(), { animate: true });
  }, [map, position]);
  return null;
}

export function DrivingMap({ userLoc, radarUrl, speedCameras }: DrivingMapProps) {
  return (
    <div className="dm-map-container">
      <MapContainer 
        center={userLoc ? [userLoc.lat, userLoc.lng] : [52.069, 19.480]} 
        zoom={13} 
        minZoom={2}
        maxZoom={18}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        
        {radarUrl && (
          <TileLayer
            url={radarUrl}
            opacity={0.8}
            maxNativeZoom={7}
          />
        )}

        {speedCameras.map((cam, i) => (
          <CircleMarker key={i} center={[cam.lat, cam.lng]} radius={6} color="var(--color-warning)" fillColor="var(--color-warning)" fillOpacity={0.8} />
        ))}

        {userLoc && (
          <>
            <CircleMarker center={[userLoc.lat, userLoc.lng]} radius={8} color="var(--color-primary)" fillColor="var(--color-primary)" fillOpacity={1} />
            <MapCenter position={[userLoc.lat, userLoc.lng]} />
          </>
        )}
      </MapContainer>
    </div>
  );
}
