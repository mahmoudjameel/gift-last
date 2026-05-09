import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Constants from 'expo-constants';

interface GoogleMapWebProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  onPress?: (coords: { latitude: number; longitude: number }) => void;
  onRegionChange?: (region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }) => void;
  style?: any;
  showUserLocation?: boolean;
  radiusKm?: number;
}

const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  (Constants.expoConfig?.extra as { googleMapsApiKey?: string } | undefined)?.googleMapsApiKey ||
  '';

const MAP_STYLES = JSON.stringify([
  { elementType: "geometry", stylers: [{ color: "#f8f9fa" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f8f9fa" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#f0f4f0" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#e8f5e9" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#e0e0e0" }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#e0e0e0" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#dce8f5" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] }
]);

export default function GoogleMapWeb({
  latitude,
  longitude,
  zoom = 14,
  onPress,
  onRegionChange,
  style,
  radiusKm,
}: GoogleMapWebProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeReady, setIframeReady] = useState(false);

  const parentOrigin = typeof window !== 'undefined' ? window.location.origin : '*';

  const generateHTML = useCallback(() => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    let map, marker, circle;
    const initialLat = ${latitude};
    const initialLng = ${longitude};
    const initialZoom = ${zoom};
    const radiusKm = ${radiusKm || 0};
    const parentOrigin = '${parentOrigin}';
    const mapStyles = ${MAP_STYLES};

    function initMap() {
      map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: initialLat, lng: initialLng },
        zoom: initialZoom,
        disableDefaultUI: true,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy',
        styles: mapStyles
      });

      const markerSvg = {
        path: 'M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0zm0 17a5 5 0 110-10 5 5 0 010 10z',
        fillColor: '#7C3AED',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        scale: 1.6,
        anchor: new google.maps.Point(12, 36),
      };

      marker = new google.maps.Marker({
        position: { lat: initialLat, lng: initialLng },
        map: map,
        draggable: true,
        animation: google.maps.Animation.DROP,
        icon: markerSvg
      });

      if (radiusKm > 0) {
        circle = new google.maps.Circle({
          map: map,
          center: { lat: initialLat, lng: initialLng },
          radius: radiusKm * 1000,
          fillColor: '#7C3AED',
          fillOpacity: 0.06,
          strokeColor: '#7C3AED',
          strokeOpacity: 0.25,
          strokeWeight: 2,
        });
      }

      map.addListener('click', function(e) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        marker.setPosition({ lat, lng });
        if (circle) circle.setCenter({ lat, lng });
        window.parent.postMessage(JSON.stringify({ type: 'mapPress', latitude: lat, longitude: lng }), parentOrigin);
      });

      marker.addListener('dragend', function() {
        const pos = marker.getPosition();
        const lat = pos.lat();
        const lng = pos.lng();
        if (circle) circle.setCenter({ lat, lng });
        window.parent.postMessage(JSON.stringify({ type: 'mapPress', latitude: lat, longitude: lng }), parentOrigin);
      });

      map.addListener('idle', function() {
        const center = map.getCenter();
        const bounds = map.getBounds();
        if (bounds) {
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          window.parent.postMessage(JSON.stringify({
            type: 'regionChange',
            latitude: center.lat(),
            longitude: center.lng(),
            latitudeDelta: ne.lat() - sw.lat(),
            longitudeDelta: ne.lng() - sw.lng(),
          }), parentOrigin);
        }
      });

      window.addEventListener('message', function(event) {
        if (event.origin !== 'null' && event.origin !== parentOrigin) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'updateMarker') {
            const pos = { lat: data.latitude, lng: data.longitude };
            marker.setPosition(pos);
            if (circle) circle.setCenter(pos);
            if (data.animate) {
              map.panTo(pos);
              if (data.zoom) map.setZoom(data.zoom);
            }
          }
          if (data.type === 'setZoom') {
            map.setZoom(data.zoom);
          }
        } catch (e) {}
      });

      window.parent.postMessage(JSON.stringify({ type: 'mapReady' }), parentOrigin);
    }
  <\/script>
  <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap&v=weekly" async defer><\/script>
</body>
</html>`;
  }, [latitude, longitude, zoom, radiusKm, parentOrigin]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'null' && event.origin !== window.location.origin) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.type === 'mapReady') {
          setIframeReady(true);
        }
        if (data.type === 'mapPress' && onPress) {
          onPress({ latitude: data.latitude, longitude: data.longitude });
        }
        if (data.type === 'regionChange' && onRegionChange) {
          onRegionChange(data);
        }
      } catch (e) {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onPress, onRegionChange]);

  useEffect(() => {
    if (iframeReady && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ type: 'updateMarker', latitude, longitude, animate: true, zoom }),
        '*'
      );
    }
  }, [latitude, longitude, iframeReady]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <View style={[styles.container, style]}>
        <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f4f0' }]}>
          <iframe
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.05},${latitude - 0.05},${longitude + 0.05},${latitude + 0.05}&layer=mapnik&marker=${latitude},${longitude}`}
            style={{ width: '100%', height: '100%', border: 'none' } as any}
          />
        </View>
      </View>
    );
  }

  const html = generateHTML();
  const blob = new Blob([html], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);

  return (
    <View style={[styles.container, style]}>
      <iframe
        ref={iframeRef as any}
        src={blobUrl}
        style={{ width: '100%', height: '100%', border: 'none' } as any}
        allow="geolocation"
      />
    </View>
  );
}

export function updateMapMarker(iframeRef: React.RefObject<HTMLIFrameElement>, lat: number, lng: number, animate = true) {
  if (iframeRef.current?.contentWindow) {
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ type: 'updateMarker', latitude: lat, longitude: lng, animate }),
      '*'
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
