// components/WellModal.tsx
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { VictoryChart, VictoryLine, VictoryScatter, VictoryAxis, VictoryTheme, VictoryLegend } from 'victory-native';
import type { WellStats } from '../utils/dataUtils';

type Props = {
  visible: boolean;
  onClose: () => void;
  well?: WellStats | null;
};

const { width } = Dimensions.get('window');

export default function WellModal({ visible, onClose, well }: Props) {
  if (!well) return null;

  const series = well.timeseries.map(p => ({ x: p.date, y: p.waterlevel }));
  const forecast = well.forecast.map(p => ({ x: p.date, y: p.waterlevel }));

  const formatDateTick = (t: Date | number) => {
    const d = new Date(t);
    return d.getFullYear();
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.header}>
        <Text style={styles.title}>Well {well.id}</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.close}>Close</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.info}>
          <Text>Location: {well.lat}, {well.long}</Text>
          <Text>Last measured: {well.lastMeasurement.date.toDateString()}</Text>
          <Text>Value: {well.lastMeasurement.waterlevel.toFixed(2)}</Text>
          <Text>10-year avg: {well.tenYearAvg ? well.tenYearAvg.toFixed(2) : 'n/a'}</Text>
          <Text>Slope: {well.linearRegression ? well.linearRegression.slope.toFixed(3) + ' /yr' : 'n/a'}</Text>
          <Text>Severity: {well.severity}</Text>
          <Text>Percent drop vs 10y avg: {well.pctDrop !== null ? well.pctDrop.toFixed(1) + '%' : 'n/a'}</Text>
        </View>

        <View style={{ height: 360, padding: 8 }}>
          <VictoryChart
            theme={VictoryTheme.material}
            width={width - 16}
            height={340}
            scale={{ x: 'time' }}
          >
            <VictoryLegend x={60} y={0}
              orientation="horizontal"
              gutter={20}
              data={[
                { name: "Observed", symbol: { fill: "#1f78b4" } },
                { name: "Forecast", symbol: { fill: "#777777" } }
              ]}
            />
            <VictoryAxis tickFormat={formatDateTick} />
            <VictoryAxis dependentAxis />
            <VictoryLine data={series} style={{ data: { stroke: "#1f78b4", strokeWidth: 2 } }} />
            <VictoryScatter data={series} size={3} style={{ data: { fill: "#1f78b4" } }} />
            {forecast.length > 0 && (
              <>
                <VictoryLine data={forecast} style={{ data: { stroke: "#777777", strokeDasharray: '6,6' } }} />
                <VictoryScatter data={forecast} size={3} style={{ data: { fill: "#777777" } }} />
              </>
            )}
          </VictoryChart>
        </View>

        <View style={styles.notes}>
          <Text style={{ fontWeight: '600' }}>Interpretation</Text>
          <Text>- Markers: green = OK, orange = warning, red = critical</Text>
          <Text>- Forecast is a simple linear extrapolation from historical trend (for MVP). Use more advanced models for production.</Text>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 40, paddingHorizontal: 16, paddingBottom: 8, backgroundColor: '#f7f7f7', flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '600' },
  close: { color: 'blue', fontSize: 16 },
  container: { paddingBottom: 60 },
  info: { padding: 12, backgroundColor: '#fff' },
  notes: { marginTop: 12, padding: 12, backgroundColor: '#fff' }
});
