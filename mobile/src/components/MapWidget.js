import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { COLORS } from '../styles/globalStyles';

export default function MapWidget({ userLocation, targetLocation, clientName }) {
  if (!targetLocation || targetLocation.lat === undefined || targetLocation.lng === undefined) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackText}>Invalid client target location coordinates.</Text>
      </View>
    );
  }

  const region = {
    latitude: targetLocation.lat,
    longitude: targetLocation.lng,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={region}
        showsUserLocation={false}
      >
        <Marker
          coordinate={{
            latitude: targetLocation.lat,
            longitude: targetLocation.lng,
          }}
          title={clientName || 'Target Site'}
          description="Client Geofence Hub"
          pinColor={COLORS.primary}
        />

        <Circle
          center={{
            latitude: targetLocation.lat,
            longitude: targetLocation.lng,
          }}
          radius={100}
          strokeColor="rgba(20, 184, 166, 0.5)"
          fillColor="rgba(20, 184, 166, 0.15)"
          strokeWidth={2}
        />

        {userLocation && userLocation.lat !== undefined && userLocation.lng !== undefined && (
          <Marker
            coordinate={{
              latitude: userLocation.lat,
              longitude: userLocation.lng,
            }}
            title="Your Current Location"
            pinColor={COLORS.danger}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  fallbackContainer: {
    height: 200,
    borderRadius: 8,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  fallbackText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
