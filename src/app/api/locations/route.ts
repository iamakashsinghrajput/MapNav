// src/app/api/locations/route.ts
import dbConnect from "@/lib/mongodb";
import Location, { ILocation } from "@/models/Location";
import { NextResponse } from "next/server";

// GET handler to fetch all saved locations
export async function GET() {
    await dbConnect();
    try {
        const locations = await Location.find({});
        return NextResponse.json({ success: true, data: locations });
    } catch {
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}

// POST handler to save a new location
export async function POST(request: Request) {
    await dbConnect();
    try {
        const body: Omit<ILocation, '_id' | 'createdAt' | 'updatedAt'> = await request.json();

        // Basic validation
        if (!body.name || !body.address || !body.coordinates) {
             return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        const newLocation = await Location.create(body);
        return NextResponse.json({ success: true, data: newLocation }, { status: 201 });
    } catch {
         return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}