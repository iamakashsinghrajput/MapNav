// src/lib/userTracking.ts

// Generate unique session ID
export const generateSessionId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Get comprehensive device information
export const getDeviceInfo = () => {
    if (typeof window === 'undefined') return null;
    
    return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        windowSize: `${window.innerWidth}x${window.innerHeight}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cookieEnabled: navigator.cookieEnabled,
        onlineStatus: navigator.onLine
    };
};

// Define network connection interface
interface NetworkConnection {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
    connection?: NetworkConnection;
    mozConnection?: NetworkConnection;
    webkitConnection?: NetworkConnection;
}

// Get network information (if available)
export const getNetworkInfo = () => {
    if (typeof window === 'undefined') return null;
    
    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    
    if (connection) {
        return {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData
        };
    }
    
    return null;
};

// Enhanced geolocation options
export const getLocationOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000 // Cache for 1 minute
};

// Convert GeolocationPosition to our location format
export const formatLocationData = (position: GeolocationPosition) => {
    return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: new Date(position.timestamp)
    };
};

// Send tracking data to API
export const sendTrackingData = async (sessionId: string, type: string, data: Record<string, unknown>) => {
    try {
        const response = await fetch('/api/user-visits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId,
                type,
                data
            })
        });
        
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('Error sending tracking data:', error);
        return false;
    }
};

// User tracking class
export class UserTracker {
    private sessionId: string;
    private watchId: number | null = null;
    private activityTimer: NodeJS.Timeout | null = null;
    private locationUpdateInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.sessionId = generateSessionId();
        this.initializeTracking();
    }

    private async initializeTracking() {
        // Send initial visit data
        const deviceInfo = getDeviceInfo();
        const networkInfo = getNetworkInfo();
        
        if (deviceInfo) {
            await sendTrackingData(this.sessionId, 'initial_visit', {
                deviceInfo,
                networkInfo
            });
        }

        // Set up activity tracking
        this.setupActivityTracking();
    }

    private setupActivityTracking() {
        // Track various user interactions
        const trackActivity = () => {
            sendTrackingData(this.sessionId, 'interaction', {});
        };

        // Track clicks, scrolls, and keyboard activity
        document.addEventListener('click', trackActivity);
        document.addEventListener('scroll', trackActivity);
        document.addEventListener('keydown', trackActivity);
        
        // Track window focus/blur
        window.addEventListener('focus', trackActivity);
        window.addEventListener('blur', trackActivity);
        
        // Track page visibility changes
        document.addEventListener('visibilitychange', trackActivity);
    }

    public async requestLocationPermission(): Promise<boolean> {
        if (!navigator.geolocation) {
            console.warn('Geolocation is not supported by this browser.');
            return false;
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const locationData = formatLocationData(position);
                    
                    // Send location permission granted event
                    await sendTrackingData(this.sessionId, 'location_permission', {
                        granted: true,
                        location: locationData
                    });
                    
                    // Start continuous location tracking
                    this.startLocationTracking();
                    
                    resolve(true);
                },
                async (error) => {
                    console.warn('Location access denied:', error);
                    
                    // Send location permission denied event
                    await sendTrackingData(this.sessionId, 'location_permission', {
                        granted: false,
                        error: error.message
                    });
                    
                    resolve(false);
                },
                getLocationOptions
            );
        });
    }

    private startLocationTracking() {
        // Watch position changes
        this.watchId = navigator.geolocation.watchPosition(
            async (position) => {
                const locationData = formatLocationData(position);
                await sendTrackingData(this.sessionId, 'location_update', {
                    location: locationData
                });
            },
            (error) => {
                console.warn('Location tracking error:', error);
            },
            getLocationOptions
        );

        // Also update location every minute regardless of movement
        this.locationUpdateInterval = setInterval(() => {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const locationData = formatLocationData(position);
                    await sendTrackingData(this.sessionId, 'location_update', {
                        location: locationData
                    });
                },
                (error) => console.warn('Periodic location update failed:', error),
                getLocationOptions
            );
        }, 60000); // Every 60 seconds
    }

    public async trackSearchQuery(query: string) {
        await sendTrackingData(this.sessionId, 'interaction', {
            searchQuery: query
        });
    }

    public async trackLocationSave() {
        await sendTrackingData(this.sessionId, 'interaction', {
            savedLocation: true
        });
    }

    public getSessionId(): string {
        return this.sessionId;
    }

    public cleanup() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        if (this.activityTimer) {
            clearTimeout(this.activityTimer);
            this.activityTimer = null;
        }

        if (this.locationUpdateInterval) {
            clearInterval(this.locationUpdateInterval);
            this.locationUpdateInterval = null;
        }
    }
}