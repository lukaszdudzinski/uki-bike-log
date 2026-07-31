import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Routes from './Routes';

// Mock Leaflet as it might crash in JSDOM
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div>{children}</div>,
  TileLayer: () => <div>TileLayer</div>,
  Marker: () => <div>Marker</div>,
  Polyline: () => <div>Polyline</div>,
  useMap: () => ({
    fitBounds: vi.fn(),
    setView: vi.fn()
  })
}));

describe('Routes Component', () => {
  it('should not crash when clicking Dodaj', () => {
    render(<Routes />);
    
    const addButton = screen.getByText('Dodaj');
    fireEvent.click(addButton);
    
    // Check if form appeared
    expect(screen.getByText('Nowa trasa')).toBeTruthy();
    
    const nameInput = screen.getByPlaceholderText('Wpisz nazwę');
    const addressInput = screen.getByPlaceholderText('Miasto, ulica lub GPS');
    const saveButton = screen.getByText('Zapisz trasę');
    
    fireEvent.change(nameInput, { target: { value: 'Test' } });
    fireEvent.change(addressInput, { target: { value: 'Warszawa' } });
    fireEvent.click(saveButton);
  });
});
