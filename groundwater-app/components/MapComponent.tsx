// components/MapComponent.tsx
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import type { WellStats } from '../utils/dataUtils';

type Props = {
  wells: WellStats[];
  onSelectWell: (id: string) => void;
};

const colorForSeverity = (s: WellStats['severity']) => {
  if (s === 'critical') return 'red';
  if (s === 'warning') return 'orange';
  return 'green';
};

export default function MapComponent({ wells, onSelectWell }: Props) {
  if (!wells || wells.length === 0) {
    return (
      <View style={styles.empty}>
        <Text>No wells loaded. Use "Import CSV" to pick a file.</Text>
      </View>
    );
  }

  const avgLat = wells.reduce((a, w) => a + w.lat, 0) / wells.length;
  const avgLong = wells.reduce((a, w) => a + w.long, 0) / wells.length;

  const region: Region = {
    latitude: avgLat,
    longitude: avgLong,
    latitudeDelta: 2.5,
    longitudeDelta: 2.5,
  };

  return (
    <MapView style={styles.map} initialRegion={region}>
      {wells.map(w => (
        <Marker
          key={w.id}
          coordinate={{ latitude: w.lat, longitude: w.long }}
          pinColor={colorForSeverity(w.severity)}
          onPress={() => onSelectWell(w.id)}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
