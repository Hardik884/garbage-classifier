"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Loader2, ExternalLink, Navigation } from "lucide-react";

type Place = {
  name: string;
  address: string;
  distance_km: number;
  location: { lat: number; lng: number };
  amenity_type?: string;
  opening_hours?: string;
  recycling_types?: string[];
  phone?: string;
  website?: string;
};

type PlacesResponse = {
  count: number;
  results: Place[];
  query_info: {
    latitude: number;
    longitude: number;
    radius_meters: number;
    material: string;
  };
};

export function FindRecycling({ material }: { material: string }) {
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const findNearbyPlaces = () => {
    setError(null);
    setLoading(true);
    setPlaces(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation({ lat, lng });

          // Call the backend /places endpoint
          const response = await fetch(
            `http://localhost:8001/places?lat=${lat}&lng=${lng}&material=${encodeURIComponent(
              material
            )}&radius=10000`
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.detail || `Server error: ${response.status}`
            );
          }

          const data: PlacesResponse = await response.json();
          setPlaces(data.results);

          if (data.results.length === 0) {
            setError(
              "No recycling points found nearby. Try increasing the search radius or checking a different area."
            );
          }
        } catch (err: any) {
          setError(err.message || "Failed to fetch nearby places");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        let message = "Unable to get your location.";
        if (err.code === 1) {
          message = "Location permission denied. Please enable location access.";
        } else if (err.code === 2) {
          message = "Location unavailable. Please check your device settings.";
        } else if (err.code === 3) {
          message = "Location request timed out. Please try again.";
        }
        setError(message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const getDirectionsUrl = (place: Place) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${place.location.lat},${place.location.lng}`;
  };

  const getMapSearchUrl = (place: Place) => {
    return `https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <MapPin className="size-5" />
          Find Nearby Recycling Points
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Find recycling centers and waste disposal points near you for{" "}
            <span className="font-semibold capitalize">{material}</span>.
          </p>
          <Button
            onClick={findNearbyPlaces}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Finding locations...
              </>
            ) : (
              <>
                <Navigation className="mr-2 size-4" />
                Find Nearby Points
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {places && places.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">
              Found {places.length} location{places.length !== 1 ? "s" : ""}{" "}
              nearby:
            </p>
            <div className="space-y-3">
              {places.slice(0, 10).map((place, index) => (
                <div
                  key={`${place.location.lat}-${place.location.lng}-${index}`}
                  className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <h4 className="font-semibold">{place.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {place.address}
                      </p>
                      {place.amenity_type && (
                        <p className="text-xs text-muted-foreground capitalize">
                          Type: {place.amenity_type.replace("_", " ")}
                        </p>
                      )}
                      {place.recycling_types &&
                        place.recycling_types.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Accepts:{" "}
                            {place.recycling_types
                              .slice(0, 5)
                              .map((t) => t.replace("_", " "))
                              .join(", ")}
                          </p>
                        )}
                      {place.opening_hours && (
                        <p className="text-xs text-muted-foreground">
                          Hours: {place.opening_hours}
                        </p>
                      )}
                      {place.phone && (
                        <p className="text-xs text-muted-foreground">
                          Phone: {place.phone}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-sm font-semibold text-primary">
                        {place.distance_km} km
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="h-8 text-xs"
                        >
                          <a
                            href={getDirectionsUrl(place)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Directions
                            <ExternalLink className="ml-1 size-3" />
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="h-8 text-xs"
                        >
                          <a
                            href={getMapSearchUrl(place)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Map
                            <ExternalLink className="ml-1 size-3" />
                          </a>
                        </Button>
                      </div>
                      {place.website && (
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                          className="h-6 text-xs"
                        >
                          <a
                            href={place.website}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Website
                            <ExternalLink className="ml-1 size-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
