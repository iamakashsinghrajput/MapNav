// src/app/api/user-visits/route.ts
import dbConnect from "@/lib/mongodb";
import UserVisit from "@/models/UserVisit";
import { NextRequest, NextResponse } from "next/server";

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const real = request.headers.get('x-real-ip');
    const cloudflare = request.headers.get('cf-connecting-ip');
    
    if (forwarded) return forwarded.split(',')[0].trim();
    if (real) return real;
    if (cloudflare) return cloudflare;
    
    return 'unknown';
}

// Helper function to get geographic data from IP (using free service)
async function getGeographicData(ip: string) {
    if (ip === 'unknown' || ip.startsWith('192.168.') || ip.startsWith('127.')) {
        return { city: 'Unknown', country: 'Unknown', region: 'Unknown' };
    }
    
    try {
        // Using free ipapi.co service (1000 requests/day limit)
        const response = await fetch(`http://ipapi.co/${ip}/json/`);
        const data = await response.json();
        
        return {
            city: data.city || 'Unknown',
            country: data.country_name || 'Unknown',
            region: data.region || 'Unknown'
        };
    } catch (error) {
        console.error('Error fetching geographic data:', error);
        return { city: 'Unknown', country: 'Unknown', region: 'Unknown' };
    }
}

// POST - Create or update user visit
export async function POST(request: NextRequest) {
    await dbConnect();
    
    try {
        const body = await request.json();
        const userAgent = request.headers.get('user-agent') || 'Unknown';
        const clientIP = getClientIP(request);
        
        const { sessionId, type, data } = body;
        
        if (!sessionId) {
            return NextResponse.json(
                { success: false, error: "Session ID is required" }, 
                { status: 400 }
            );
        }

        // Find existing visit or create new one
        let userVisit = await UserVisit.findOne({ sessionId });
        
        if (type === 'initial_visit') {
            if (!userVisit) {
                // Get geographic data
                const geoData = await getGeographicData(clientIP);
                
                // Create new visit record
                userVisit = new UserVisit({
                    sessionId,
                    ipAddress: clientIP,
                    userAgent,
                    deviceInfo: data.deviceInfo,
                    networkInfo: data.networkInfo,
                    ...geoData
                });
                
                await userVisit.save();
            }
        } 
        else if (type === 'location_permission') {
            if (userVisit) {
                userVisit.locationPermissionGranted = data.granted;
                userVisit.locationPermissionTime = new Date();
                userVisit.lastActivity = new Date();
                
                if (data.granted && data.location) {
                    const currentLocation = {
                        ...data.location,
                        timestamp: new Date()
                    };
                    userVisit.currentLocation = currentLocation;
                    userVisit.locations.push(currentLocation);
                }
                
                await userVisit.save();
            }
        }
        else if (type === 'location_update') {
            if (userVisit && data.location) {
                const newLocation = {
                    ...data.location,
                    timestamp: new Date()
                };
                
                userVisit.currentLocation = newLocation;
                userVisit.locations.push(newLocation);
                userVisit.lastActivity = new Date();
                
                // Calculate total duration
                const duration = Math.floor((new Date().getTime() - userVisit.firstVisit.getTime()) / 1000);
                userVisit.totalDuration = duration;
                
                await userVisit.save();
            }
        }
        else if (type === 'interaction') {
            if (userVisit) {
                userVisit.interactionCount += 1;
                userVisit.lastActivity = new Date();
                
                if (data.searchQuery) {
                    userVisit.searchQueries.push(data.searchQuery);
                }
                
                if (data.savedLocation) {
                    userVisit.savedLocationsCount += 1;
                }
                
                // Calculate total duration
                const duration = Math.floor((new Date().getTime() - userVisit.firstVisit.getTime()) / 1000);
                userVisit.totalDuration = duration;
                
                await userVisit.save();
            }
        }
        
        return NextResponse.json({ 
            success: true, 
            data: { sessionId: userVisit?.sessionId, id: userVisit?._id }
        });
        
    } catch (error) {
        console.error('Error in user-visits API:', error);
        return NextResponse.json(
            { success: false, error: "Server error" }, 
            { status: 500 }
        );
    }
}

// GET - Retrieve user visit statistics (for admin purposes)
export async function GET(request: NextRequest) {
    await dbConnect();
    
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');
        const stats = searchParams.get('stats');
        
        if (sessionId) {
            // Get specific visit
            const visit = await UserVisit.findOne({ sessionId });
            return NextResponse.json({ success: true, data: visit });
        }
        
        if (stats === 'overview') {
            // Get overall statistics
            const totalVisits = await UserVisit.countDocuments();
            const withLocation = await UserVisit.countDocuments({ locationPermissionGranted: true });
            const recentVisits = await UserVisit.find({}).sort({ createdAt: -1 }).limit(10);
            
            const statsData = {
                totalVisits,
                visitsWithLocation: withLocation,
                locationPermissionRate: totalVisits > 0 ? ((withLocation / totalVisits) * 100).toFixed(1) : 0,
                recentVisits: recentVisits.map(visit => ({
                    sessionId: visit.sessionId,
                    createdAt: visit.createdAt,
                    locationPermissionGranted: visit.locationPermissionGranted,
                    city: visit.city,
                    country: visit.country,
                    totalDuration: visit.totalDuration,
                    interactionCount: visit.interactionCount
                }))
            };
            
            return NextResponse.json({ success: true, data: statsData });
        }
        
        // Get all visits (with pagination)
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;
        
        const visits = await UserVisit.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        const total = await UserVisit.countDocuments();
        
        return NextResponse.json({
            success: true,
            data: {
                visits,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Error fetching user visits:', error);
        return NextResponse.json(
            { success: false, error: "Server error" }, 
            { status: 500 }
        );
    }
}