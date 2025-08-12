// src/app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Users, MapPin, Activity } from 'lucide-react';

interface UserVisitSummary {
    sessionId: string;
    createdAt: string;
    locationPermissionGranted: boolean;
    city: string;
    country: string;
    totalDuration: number;
    interactionCount: number;
}

interface StatsData {
    totalVisits: number;
    visitsWithLocation: number;
    locationPermissionRate: string;
    recentVisits: UserVisitSummary[];
}

interface DetailedVisit {
    sessionId: string;
    ipAddress?: string;
    userAgent: string;
    firstVisit: string;
    lastActivity: string;
    totalDuration: number;
    locationPermissionGranted: boolean;
    locationPermissionTime?: string;
    locations: Array<{
        latitude: number;
        longitude: number;
        accuracy?: number;
        timestamp: string;
    }>;
    deviceInfo: {
        userAgent: string;
        language: string;
        platform: string;
        screenResolution: string;
        windowSize: string;
        timezone: string;
        cookieEnabled: boolean;
        onlineStatus: boolean;
    };
    networkInfo?: {
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
        saveData?: boolean;
    };
    interactionCount: number;
    searchQueries: string[];
    savedLocationsCount: number;
    city?: string;
    country?: string;
    region?: string;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [selectedVisit, setSelectedVisit] = useState<DetailedVisit | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/user-visits?stats=overview');
            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
        setLoading(false);
    };

    const fetchVisitDetails = async (sessionId: string) => {
        try {
            const response = await fetch(`/api/user-visits?sessionId=${sessionId}`);
            const data = await response.json();
            if (data.success) {
                setSelectedVisit(data.data);
            }
        } catch (error) {
            console.error('Error fetching visit details:', error);
        }
    };

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${remainingSeconds}s`;
        }
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${remainingSeconds}s`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">User Tracking Dashboard</h1>
                
                {/* Stats Overview */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <Users className="h-8 w-8 text-blue-600" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">Total Visits</p>
                                    <p className="text-2xl font-semibold text-gray-900">{stats.totalVisits}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <MapPin className="h-8 w-8 text-green-600" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">Location Enabled</p>
                                    <p className="text-2xl font-semibold text-gray-900">{stats.visitsWithLocation}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <Activity className="h-8 w-8 text-purple-600" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">Permission Rate</p>
                                    <p className="text-2xl font-semibold text-gray-900">{stats.locationPermissionRate}%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recent Visits */}
                <div className="bg-white rounded-lg shadow mb-8">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Recent Visits</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Session
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Location
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Duration
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Interactions
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Time
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stats?.recentVisits.map((visit) => (
                                    <tr key={visit.sessionId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                                            {visit.sessionId.slice(0, 8)}...
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <MapPin className={`h-4 w-4 mr-2 ${visit.locationPermissionGranted ? 'text-green-600' : 'text-red-600'}`} />
                                                <div>
                                                    <div className="text-sm text-gray-900">
                                                        {visit.city}, {visit.country}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {visit.locationPermissionGranted ? 'Granted' : 'Denied'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDuration(visit.totalDuration)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {visit.interactionCount}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(visit.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => fetchVisitDetails(visit.sessionId)}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Visit Details Modal */}
                {selectedVisit && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                        <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
                            <div className="mt-3">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Visit Details: {selectedVisit.sessionId}
                                    </h3>
                                    <button
                                        onClick={() => setSelectedVisit(null)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Basic Info */}
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-2">Session Info</h4>
                                            <div className="text-sm space-y-1">
                                                <p><span className="font-medium">IP:</span> {selectedVisit.ipAddress || 'Unknown'}</p>
                                                <p><span className="font-medium">First Visit:</span> {formatDate(selectedVisit.firstVisit)}</p>
                                                <p><span className="font-medium">Last Activity:</span> {formatDate(selectedVisit.lastActivity)}</p>
                                                <p><span className="font-medium">Duration:</span> {formatDuration(selectedVisit.totalDuration)}</p>
                                                <p><span className="font-medium">Location:</span> {selectedVisit.city}, {selectedVisit.country}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-2">Device Info</h4>
                                            <div className="text-sm space-y-1">
                                                <p><span className="font-medium">Platform:</span> {selectedVisit.deviceInfo.platform}</p>
                                                <p><span className="font-medium">Language:</span> {selectedVisit.deviceInfo.language}</p>
                                                <p><span className="font-medium">Screen:</span> {selectedVisit.deviceInfo.screenResolution}</p>
                                                <p><span className="font-medium">Window:</span> {selectedVisit.deviceInfo.windowSize}</p>
                                                <p><span className="font-medium">Timezone:</span> {selectedVisit.deviceInfo.timezone}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Activity Info */}
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-2">Activity</h4>
                                            <div className="text-sm space-y-1">
                                                <p><span className="font-medium">Interactions:</span> {selectedVisit.interactionCount}</p>
                                                <p><span className="font-medium">Saved Locations:</span> {selectedVisit.savedLocationsCount}</p>
                                                <p><span className="font-medium">Search Queries:</span> {selectedVisit.searchQueries.length}</p>
                                            </div>
                                            
                                            {selectedVisit.searchQueries.length > 0 && (
                                                <div className="mt-2">
                                                    <p className="font-medium text-gray-700">Recent Searches:</p>
                                                    <ul className="list-disc list-inside text-sm text-gray-600">
                                                        {selectedVisit.searchQueries.slice(-5).map((query, index) => (
                                                            <li key={index}>{query}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-2">Location Tracking</h4>
                                            <div className="text-sm space-y-1">
                                                <p><span className="font-medium">Permission:</span> 
                                                    <span className={`ml-1 ${selectedVisit.locationPermissionGranted ? 'text-green-600' : 'text-red-600'}`}>
                                                        {selectedVisit.locationPermissionGranted ? 'Granted' : 'Denied'}
                                                    </span>
                                                </p>
                                                {selectedVisit.locationPermissionTime && (
                                                    <p><span className="font-medium">Permission Time:</span> {formatDate(selectedVisit.locationPermissionTime)}</p>
                                                )}
                                                <p><span className="font-medium">Location Points:</span> {selectedVisit.locations.length}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* User Agent */}
                                <div className="mt-4">
                                    <h4 className="font-medium text-gray-900 mb-2">User Agent</h4>
                                    <p className="text-sm text-gray-600 bg-gray-100 p-2 rounded font-mono break-all">
                                        {selectedVisit.userAgent}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}