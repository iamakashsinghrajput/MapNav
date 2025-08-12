// src/models/Location.ts
import mongoose, { Schema, Document, models, Model } from 'mongoose';

export interface ILocation extends Document {
    name: string;
    address: string;
    coordinates: {
        lng: number;
        lat: number;
    };
}

const LocationSchema: Schema<ILocation> = new Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    coordinates: {
        lng: { type: Number, required: true },
        lat: { type: Number, required: true },
    },
});

// Prevent model overwrite in hot-reloading environments
const Location: Model<ILocation> = models.Location || mongoose.model<ILocation>('Location', LocationSchema);

export default Location;