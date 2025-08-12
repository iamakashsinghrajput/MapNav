// src/models/UserVisit.ts
import mongoose, { Schema, Document, models, Model } from 'mongoose';

// Location tracking interface
interface ILocationData {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number;
    altitudeAccuracy?: number;
    heading?: number;
    speed?: number;
    timestamp: Date;
}

// Browser/Device information interface
interface IDeviceInfo {
    userAgent: string;
    language: string;
    platform: string;
    screenResolution: string;
    windowSize: string;
    timezone: string;
    cookieEnabled: boolean;
    onlineStatus: boolean;
}

// Network information interface (if available)
interface INetworkInfo {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
}

// Main UserVisit interface
export interface IUserVisit extends Document {
    sessionId: string;
    ipAddress?: string;
    userAgent: string;
    
    // Visit timing
    firstVisit: Date;
    lastActivity: Date;
    totalDuration: number; // in seconds
    
    // Location data
    locations: ILocationData[];
    currentLocation?: ILocationData;
    locationPermissionGranted: boolean;
    locationPermissionTime?: Date;
    
    // Device/Browser info
    deviceInfo: IDeviceInfo;
    networkInfo?: INetworkInfo;
    
    // Interaction data
    pageViews: number;
    interactionCount: number;
    searchQueries: string[];
    savedLocationsCount: number;
    
    // Geographic details
    city?: string;
    country?: string;
    region?: string;
    
    // Metadata
    createdAt: Date;
    updatedAt: Date;
}

const LocationDataSchema = new Schema<ILocationData>({
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number },
    altitude: { type: Number },
    altitudeAccuracy: { type: Number },
    heading: { type: Number },
    speed: { type: Number },
    timestamp: { type: Date, required: true, default: Date.now }
});

const DeviceInfoSchema = new Schema<IDeviceInfo>({
    userAgent: { type: String, required: true },
    language: { type: String, required: true },
    platform: { type: String, required: true },
    screenResolution: { type: String, required: true },
    windowSize: { type: String, required: true },
    timezone: { type: String, required: true },
    cookieEnabled: { type: Boolean, required: true },
    onlineStatus: { type: Boolean, required: true }
});

const NetworkInfoSchema = new Schema<INetworkInfo>({
    effectiveType: { type: String },
    downlink: { type: Number },
    rtt: { type: Number },
    saveData: { type: Boolean }
});

const UserVisitSchema: Schema<IUserVisit> = new Schema({
    sessionId: { type: String, required: true, unique: true },
    ipAddress: { type: String },
    userAgent: { type: String, required: true },
    
    // Visit timing
    firstVisit: { type: Date, required: true, default: Date.now },
    lastActivity: { type: Date, required: true, default: Date.now },
    totalDuration: { type: Number, default: 0 },
    
    // Location data
    locations: [LocationDataSchema],
    currentLocation: LocationDataSchema,
    locationPermissionGranted: { type: Boolean, default: false },
    locationPermissionTime: { type: Date },
    
    // Device/Browser info
    deviceInfo: { type: DeviceInfoSchema, required: true },
    networkInfo: NetworkInfoSchema,
    
    // Interaction data
    pageViews: { type: Number, default: 1 },
    interactionCount: { type: Number, default: 0 },
    searchQueries: [{ type: String }],
    savedLocationsCount: { type: Number, default: 0 },
    
    // Geographic details
    city: { type: String },
    country: { type: String },
    region: { type: String }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

// Add indexes for better query performance
UserVisitSchema.index({ sessionId: 1 });
UserVisitSchema.index({ createdAt: -1 });
UserVisitSchema.index({ locationPermissionGranted: 1 });
UserVisitSchema.index({ 'currentLocation.timestamp': -1 });

// Prevent model overwrite in hot-reloading environments
const UserVisit: Model<IUserVisit> = models.UserVisit || mongoose.model<IUserVisit>('UserVisit', UserVisitSchema);

export default UserVisit;