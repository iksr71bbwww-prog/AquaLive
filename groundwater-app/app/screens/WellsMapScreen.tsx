import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  ScrollView
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import MapView, { Marker, Region } from 'react-native-maps';

// Types for your MongoDB data structure
interface WellLocation {
  id: string;
  lat: number;
  long: number;
  waterlevel: number; // DTWL - Depth to Water Level
  date: string;
  count?: number; // Number of records for this location
  min_waterlevel?: number;
  max_waterlevel?: number;
  dateRange?: string;
}

interface WellDetails {
  location: { lat: number; lng: number };
  count: number;
  timeseries: Array<{
    date: string;
    waterlevel: number;
    lat: number;
    long: number;
  }>;
  statistics: {
    average: number;
    minimum: number;
    maximum: number;
    trend: string;
  };
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [wells, setWells] = useState<WellLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWell, setSelectedWell] = useState<WellLocation | null>(null);
  const [wellDetails, setWellDetails] = useState<WellDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  // Load data from MongoDB via backend API
  useEffect(() => {
    loadWellsData();
  }, []);

  const loadWellsData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Starting to load wells data from MongoDB...');
      
      console.log('📡 Fetching wells data from API...');
      // Use your real IP first
      const possibleUrls = [
        'http://10.194.52.189:8000', // <-- Your computer's actual IP
        'http://10.0.2.2:8000',      // Android emulator
        'http://localhost:8000',     // iOS simulator
        'http://127.0.0.1:8000'      // Alternative localhost
      ];
      
      let response;
      let lastError;
      
      for (const url of possibleUrls) {
        try {
          console.log(`🔗 Trying API URL: ${url}`);
          response = await axios.get(`${url}/wells`, {
            timeout: 30000 // 30 second timeout for large dataset
          });
          console.log(`✅ Successfully connected to: ${url}`);
          break;
        } catch (error) {
          console.log(`❌ Failed to connect to: ${url}`, error);
          lastError = error;
        }
      }
      
      if (!response) {
        throw lastError || new Error('Could not connect to any backend URL');
      }

      if (!response.data.success) {
        throw new Error('API responded with error');
      }
      
      const wellsData = response.data.data;
      setTotalRecords(response.data.total_records || wellsData.length);
      console.log(`📊 Retrieved ${wellsData.length} unique wells from ${response.data.total_records || 'unknown'} total records`);
      
      if (wellsData.length === 0) {
        throw new Error('No wells data found in database');
      }
      
      // Process the aggregated MongoDB data
      const processedWells: WellLocation[] = wellsData.map((well: any, index: number) => ({
        id: `well_${index}`,
        lat: well.lat,
        long: well.long,
        waterlevel: well.waterlevel,
        date: well.date,
        count: well.count,
        min_waterlevel: well.min_waterlevel,
        max_waterlevel: well.max_waterlevel,
        dateRange: well.date_range
      }));
      
      setWells(processedWells);
      console.log(`🎉 Successfully loaded ${processedWells.length} unique well locations`);
      
      Alert.alert(
        'Wells Data Loaded Successfully!', 
        `✅ Loaded ${processedWells.length} unique well locations from ${response.data.total_records?.toLocaleString() || 'many'} total records.\n\nTap any well marker to see detailed water level history.`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Error loading wells data:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('timeout')) {
        Alert.alert(
          'Timeout Error', 
          'The request timed out. Your dataset is very large. Please try again.',
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('Network Error') || errorMessage.includes('ECONNREFUSED')) {
        Alert.alert(
          'Connection Error', 
          `Cannot connect to the backend server.\n\nError: ${errorMessage}\n\nTroubleshooting:\n1. Ensure backend server is running (python wells_server.py)\n2. For Android emulator: Use 10.0.2.2:8000\n3. For iOS simulator: Use localhost:8000\n4. For physical device: Use your computer's IP address`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Data Loading Error', 
          `Failed to load wells data: ${errorMessage}`,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const loadWellDetails = async (well: WellLocation) => {
    try {
      setDetailsLoading(true);
      console.log(`📊 Loading details for well at ${well.lat}, ${well.long}`);
      
      const possibleUrls = [
        'http://10.194.52.189:8000',
        'http://10.0.2.2:8000',
        'http://localhost:8000',
        'http://127.0.0.1:8000'
      ];
      
      let response;
      
      for (const url of possibleUrls) {
        try {
          response = await axios.get(`${url}/well-details/${well.lat}/${well.long}`, {
            timeout: 15000
          });
          break;
        } catch (error) {
          continue;
        }
      }
      
      if (response && response.data.success) {
        setWellDetails(response.data);
        console.log(`✅ Loaded ${response.data.count} records for well`);
      } else {
        Alert.alert('Error', 'Could not load detailed data for this well');
      }
      
    } catch (error) {
      console.error('❌ Error loading well details:', error);
      Alert.alert('Error', 'Failed to load well details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleWellPress = (well: WellLocation) => {
    setSelectedWell(well);
    loadWellDetails(well);
  };

  const handleCloseModal = () => {
    setSelectedWell(null);
    setWellDetails(null);
  };

  const getMarkerColor = (waterlevel: number) => {
    // Color coding based on DTWL (Depth to Water Level)
    // Green: Good (shallow water, < 3m)
    // Yellow: Moderate (3-8m) 
    // Orange: Concerning (8-15m)
    // Red: Critical (> 15m)
    if (waterlevel < 3) return '#4CAF50'; // Green
    if (waterlevel < 8) return '#FFC107'; // Yellow
    if (waterlevel < 15) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  // Calculate map region to show all wells
  const getMapRegion = (): Region => {
    if (wells.length === 0) {
      // Default to India
      return {
        latitude: 20.5937,
        longitude: 78.9629,
        latitudeDelta: 20,
        longitudeDelta: 20,
      };
    }

    const latitudes = wells.map(w => w.lat);
    const longitudes = wells.map(w => w.long);
    
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    
    const latDelta = (maxLat - minLat) * 1.2; // Add 20% padding
    const lngDelta = (maxLng - minLng) * 1.2;
    
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(latDelta, 0.1),
      longitudeDelta: Math.max(lngDelta, 0.1),
    };
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
        backgroundColor="transparent"
        translucent
      />
      
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Text style={styles.title}>Groundwater Wells - India</Text>
        <Text style={styles.subtitle}>
          {wells.length > 0 
            ? `${wells.length.toLocaleString()} unique locations • ${totalRecords.toLocaleString()} total records` 
            : 'Loading wells data...'
          }
        </Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Loading wells data from MongoDB...</Text>
            <Text style={styles.loadingSubtext}>Processing large dataset...</Text>
          </View>
        ) : wells.length > 0 ? (
          <MapView 
            style={styles.map}
            region={getMapRegion()}
            showsUserLocation={false}
            showsMyLocationButton={false}
          >
            {wells.map((well) => (
              <Marker
                key={well.id}
                coordinate={{ latitude: well.lat, longitude: well.long }}
                onPress={() => handleWellPress(well)}
                pinColor={getMarkerColor(well.waterlevel)}
              />
            ))}
          </MapView>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No wells data available</Text>
            <Text style={styles.noDataSubtext}>
              Please check your MongoDB connection and data
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadWellsData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Well Details Modal */}
      <Modal
        visible={!!selectedWell}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Well Details</Text>
            <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {selectedWell && (
              <>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationTitle}>Location</Text>
                  <Text style={styles.locationText}>
                    Latitude: {selectedWell.lat.toFixed(4)}°
                  </Text>
                  <Text style={styles.locationText}>
                    Longitude: {selectedWell.long.toFixed(4)}°
                  </Text>
                </View>

                <View style={styles.statsContainer}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Current DTWL</Text>
                    <Text style={styles.statValue}>{selectedWell.waterlevel.toFixed(2)}m</Text>
                  </View>
                  
                  {selectedWell.count && (
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Data Points</Text>
                      <Text style={styles.statValue}>{selectedWell.count.toLocaleString()}</Text>
                    </View>
                  )}
                  
                  {selectedWell.min_waterlevel && selectedWell.max_waterlevel && (
                    <>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Min DTWL</Text>
                        <Text style={styles.statValue}>{selectedWell.min_waterlevel.toFixed(2)}m</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Max DTWL</Text>
                        <Text style={styles.statValue}>{selectedWell.max_waterlevel.toFixed(2)}m</Text>
                      </View>
                    </>
                  )}
                </View>

                {detailsLoading ? (
                  <View style={styles.detailsLoading}>
                    <ActivityIndicator size="small" color="#2196F3" />
                    <Text style={styles.detailsLoadingText}>Loading time series data...</Text>
                  </View>
                ) : wellDetails ? (
                  <View style={styles.timeSeriesContainer}>
                    <Text style={styles.timeSeriesTitle}>Time Series Data</Text>
                    <Text style={styles.timeSeriesSubtitle}>
                      {wellDetails.count} measurements found
                    </Text>
                    
                    <View style={styles.timeSeriesStats}>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Average</Text>
                        <Text style={styles.statValue}>{wellDetails.statistics.average.toFixed(2)}m</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Minimum</Text>
                        <Text style={styles.statValue}>{wellDetails.statistics.minimum.toFixed(2)}m</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Maximum</Text>
                        <Text style={styles.statValue}>{wellDetails.statistics.maximum.toFixed(2)}m</Text>
                      </View>
                    </View>
                    
                    <ScrollView style={styles.dataList} showsVerticalScrollIndicator={true}>
                      {wellDetails.timeseries.slice(0, 50).map((record, index) => (
                        <View key={index} style={styles.dataRow}>
                          <Text style={styles.dataDate}>{record.date}</Text>
                          <Text style={styles.dataValue}>{record.waterlevel.toFixed(2)}m</Text>
                        </View>
                      ))}
                      {wellDetails.timeseries.length > 50 && (
                        <Text style={styles.moreDataText}>
                          ... and {wellDetails.timeseries.length - 50} more records
                        </Text>
                      )}
                    </ScrollView>
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  locationInfo: {
    marginBottom: 20,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    margin: 5,
    minWidth: '45%',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  detailsLoading: {
    padding: 20,
    alignItems: 'center',
  },
  detailsLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  timeSeriesContainer: {
    marginTop: 10,
  },
  timeSeriesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  timeSeriesSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  timeSeriesStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  dataList: {
    maxHeight: 200,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 10,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dataDate: {
    fontSize: 14,
    color: '#333',
  },
  dataValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  moreDataText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 10,
    fontStyle: 'italic',
  },
});