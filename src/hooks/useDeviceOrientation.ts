import { useState, useEffect } from 'react';

type OrientationEventCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

export function useDeviceOrientation() {
  const [leanAngle, setLeanAngle] = useState<number | null>(null);
  const [needsOrientationPermission, setNeedsOrientationPermission] = useState<boolean>(false);

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      let angle: number;
      const orientation = (window.screen.orientation || {}).type || '';
      if (orientation.includes('landscape') || window.orientation === 90 || window.orientation === -90) {
        angle = event.beta || 0;
      } else {
        angle = event.gamma || 0;
      }
      
      // Limit to 90 degrees max to avoid weird flips
      if (angle > 90) angle = 90;
      if (angle < -90) angle = -90;
      
      setLeanAngle(Math.round(angle));
    };

    const Ctor = window.DeviceOrientationEvent as OrientationEventCtor | undefined;
    if (typeof Ctor !== 'undefined' && typeof Ctor.requestPermission === 'function') {
      // iOS 13+ requires user gesture to request permission
      // eslint-disable-next-line react-hooks/set-state-in-effect -- stabilizacja: refaktor w podprojekcie 4
      setNeedsOrientationPermission(true);
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  const requestOrientationPermission = async () => {
    try {
      const permissionState = await (window.DeviceOrientationEvent as OrientationEventCtor).requestPermission!();
      if (permissionState === 'granted') {
        setNeedsOrientationPermission(false);
        window.addEventListener('deviceorientation', (event: DeviceOrientationEvent) => {
          let angle: number;
          const orientation = (window.screen.orientation || {}).type || '';
          if (orientation.includes('landscape') || window.orientation === 90 || window.orientation === -90) {
            angle = event.beta || 0;
          } else {
            angle = event.gamma || 0;
          }
          if (angle > 90) angle = 90;
          if (angle < -90) angle = -90;
          setLeanAngle(Math.round(angle));
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return {
    leanAngle,
    needsOrientationPermission,
    requestOrientationPermission
  };
}
