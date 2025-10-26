import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  StatusBar, 
  Platform, 
  TextInput, 
  TouchableOpacity,
  Alert,
  Dimensions
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const getBaseUrl = () => {
  // Using exact same URL as Dashboard - NO CHANGES
  return "http://10.194.52.189:8000";
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [date, setDate] = useState("");
  const [prediction, setPrediction] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Function to save prediction to AsyncStorage for analytics
  const savePredictionToStorage = async (predictionData: {
    latitude: number;
    longitude: number;
    date: string;
    prediction: number;
    confidence?: number;
    timestamp: number;
    source: 'dashboard' | 'map';
  }) => {
    try {
      const existingData = await AsyncStorage.getItem('predictions');
      const predictions = existingData ? JSON.parse(existingData) : [];
      
      // Add new prediction with unique ID
      const newPrediction = {
        ...predictionData,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      };
      
      predictions.push(newPrediction);
      
      // Keep only last 100 predictions to avoid storage overflow
      const limitedPredictions = predictions.slice(-100);
      
      await AsyncStorage.setItem('predictions', JSON.stringify(limitedPredictions));
      console.log("💾 Map prediction saved to storage");
    } catch (error) {
      console.error("❌ Failed to save map prediction:", error);
    }
  };

  const handleMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    setPrediction(null);
    setError(null);
  };

  // EXACT SAME PREDICTION FUNCTION AS DASHBOARD - NO CHANGES
  const handlePredict = async () => {
    if (!selectedLocation) {
      setError("Please pin a location on the map first");
      return;
    }

    if (!date) {
      setError("Please enter a date");
      return;
    }

    setError(null);
    setPrediction(null);
    setLoading(true);

    const baseUrl = getBaseUrl();
    console.log("🗺️ Making request from Map to:", `${baseUrl}/predict`);
    console.log("📍 Location:", selectedLocation);
    console.log("📅 Date:", date);

    // Implement fetch timeout using AbortController - SAME AS DASHBOARD
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds

    try {
      const response = await fetch(`${baseUrl}/predict`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          date: date,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      console.log("📡 Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Server error:", errorText);
        setError(`Server error (${response.status}): ${errorText}`);
        setLoading(false);
        return;
      }

      const result = await response.json();
      console.log("✅ Map prediction response:", result);
      
      if (result.prediction !== undefined) {
        console.log("✅ Map prediction successful:", result.prediction);
        setPrediction(result.prediction);
        
        // Save prediction to storage for analytics
        await savePredictionToStorage({
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          date: date,
          prediction: result.prediction,
          confidence: result.confidence,
          timestamp: Date.now(),
          source: 'map'
        });
      } else {
        setError(result.error || "No prediction in response");
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("❌ Map network error:", err);
      const errorObj = err as Error;
      const name = (errorObj && (errorObj as any).name) || "";
      const message = errorObj.message || String(err);
      
      if (name === 'TypeError' && message.includes('Network request failed')) {
        setError(`Connection failed. Check:\n1. Server is running on ${baseUrl}\n2. Phone and PC on same WiFi\n3. Firewall allows port 8000`);
      } else if (name === 'AbortError') {
        setError("Request timed out. Server might be slow or unreachable.");
      } else {
        setError(`Network error: ${message}\n\nTrying to reach: ${baseUrl}`);
      }
    }
    setLoading(false);
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#27AE60" translucent={false} />
      <SafeAreaView style={styles.container} edges={[]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Text style={styles.headerTitle}>🗺️ Interactive Map</Text>
          <Text style={styles.headerSubtitle}>Pin location for prediction</Text>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 12.9716, // Bangalore coordinates as default
              longitude: 77.5946,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            onPress={handleMapPress}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {selectedLocation && (
              <Marker
                coordinate={selectedLocation}
                title="Selected Location"
                description={`Lat: ${selectedLocation.latitude.toFixed(6)}, Lng: ${selectedLocation.longitude.toFixed(6)}`}
                pinColor="#27AE60"
              />
            )}
          </MapView>
        </View>

        {/* Controls Panel */}
        <ScrollView style={styles.controlsContainer} contentContainerStyle={styles.scrollContent}>
          {/* Location Info Card */}
          {selectedLocation && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📍 Selected Location</Text>
              <View style={styles.coordinateRow}>
                <Text style={styles.coordinateLabel}>Latitude:</Text>
                <Text style={styles.coordinateValue}>{selectedLocation.latitude.toFixed(6)}</Text>
              </View>
              <View style={styles.coordinateRow}>
                <Text style={styles.coordinateLabel}>Longitude:</Text>
                <Text style={styles.coordinateValue}>{selectedLocation.longitude.toFixed(6)}</Text>
              </View>
            </View>
          )}

          {/* Date Input Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📅 Prediction Date</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD (e.g., 2024-01-15)"
              value={date}
              onChangeText={setDate}
              placeholderTextColor="#A0A0A0"
            />
            
            <TouchableOpacity 
              style={[styles.predictButton, loading && styles.predictButtonDisabled]} 
              onPress={handlePredict}
              disabled={loading || !selectedLocation}
            >
              <Text style={styles.predictButtonText}>
                {loading ? "⏳ Predicting..." : "🔮 Predict Water Level"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Result Card */}
          {prediction !== null && (
            <View style={[styles.card, styles.resultCard]}>
              <Text style={styles.resultTitle}>✅ Prediction Result</Text>
              <View style={styles.resultContainer}>
                <Text style={styles.resultValue}>{prediction.toFixed(2)}</Text>
                <Text style={styles.resultUnit}>meters below ground</Text>
              </View>
              <Text style={styles.resultLocation}>
                📍 Lat: {selectedLocation?.latitude.toFixed(4)}, Lng: {selectedLocation?.longitude.toFixed(4)}
              </Text>
              <View style={styles.analyticsNote}>
                <Text style={styles.analyticsNoteText}>
                  📊 Check Analytics tab to see 5-year trend for this location
                </Text>
              </View>
            </View>
          )}

          {/* Error Card */}
          {error && (
            <View style={[styles.card, styles.errorCard]}>
              <Text style={styles.errorTitle}>⚠️ Error</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Instructions Card */}
          {!selectedLocation && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>� How to Use</Text>
              <Text style={styles.instructionText}>
                1. 📍 Tap anywhere on the map to pin a location{'\n'}
                2. 📅 Enter the date for prediction{'\n'}
                3. 🔮 Tap "Predict Water Level" to get results{'\n'}
                4. 🌊 View groundwater depth prediction
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F5E8",
  },
  header: {
    paddingVertical: 16,
    paddingTop: Platform.OS === "ios" ? 0 : 16,
    alignItems: "center",
    backgroundColor: "#27AE60",
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#E8F5E8",
  },
  mapContainer: {
    height: height * 0.4, // 40% of screen height
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  controlsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#27AE60",
    marginBottom: 12,
  },
  coordinateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  coordinateLabel: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
  coordinateValue: {
    fontSize: 16,
    color: "#27AE60",
    fontWeight: "600",
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  dateInput: {
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#374151",
    backgroundColor: "#F9FAFB",
    marginBottom: 16,
  },
  predictButton: {
    backgroundColor: "#27AE60",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#27AE60",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  predictButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowColor: "#9CA3AF",
  },
  predictButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  resultCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#22C55E",
    borderWidth: 2,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#15803D",
    marginBottom: 12,
  },
  resultContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  resultValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#15803D",
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  resultUnit: {
    fontSize: 14,
    color: "#65A30D",
    marginTop: 4,
  },
  resultLocation: {
    fontSize: 12,
    color: "#65A30D",
    textAlign: "center",
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#EF4444",
    borderWidth: 2,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#DC2626",
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: "#7F1D1D",
    lineHeight: 20,
  },
  instructionText: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
  },
  analyticsNote: {
    backgroundColor: "#F0F8FF",
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    borderLeftWidth: 3,
    borderLeftColor: "#27AE60",
  },
  analyticsNoteText: {
    fontSize: 13,
    color: "#27AE60",
    fontWeight: "500",
    textAlign: "center",
  },
});