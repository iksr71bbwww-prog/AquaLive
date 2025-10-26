import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Platform,
  ScrollView,
  StatusBar
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getBaseUrl = () => {
  // Always use your PC's IP address for physical devices
  // This works for both Android and iOS physical devices
  return "http://10.194.52.189:8080";
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
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
      console.log("💾 Prediction saved to storage");
    } catch (error) {
      console.error("❌ Failed to save prediction:", error);
    }
  };

  const handlePredict = async () => {
    setError(null);
    setPrediction(null);
    setLoading(true);

    // Basic validation
    if (!latitude || !longitude || !date) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    const baseUrl = getBaseUrl();
    console.log("🚀 Making request to:", `${baseUrl}/predict`);
    console.log("📱 Platform:", Platform.OS);
    console.log("📍 Data:", { latitude, longitude, date });

    // Implement fetch timeout using AbortController
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
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
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
      console.log("✅ Full response:", result);
      
      if (result.prediction !== undefined) {
        console.log("✅ Prediction successful:", result.prediction);
        setPrediction(result.prediction);
        
        // Save prediction to storage for analytics
        await savePredictionToStorage({
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          date: date,
          prediction: result.prediction,
          confidence: result.confidence,
          timestamp: Date.now(),
          source: 'dashboard'
        });
      } else {
        setError(result.error || "No prediction in response");
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("❌ Network error details:", err);
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
      <StatusBar barStyle="light-content" backgroundColor="#2E86AB" translucent={false} />
      <SafeAreaView style={styles.container} edges={[]}>
        <ScrollView 
          style={styles.scrollContainer} 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={[
            styles.scrollContent, 
            { paddingBottom: 120 + insets.bottom }
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
            <Text style={styles.headerTitle}>🌊 Groundwater Prediction</Text>
            <Text style={styles.headerSubtitle}>Predict depth to water level</Text>
          </View>

        {/* Input Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Location & Date</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Latitude</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter latitude (e.g., 12.9716)"
              keyboardType="numeric"
              value={latitude}
              onChangeText={setLatitude}
              placeholderTextColor="#A0A0A0"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Longitude</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter longitude (e.g., 77.5946)"
              keyboardType="numeric"
              value={longitude}
              onChangeText={setLongitude}
              placeholderTextColor="#A0A0A0"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD (e.g., 2024-01-15)"
              value={date}
              onChangeText={setDate}
              placeholderTextColor="#A0A0A0"
            />
          </View>

          <TouchableOpacity 
            style={[styles.predictButton, loading && styles.predictButtonDisabled]} 
            onPress={handlePredict}
            disabled={loading}
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
            <View style={styles.analyticsNote}>
              <Text style={styles.analyticsNoteText}>
                📊 Check Analytics tab to see 5-year trend for this prediction
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

        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ℹ️ How it works</Text>
          <Text style={styles.infoText}>
            This AI model predicts groundwater depth using machine learning algorithms trained on historical data. 
            Simply enter coordinates and date to get predictions.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2E86AB", // Blue theme for Dashboard
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 20, // Will be dynamically updated in component
  },
  header: {
    paddingVertical: 30,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#A8DADC",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#34495E",
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: "#E8F4FD",
    backgroundColor: "#F8FBFF",
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: "#2C3E50",
  },
  predictButton: {
    backgroundColor: "#3498DB",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginTop: 10,
  },
  predictButtonDisabled: {
    backgroundColor: "#BDC3C7",
  },
  predictButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  resultCard: {
    backgroundColor: "#E8F5E8",
    borderColor: "#27AE60",
    borderWidth: 2,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#27AE60",
    marginBottom: 15,
  },
  resultContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  resultValue: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#27AE60",
  },
  resultUnit: {
    fontSize: 16,
    color: "#2C3E50",
    marginTop: 5,
  },
  errorCard: {
    backgroundColor: "#FDEDEB",
    borderColor: "#E74C3C",
    borderWidth: 2,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#E74C3C",
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: "#C0392B",
    lineHeight: 20,
  },
  infoText: {
    fontSize: 14,
    color: "#7F8C8D",
    lineHeight: 22,
  },
  analyticsNote: {
    backgroundColor: "#F0F8FF",
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    borderLeftWidth: 3,
    borderLeftColor: "#3498DB",
  },
  analyticsNoteText: {
    fontSize: 13,
    color: "#3498DB",
    fontWeight: "500",
    textAlign: "center",
  },
});