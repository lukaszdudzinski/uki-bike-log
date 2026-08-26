import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import DrivingMode from './DrivingMode';

// Mock storage
vi.mock('../services/storage', () => ({
  storage: {
    getSettings: vi.fn(() => ({ tankCapacity: 15, liquidGlassEnabled: true, rainWarningRadius: 10 })),
    getAverageConsumption: vi.fn(() => 5)
  }
}));

// Mock react-leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  CircleMarker: () => <div data-testid="circle-marker" />,
  useMap: () => ({ setView: vi.fn(), getZoom: vi.fn(() => 13) })
}));

// Mock hooks
vi.mock('../hooks/useWakeLock', () => ({
  useWakeLock: vi.fn()
}));
vi.mock('../hooks/useDeviceOrientation', () => ({
  useDeviceOrientation: vi.fn(() => ({ leanAngle: 0, needsOrientationPermission: false, requestOrientationPermission: vi.fn() }))
}));
vi.mock('../hooks/useGeolocationTracker', () => ({
  useGeolocationTracker: vi.fn(() => ({
    userLoc: { lat: 50, lng: 20 },
    speed: 55,
    tripDistance: 10,
    rideTimeSec: 3600,
    errorMsg: '',
    gpsTrack: [],
    exportGPX: vi.fn()
  }))
}));
vi.mock('../hooks/useDrivingPOIs', () => ({
  useDrivingPOIs: vi.fn(() => ({
    rainWarning: false,
    nearestGasDist: 5,
    nearestGasCoords: { lat: 50.1, lng: 20.1 },
    speedCameras: [],
    cameraWarning: false,
    radarUrl: null
  }))
}));

describe('DrivingMode', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders correctly and shows minimized button', () => {
    const handleExit = vi.fn();
    render(<DrivingMode onExit={handleExit} />);
    
    // Check if the close/minimize buttons are rendered
    expect(screen.getByText('_')).toBeInTheDocument();
  });

  it('renders speedometer component', () => {
    const handleExit = vi.fn();
    render(<DrivingMode onExit={handleExit} />);
    
    expect(screen.getByText('KM/H')).toBeInTheDocument();
  });
});
