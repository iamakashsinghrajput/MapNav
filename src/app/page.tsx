// src/app/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Home, Save, Star, Navigation } from 'lucide-react';
import { LatLngExpression } from 'leaflet';

import dynamic from 'next/dynamic';

// Dynamically import Map component with no SSR to avoid window issues
const MapComponent = dynamic(() => import('@/components/Map'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
            <div className="text-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                <p className="text-blue-600 font-medium">Loading map...</p>
                <p className="text-blue-500 text-sm mt-2">Please wait while we initialize the map</p>
            </div>
        </div>
    )
}) as React.ComponentType<{
    startPoint: Point | null;
    endPoint: Point | null;
    routeCoordinates: LatLngExpression[] | null;
    routeType?: 'road' | 'walking';
}>;
import { ILocation } from '@/models/Location';
import { UserTracker } from '@/lib/userTracking';

// Type definitions
type Point = { longitude: number; latitude: number };
type RouteInfo = {
    duration: number; // in seconds
    distance: number; // in meters
};
type SearchSuggestion = {
    place_id: string;
    display_name: string;
    lat: string;
    lon: string;
    importance: number;
};

export default function Home_Page() {
    const [startPoint, setStartPoint] = useState<Point | null>(null);
    const [endPoint, setEndPoint] = useState<Point | null>(null);
    const [endPointInfo, setEndPointInfo] = useState<{ name: string; address: string } | null>(null);
    const [routeCoordinates, setRouteCoordinates] = useState<LatLngExpression[] | null>(null);
    const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
    const [savedLocations, setSavedLocations] = useState<ILocation[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [locationPermissionAsked, setLocationPermissionAsked] = useState<boolean>(false);
    const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [routeType, setRouteType] = useState<'road' | 'walking'>('road');
    const [routeError, setRouteError] = useState<string | null>(null);
    
    // User tracking instance
    const userTracker = useRef<UserTracker | null>(null);

    // Initialize user tracking
    useEffect(() => {
        if (typeof window !== 'undefined') {
            userTracker.current = new UserTracker();
            
            // Cleanup function
            return () => {
                if (userTracker.current) {
                    userTracker.current.cleanup();
                }
            };
        }
    }, []);

    // Get User's Current Location with Enhanced Tracking
    useEffect(() => {
        const requestLocationAccess = async () => {
            if (locationPermissionAsked || !userTracker.current) return;
            
            setLocationPermissionAsked(true);
            
            // Request location through our tracking system
            const granted = await userTracker.current.requestLocationPermission();
            
            if (granted) {
                // Get current position for the map
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            const { longitude, latitude } = pos.coords;
                            const userLocation = { longitude, latitude };
                            setStartPoint(userLocation);
                        },
                        (error) => {
                            console.warn('Geolocation error:', error);
                            // Set default location (New Delhi, India)
                            setStartPoint({ longitude: 77.2090, latitude: 28.6139 });
                        }
                    );
                }
            } else {
                // Set default location if permission denied
                setStartPoint({ longitude: 77.2090, latitude: 28.6139 });
            }
        };

        // Small delay to ensure tracker is initialized
        const timer = setTimeout(requestLocationAccess, 1000);
        return () => clearTimeout(timer);
    }, [locationPermissionAsked]);

    // Load recent searches from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('recentSearches');
            if (stored) {
                setRecentSearches(JSON.parse(stored));
            }
        }
    }, []);

    // Get search suggestions as user types
    const getSuggestions = async (query: string) => {
        if (!query.trim() || query.length < 2) {
            setSearchSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setIsSearching(true);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
            
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&extratags=1`,
                {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'MapNav-App'
                    }
                }
            );
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Nominatim API returned ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            setSearchSuggestions(data);
            setShowSuggestions(data.length > 0);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
            }
            setSearchSuggestions([]);
            setShowSuggestions(false);
        } finally {
            setIsSearching(false);
        }
    };

    // Save search to recent searches
    const saveRecentSearch = (query: string) => {
        if (typeof window !== 'undefined') {
            const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
            setRecentSearches(updated);
            localStorage.setItem('recentSearches', JSON.stringify(updated));
        }
    };

    // Handle suggestion selection
    const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
        const latitude = parseFloat(suggestion.lat);
        const longitude = parseFloat(suggestion.lon);
        
        setEndPoint({ longitude, latitude });
        setEndPointInfo({ 
            name: suggestion.display_name.split(',')[0], 
            address: suggestion.display_name 
        });
        
        setSearchQuery(suggestion.display_name.split(',')[0]);
        setShowSuggestions(false);
        saveRecentSearch(suggestion.display_name.split(',')[0]);
        
        // Track search query
        if (userTracker.current) {
            userTracker.current.trackSearchQuery(suggestion.display_name);
        }
    };

    // Enhanced search function with tracking
    const handleSearch = async (query: string) => {
        if (!query.trim()) return;

        setShowSuggestions(false);
        saveRecentSearch(query);

        // Track search query
        if (userTracker.current) {
            await userTracker.current.trackSearchQuery(query);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
                {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'MapNav-App'
                    }
                }
            );
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Search API returned ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];
                const latitude = parseFloat(result.lat);
                const longitude = parseFloat(result.lon);
                
                setEndPoint({ longitude, latitude });
                setEndPointInfo({ 
                    name: result.display_name.split(',')[0], 
                    address: result.display_name 
                });
            } else {
                console.log('No search results found for:', query);
            }
        } catch (error) {
            console.error('Search error:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
            }
        }
    };



    // Calculate distance between two points
    const calculateDistance = (point1: Point, point2: { latitude: number; longitude: number }) => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = (point1.latitude * Math.PI) / 180;
        const φ2 = (point2.latitude * Math.PI) / 180;
        const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
        const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                 Math.cos(φ1) * Math.cos(φ2) *
                 Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };


    // Create direct walking route as fallback
    const createDirectWalkingRoute = (start: Point, end: Point) => {
        const coordinates: LatLngExpression[] = [
            [start.latitude, start.longitude],
            [end.latitude, end.longitude]
        ];

        const distance = calculateDistance(start, end);
        const duration = distance / 1.4; // Walking speed ~1.4 m/s (5 km/h)

        return {
            coordinates,
            distance,
            duration
        };
    };

    // Create walking route using OSRM walking directions
    const getWalkingRoute = async (start: Point, end: Point) => {
        try {
            console.log('🚶 Getting walking route from OSRM...');
            
            // Use OSRM for walking directions with timeout
            const url = `https://router.project-osrm.org/route/v1/foot/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`OSRM API returned ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                
                // Convert coordinates to Leaflet format [lat, lng]
                const coordinates: LatLngExpression[] = route.geometry.coordinates.map(
                    (coord: [number, number]) => [coord[1], coord[0]]
                );
                
                console.log('✅ Walking route found with', coordinates.length, 'points');
                
                return {
                    coordinates,
                    distance: route.distance, // meters
                    duration: route.duration  // seconds
                };
            } else {
                throw new Error('No walking route found from OSRM');
            }
        } catch (error) {
            console.log('❌ OSRM walking failed, using direct route:', error);
            if (error instanceof Error) {
                console.log('Error details:', error.message);
            }
            return createDirectWalkingRoute(start, end);
        }
    };


    // Get route based on selected type (road/metro)
    useEffect(() => {
        const getRoute = async () => {
            if (!startPoint || !endPoint) {
                setRouteCoordinates(null);
                setRouteInfo(null);
                setIsCalculatingRoute(false);
                setRouteError(null);
                return;
            }

            setIsCalculatingRoute(true);
            setRouteError(null); // Clear previous errors
            
            try {
                if (routeType === 'road') {
                    
                    // Use OSRM Demo Server for road routing (free)
                    const url = `https://router.project-osrm.org/route/v1/driving/${startPoint.longitude},${startPoint.latitude};${endPoint.longitude},${endPoint.latitude}?overview=full&geometries=geojson`;
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                    
                    const response = await fetch(url, {
                        signal: controller.signal,
                        headers: {
                            'Accept': 'application/json',
                        }
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) {
                        throw new Error(`OSRM API returned ${response.status}: ${response.statusText}`);
                    }
                    
                    const data = await response.json();

                    if (data.routes && data.routes.length > 0) {
                        const route = data.routes[0];
                        
                        // Convert coordinates to Leaflet format [lat, lng]
                        const coordinates: LatLngExpression[] = route.geometry.coordinates.map(
                            (coord: [number, number]) => [coord[1], coord[0]]
                        );
                        
                        setRouteCoordinates(coordinates);
                        setRouteInfo({
                            distance: route.distance, // meters
                            duration: route.duration  // seconds
                        });
                    } else {
                        throw new Error('No road route found');
                    }
                } else {
                    // Walking routing (previously metro)
                    console.log('🚶 Starting walking routing for:', { startPoint, endPoint });
                    const walkingRoute = await getWalkingRoute(startPoint, endPoint);
                    
                    console.log('📊 Setting walking route data:', walkingRoute);
                    setRouteCoordinates(walkingRoute.coordinates);
                    setRouteInfo({
                        distance: walkingRoute.distance,
                        duration: walkingRoute.duration
                    });
                    
                }
                setIsCalculatingRoute(false);
            } catch (error) {
                console.error('Routing error:', error);
                setRouteError('Network error: Unable to calculate route. Showing direct path instead.');
                // Fallback to straight line
                if (startPoint && endPoint) {
                    const coordinates: LatLngExpression[] = [
                        [startPoint.latitude, startPoint.longitude],
                        [endPoint.latitude, endPoint.longitude]
                    ];
                    setRouteCoordinates(coordinates);

                    // Calculate approximate distance using Haversine formula
                    const R = 6371e3;
                    const φ1 = (startPoint.latitude * Math.PI) / 180;
                    const φ2 = (endPoint.latitude * Math.PI) / 180;
                    const Δφ = ((endPoint.latitude - startPoint.latitude) * Math.PI) / 180;
                    const Δλ = ((endPoint.longitude - startPoint.longitude) * Math.PI) / 180;

                    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                             Math.cos(φ1) * Math.cos(φ2) *
                             Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                    const distance = R * c;
                    const duration = distance / 13.89;

                    setRouteInfo({ distance, duration });
                }
                setIsCalculatingRoute(false);
            }
        };

        getRoute();
    }, [startPoint, endPoint, routeType]);

    // Fetch Saved Locations
    const fetchSavedLocations = async () => {
        try {
            const res = await fetch('/api/locations');
            const data = await res.json();
            if (data.success) {
                setSavedLocations(data.data);
            }
        } catch (error) {
            console.error('Error fetching saved locations:', error);
        }
    };

    useEffect(() => {
        fetchSavedLocations();
    }, []);

    // Enhanced location saving with tracking
    const handleSaveLocation = async () => {
        if (!endPoint || !endPointInfo) return;

        const locationName = prompt("Enter a name for this location (e.g., Home, Work):");
        if (!locationName) return;

        try {
            const res = await fetch('/api/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: locationName,
                    address: endPointInfo.address,
                    coordinates: { lng: endPoint.longitude, lat: endPoint.latitude },
                }),
            });
            const data = await res.json();
            if (data.success) {
                // Track location save
                if (userTracker.current) {
                    await userTracker.current.trackLocationSave();
                }
                
                alert('Location saved!');
                fetchSavedLocations(); // Refresh the list
            } else {
                alert('Failed to save location.');
            }
        } catch (error) {
            console.error('Error saving location:', error);
            alert('Failed to save location.');
        }
    };
    
    // Format duration and distance for display
    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours > 0 ? `${hours} hr ` : ''}${minutes} min`;
    };

    const formatDistance = (meters: number) => {
        const kilometers = (meters / 1000).toFixed(1);
        return `${kilometers} km`;
    };

    // Handle input change with debounced suggestions
    const handleInputChange = (value: string) => {
        setSearchQuery(value);
        
        // Debounce suggestions
        setTimeout(() => {
            getSuggestions(value);
        }, 300);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSearch(searchQuery);
    };

    const handleRecentSearchSelect = (search: string) => {
        setSearchQuery(search);
        handleSearch(search);
    };

    return (
        <main className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            {/* Left Sidebar - Search Interface */}
            <div className="w-full lg:w-96 bg-white shadow-xl border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col max-h-[40vh] lg:max-h-none overflow-y-auto lg:overflow-y-visible">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 lg:p-6">
                    <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
                        <Navigation size={24} className="lg:w-7 lg:h-7" />
                        MapNav
                    </h1>
                    <p className="text-blue-100 text-xs lg:text-sm mt-1">Find your way anywhere</p>
                </div>

                {/* Search Section */}
                <div className="p-3 lg:p-6 flex-1 overflow-y-auto">
                    {/* Enhanced Search Bar */}
                    <div className="relative mb-4 lg:mb-6">
                        <form onSubmit={handleSearchSubmit}>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleInputChange(e.target.value)}
                                    onFocus={() => {
                                        if (searchSuggestions.length > 0) setShowSuggestions(true);
                                    }}
                                    placeholder="Where do you want to go?"
                                    className="w-full px-3 py-3 pl-10 lg:px-4 lg:py-4 lg:pl-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base lg:text-lg shadow-sm transition-all text-gray-800 placeholder-gray-500"
                                />
                                <div className="absolute left-3 lg:left-4 top-1/2 transform -translate-y-1/2">
                                    <Navigation size={18} className="lg:w-5 lg:h-5 text-gray-400" />
                                </div>
                                {isSearching && (
                                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 mt-3">
                                <button
                                    type="submit"
                                    disabled={!searchQuery.trim() || isSearching}
                                    className="flex-1 px-4 py-2.5 lg:px-6 lg:py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-md text-sm lg:text-base"
                                >
                                    Search Location
                                </button>
                            </div>
                            
                            {/* Route Type Selector */}
                            <div className="mt-3 lg:mt-4">
                                <label className="text-xs lg:text-sm font-medium text-gray-700 mb-2 block">Route Type</label>
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button
                                        type="button"
                                        onClick={() => setRouteType('road')}
                                        className={`flex-1 px-2 py-2 lg:px-4 lg:py-2 rounded-md font-medium text-xs lg:text-sm transition-all ${
                                            routeType === 'road'
                                                ? 'bg-white text-blue-600 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-800'
                                        }`}
                                    >
                                        🚗 By Road
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRouteType('walking')}
                                        className={`flex-1 px-2 py-2 lg:px-4 lg:py-2 rounded-md font-medium text-xs lg:text-sm transition-all ${
                                            routeType === 'walking'
                                                ? 'bg-white text-green-600 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-800'
                                        }`}
                                    >
                                        🚶 Walking
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Search Suggestions Dropdown */}
                        {showSuggestions && searchSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg z-30 max-h-48 lg:max-h-60 overflow-y-auto">
                                {searchSuggestions.map((suggestion) => (
                                    <button
                                        key={suggestion.place_id}
                                        onClick={() => handleSuggestionSelect(suggestion)}
                                        className="w-full text-left px-3 py-2.5 lg:px-4 lg:py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-blue-50 transition-colors"
                                    >
                                        <div className="flex items-start gap-2 lg:gap-3">
                                            <div className="flex-shrink-0 mt-1">
                                                <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 bg-blue-500 rounded-full"></div>
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900 text-sm lg:text-base">
                                                    {suggestion.display_name.split(',')[0]}
                                                </div>
                                                <div className="text-xs lg:text-sm text-gray-500 mt-1">
                                                    {suggestion.display_name.split(',').slice(1, 3).join(',').trim()}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Searches */}
                    {recentSearches.length > 0 && !showSuggestions && !searchQuery && (
                        <div className="mb-4 lg:mb-6">
                            <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-2 lg:mb-3 flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                Recent Searches
                            </h3>
                            <div className="space-y-1.5 lg:space-y-2">
                                {recentSearches.map((search, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleRecentSearchSelect(search)}
                                        className="w-full text-left px-3 py-2.5 lg:px-4 lg:py-3 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 text-gray-700 rounded-lg transition-all border border-purple-100 hover:border-purple-200"
                                    >
                                        <div className="flex items-center gap-2 lg:gap-3">
                                            <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-purple-400 rounded-full"></div>
                                            <span className="font-medium text-sm lg:text-base">{search}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Popular Destinations */}
                    {!showSuggestions && !searchQuery && recentSearches.length === 0 && (
                        <div className="mb-4 lg:mb-6">
                            <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-2 lg:mb-3 flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                Popular Destinations
                            </h3>
                            <div className="grid grid-cols-1 gap-1.5 lg:gap-2">
                                {['Red Fort', 'India Gate', 'Restaurants nearby', 'Petrol pumps nearby', 'Hotels nearby', 'Coffee shops'].map((place) => (
                                    <button
                                        key={place}
                                        onClick={() => {
                                            setSearchQuery(place);
                                            handleSearch(place);
                                        }}
                                        className="px-3 py-2.5 lg:px-4 lg:py-3 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 text-green-700 rounded-lg font-medium transition-all text-left border border-green-100 hover:border-green-200"
                                    >
                                        <div className="flex items-center gap-2 lg:gap-3">
                                            <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-green-500 rounded-full"></div>
                                            <span className="text-sm lg:text-base">{place}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Route Error Display */}
                    {routeError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-red-500 rounded-full flex-shrink-0"></div>
                                <p className="text-red-700 text-sm font-medium">{routeError}</p>
                            </div>
                        </div>
                    )}

                    {/* Route Info & Save Button */}
                    {(routeInfo && endPointInfo) || (isCalculatingRoute && endPointInfo) ? (
                        <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100">
                            {isCalculatingRoute ? (
                                <div className="flex items-center gap-2 lg:gap-3">
                                    <div className="animate-spin rounded-full h-5 w-5 lg:h-6 lg:w-6 border-2 border-blue-500 border-t-transparent"></div>
                                    <div>
                                        <p className="font-semibold text-blue-900 text-sm lg:text-base">Calculating route...</p>
                                        <p className="text-xs lg:text-sm text-blue-600">to {endPointInfo.name}</p>
                                    </div>
                                </div>
                            ) : routeInfo ? (
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-2 lg:mb-3">
                                    <div className="flex-1 mb-3 lg:mb-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`w-2.5 h-2.5 lg:w-3 lg:h-3 ${routeType === 'road' ? 'bg-blue-500' : 'bg-green-500'} rounded-full animate-pulse`}></div>
                                            <span className={`text-xs lg:text-sm font-medium ${routeType === 'road' ? 'text-blue-700' : 'text-green-700'}`}>
                                                Route by {routeType === 'road' ? 'Road' : 'Walking'}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-lg lg:text-xl text-blue-900 mb-1">{formatDuration(routeInfo.duration)}</h3>
                                        <p className="text-blue-700 font-medium text-sm lg:text-base">{formatDistance(routeInfo.distance)}</p>
                                        <p className="text-xs lg:text-sm text-blue-600 mt-1">to {endPointInfo.name}</p>
                                        
                                    </div>
                                    <button
                                        onClick={handleSaveLocation}
                                        className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-2 px-3 lg:px-4 rounded-lg flex items-center gap-2 transition-all shadow-md text-sm lg:text-base w-full lg:w-auto justify-center"
                                    >
                                        <Save size={16} className="lg:w-[18px] lg:h-[18px]"/>
                                        Save
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {/* Saved Locations */}
                    <div>
                        <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-2 lg:mb-3 flex items-center gap-2">
                            <Star size={18} className="lg:w-5 lg:h-5 text-yellow-500"/>
                            Saved Locations
                        </h3>
                        {savedLocations.length > 0 ? (
                            <div className="space-y-1.5 lg:space-y-2">
                                {savedLocations.map(loc => (
                                    <button
                                        key={loc._id as string}
                                        onClick={() => {
                                            setEndPoint({ longitude: loc.coordinates.lng, latitude: loc.coordinates.lat });
                                            setEndPointInfo({ name: loc.name, address: loc.address });
                                        }}
                                        className="w-full text-left px-3 py-2.5 lg:px-4 lg:py-3 bg-gradient-to-r from-yellow-50 to-orange-50 hover:from-yellow-100 hover:to-orange-100 text-gray-800 rounded-lg transition-all border border-yellow-100 hover:border-yellow-200"
                                    >
                                        <div className="flex items-center gap-2 lg:gap-3">
                                            {loc.name === 'Home' ? 
                                                <Home size={16} className="lg:w-[18px] lg:h-[18px] text-yellow-600 flex-shrink-0"/> : 
                                                <Navigation size={16} className="lg:w-[18px] lg:h-[18px] text-yellow-600 flex-shrink-0"/>
                                            }
                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold text-gray-900 text-sm lg:text-base">{loc.name}</div>
                                                <div className="text-xs lg:text-sm text-gray-600 truncate">{loc.address}</div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 lg:py-6 text-gray-500">
                                <Star size={32} className="lg:w-12 lg:h-12 mx-auto mb-2 text-gray-300" />
                                <p className="text-sm lg:text-base">No locations saved yet</p>
                                <p className="text-xs lg:text-sm">Search and save your favorite places</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Click outside to close suggestions */}
                {showSuggestions && (
                    <div 
                        className="fixed inset-0 z-20" 
                        onClick={() => setShowSuggestions(false)}
                    />
                )}
            </div>

            {/* Right Side - Map Container */}
            <div className="flex-1 relative min-h-[60vh] lg:min-h-0">
                <div className="h-full w-full rounded-none lg:rounded-l-2xl overflow-hidden shadow-xl lg:shadow-2xl border-0 lg:border border-gray-200">
                    <MapComponent
                        startPoint={startPoint}
                        endPoint={endPoint}
                        routeCoordinates={routeCoordinates}
                        routeType={routeType}
                    />
                </div>
                
                {/* Map overlay info */}
                {startPoint && (
                    <div className="absolute top-2 right-2 lg:top-4 lg:right-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 lg:p-3 shadow-lg border border-white/50">
                        <div className="flex items-center gap-1.5 lg:gap-2 text-xs lg:text-sm text-gray-700">
                            <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-red-500 rounded-full"></div>
                            <span className="hidden sm:inline">Current Location</span>
                            <span className="sm:hidden">Start</span>
                        </div>
                        {endPoint && (
                            <>
                                <div className="flex items-center gap-1.5 lg:gap-2 text-xs lg:text-sm text-gray-700 mt-1">
                                    <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-blue-500 rounded-full"></div>
                                    <span className="hidden sm:inline">Destination</span>
                                    <span className="sm:hidden">End</span>
                                </div>
                                {routeCoordinates && routeCoordinates.length > 2 && (
                                    <div className="flex items-center gap-1.5 lg:gap-2 text-xs text-green-600 mt-1">
                                        <div className={`w-1.5 h-0.5 lg:w-2 lg:h-1 ${routeType === 'road' ? 'bg-blue-500' : 'bg-green-500'} rounded-full`}></div>
                                        <span className="hidden sm:inline">{routeType === 'road' ? 'Road' : 'Walking'} Route ({routeCoordinates.length} points)</span>
                                        <span className="sm:hidden">{routeType === 'road' ? 'Road' : 'Walk'}</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}