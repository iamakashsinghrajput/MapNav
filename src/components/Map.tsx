'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import * as L from 'leaflet';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Define types for props
interface Point {
    longitude: number;
    latitude: number;
}

interface MapProps {
    startPoint: Point | null;
    endPoint: Point | null;
    routeCoordinates: LatLngExpression[] | null;
    routeType?: 'road' | 'walking';
    mapRef?: React.RefObject<L.Map>;
}

const MapComponent: React.FC<MapProps> = ({ startPoint, endPoint, routeCoordinates, routeType = 'road' }) => {
    // Create custom icons inside component to avoid SSR issues
    const createCustomIcon = (color: string) => {
        if (typeof window === 'undefined') return null;
        
        try {
            const svgIcon = `<svg width="25" height="35" viewBox="0 0 25 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.5 0C5.596 0 0 5.596 0 12.5C0 19.404 12.5 35 12.5 35C12.5 35 25 19.404 25 12.5C25 5.596 19.404 0 12.5 0Z" fill="${color}"/>
                <circle cx="12.5" cy="12.5" r="6" fill="white"/>
            </svg>`;
            
            return new Icon({
                iconUrl: `data:image/svg+xml;base64,${btoa(svgIcon)}`,
                iconSize: [25, 35],
                iconAnchor: [12.5, 35],
                popupAnchor: [0, -35],
            });
        } catch (error) {
            console.error('Error creating custom icon:', error);
            return null;
        }
    };

    const startIcon = createCustomIcon('#ef4444'); // red
    const endIcon = createCustomIcon('#3b82f6'); // blue
    
    // Default center (New Delhi, India)
    const defaultCenter: LatLngExpression = [28.6139, 77.2090];
    
    // Determine map center
    const center = startPoint 
        ? [startPoint.latitude, startPoint.longitude] as LatLngExpression
        : defaultCenter;

    // Error boundary for map rendering
    if (typeof window === 'undefined') {
        return (
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                <div className="text-center p-8">
                    <p className="text-blue-600 font-medium">Initializing map...</p>
                </div>
            </div>
        );
    }

    try {
        return (
            <div className="w-full h-full">
                <MapContainer
                    center={center}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    className="leaflet-container"
                >
                {/* OpenStreetMap tiles (free) */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Start Point Marker */}
                {startPoint && startIcon && (
                    <Marker 
                        position={[startPoint.latitude, startPoint.longitude]}
                        icon={startIcon}
                    >
                        <Popup>
                            <div className="text-center">
                                <MapPin size={16} className="text-red-500 inline mr-1" />
                                Start Point
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* End Point Marker */}
                {endPoint && endIcon && (
                    <Marker 
                        position={[endPoint.latitude, endPoint.longitude]}
                        icon={endIcon}
                    >
                        <Popup>
                            <div className="text-center">
                                <MapPin size={16} className="text-blue-500 inline mr-1" />
                                Destination
                            </div>
                        </Popup>
                    </Marker>
                )}


                {/* Route Line */}
                {routeCoordinates && routeCoordinates.length > 0 && (
                    <>
                        {routeType === 'road' ? (
                            // Road Route Styling
                            <>
                                {/* Route background (wider line for better visibility) */}
                                <Polyline
                                    positions={routeCoordinates}
                                    color="#ffffff"
                                    weight={8}
                                    opacity={0.8}
                                />
                                {/* Main route line */}
                                <Polyline
                                    positions={routeCoordinates}
                                    color="#2563eb"
                                    weight={6}
                                    opacity={0.9}
                                />
                                {/* Route animation effect */}
                                <Polyline
                                    positions={routeCoordinates}
                                    color="#60a5fa"
                                    weight={2}
                                    opacity={0.6}
                                    dashArray="10,10"
                                />
                            </>
                        ) : (
                            // Walking Route Styling
                            <>
                                {/* Walking route background */}
                                <Polyline
                                    positions={routeCoordinates}
                                    color="#ffffff"
                                    weight={8}
                                    opacity={0.9}
                                />
                                {/* Main walking line */}
                                <Polyline
                                    positions={routeCoordinates}
                                    color="#22c55e"
                                    weight={5}
                                    opacity={0.9}
                                />
                                {/* Walking path indicators (dotted line) */}
                                <Polyline
                                    positions={routeCoordinates}
                                    color="#16a34a"
                                    weight={2}
                                    opacity={0.7}
                                    dashArray="5,10"
                                />
                            </>
                        )}
                    </>
                )}
            </MapContainer>
        </div>
    );
    } catch (error) {
        console.error('Error rendering map:', error);
        return (
            <div className="w-full h-full bg-red-50 flex items-center justify-center">
                <div className="text-center p-8">
                    <p className="text-red-600 font-medium">Error loading map</p>
                    <p className="text-red-500 text-sm mt-2">Please refresh the page</p>
                </div>
            </div>
        );
    }
};

export default MapComponent;