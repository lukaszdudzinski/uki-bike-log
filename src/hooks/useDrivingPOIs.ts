import { useState, useEffect, useRef } from 'react';
import { weatherService, type Coordinates } from '../services/weather';
import { overpassService } from '../services/overpassService';

export function useDrivingPOIs(
  userLoc: { lat: number; lng: number } | null,
  weatherRadius: number
) {
  const [rainWarning, setRainWarning] = useState<boolean>(false);
  const [nearestGasDist, setNearestGasDist] = useState<number | null>(null);
  const [nearestGasCoords, setNearestGasCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [speedCameras, setSpeedCameras] = useState<{ lat: number; lng: number }[]>([]);
  const [cameraWarning, setCameraWarning] = useState<boolean>(false);
  const [radarUrl, setRadarUrl] = useState<string | null>(null);

  const lastWeatherCheck = useRef<number>(0);
  const lastGasCheck = useRef<number>(0);
  const lastCameraCheck = useRef<number>(0);
  const cameraWarningRef = useRef<boolean>(false);
  const camerasCacheRef = useRef<Coordinates[]>([]);

  useEffect(() => {
    // Get latest radar layer for map
    weatherService.getLatestRadarUrl().then(url => {
      setRadarUrl(url);
    }).catch(e => console.error(e));
  }, []);

  useEffect(() => {
    if (!userLoc) return;

    const currentLat = userLoc.lat;
    const currentLng = userLoc.lng;
    const now = Date.now();

    // Initial immediate checks if timestamps are 0
    if (lastWeatherCheck.current === 0) {
      weatherService.checkRainWarning(currentLat, currentLng, weatherRadius).then(setRainWarning);
      lastWeatherCheck.current = now;
    }
    if (lastGasCheck.current === 0) {
      overpassService.getNearestGasStation(currentLat, currentLng).then(res => {
        if (res) {
          setNearestGasDist(res.distance);
          setNearestGasCoords(res.coords);
        }
      });
      lastGasCheck.current = now;
    }
    if (lastCameraCheck.current === 0) {
      overpassService.getSpeedCameras(currentLat, currentLng).then(cameras => {
        camerasCacheRef.current = cameras;
        setSpeedCameras(cameras);
      });
      lastCameraCheck.current = now;
    }

    // Weather every 5 mins
    if (now - lastWeatherCheck.current > 300000) {
      weatherService.checkRainWarning(currentLat, currentLng, weatherRadius).then(setRainWarning);
      lastWeatherCheck.current = now;
    }

    // Gas stations every 15 mins
    if (now - lastGasCheck.current > 900000) {
      overpassService.getNearestGasStation(currentLat, currentLng).then(res => {
        if (res) {
          setNearestGasDist(res.distance);
          setNearestGasCoords(res.coords);
        }
      });
      lastGasCheck.current = now;
    }

    // Speed cameras cache every 15 mins
    if (now - lastCameraCheck.current > 900000) {
      overpassService.getSpeedCameras(currentLat, currentLng).then(cameras => {
        camerasCacheRef.current = cameras;
        setSpeedCameras(cameras);
      });
      lastCameraCheck.current = now;
    }

    // Real-time camera proximity check
    if (camerasCacheRef.current.length > 0) {
      let minD = 9999;
      for (const cam of camerasCacheRef.current) {
        const d = overpassService.getDistanceFromLatLonInKm(currentLat, currentLng, cam.lat, cam.lng);
        if (d < minD) minD = d;
      }
      if (minD < 0.8 && !cameraWarningRef.current) {
        cameraWarningRef.current = true;
        setCameraWarning(true);
        try {
          // Beep sound
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioContext.createOscillator();
          osc.type = 'square';
          osc.frequency.setValueAtTime(800, audioContext.currentTime);
          osc.connect(audioContext.destination);
          osc.start();
          osc.stop(audioContext.currentTime + 0.5);
        } catch (e) {}
      } else if (minD >= 0.8 && cameraWarningRef.current) {
        cameraWarningRef.current = false;
        setCameraWarning(false);
      }
    }
  }, [userLoc, weatherRadius]);

  return {
    rainWarning,
    nearestGasDist,
    nearestGasCoords,
    speedCameras,
    cameraWarning,
    radarUrl
  };
}
