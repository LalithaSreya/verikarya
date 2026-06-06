import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet icon paths which break under Vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

export const LeafletMap = ({ targetLoc, currentLoc, geofenceRadius = 100 }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Leaflet map if it hasn't been created yet
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(
        [targetLoc.lat, targetLoc.lng],
        16
      );

      // Add standard OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);

      // Create a layer group for markers
      markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;

    // Clear previous markers/circles
    markersLayer.clearLayers();

    // 1. Plot Target Location
    const targetMarker = L.marker([targetLoc.lat, targetLoc.lng])
      .bindPopup('<b>Target Destination</b><br />Submit visits here.');
    markersLayer.addLayer(targetMarker);

    // 2. Add 100m Geofence Circle
    const geofenceCircle = L.circle([targetLoc.lat, targetLoc.lng], {
      color: '#14B8A6',       // Secondary color (teal)
      fillColor: '#14B8A6',
      fillOpacity: 0.15,
      radius: geofenceRadius
    });
    markersLayer.addLayer(geofenceCircle);

    // 3. Plot Current Location if available
    let bounds = L.latLngBounds([targetLoc.lat, targetLoc.lng]);

    if (currentLoc && currentLoc.lat !== undefined && currentLoc.lng !== undefined) {
      // Create a custom red icon for employee current position
      const employeeIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      const currentMarker = L.marker([currentLoc.lat, currentLoc.lng], { icon: employeeIcon })
        .bindPopup('<b>Your Current Location</b>');
      
      markersLayer.addLayer(currentMarker);
      bounds.extend([currentLoc.lat, currentLoc.lng]);
      
      // Fit map to show both markers with some padding
      map.fitBounds(bounds, { padding: [40, 40] });
    } else {
      // Zoom to target center
      map.setView([targetLoc.lat, targetLoc.lng], 16);
    }

    // Force Leaflet recalculation after load
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

  }, [targetLoc, currentLoc, geofenceRadius]);

  // Clean up map instance on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return <div ref={mapContainerRef} className="map-wrapper" />;
};

export default LeafletMap;
