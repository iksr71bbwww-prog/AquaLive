import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  StatusBar, 
  Platform, 
  Dimensions, 
  TouchableOpacity 
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface PredictionData {
  id: string;
  latitude: number;
  longitude: number;
  date: string;
  prediction: number;
  confidence?: number;
  timestamp: number;
  source: 'dashboard' | 'map';
}

interface TrendData {
  year: number;
  prediction: number;
  isActual: boolean;
}

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-refresh when user navigates to Analytics page
  useFocusEffect(
    React.useCallback(() => {
      console.log("📊 Analytics page focused - refreshing data");
      loadPredictions();
    }, [])
  );

  const loadPredictions = async () => {
    try {
      const storedData = await AsyncStorage.getItem('predictions');
      if (storedData) {
        const parsedPredictions: PredictionData[] = JSON.parse(storedData);
        setPredictions(parsedPredictions);
        
        // Automatically select the most recent prediction and show its trend
        if (parsedPredictions.length > 0) {
          const latest = parsedPredictions[parsedPredictions.length - 1];
          setSelectedPrediction(latest);
          console.log("📊 Auto-generating trend for latest prediction:", latest.date);
          generateTrendData(latest);
        }
      } else {
        // No predictions yet
        setPredictions([]);
        setTrendData([]);
        setSelectedPrediction(null);
      }
    } catch (error) {
      console.error("❌ Failed to load predictions:", error);
    }
  };

  const getBaseUrl = () => {
  return "http://10.194.52.189:8080";
  };

  const generateTrendData = async (basePrediction: PredictionData) => {
    setLoading(true);
    const baseUrl = getBaseUrl();
    const currentYear = new Date().getFullYear();
    const trends: TrendData[] = [];

    try {
      // Generate predictions for same date across 5 years (2 previous, current, 2 future)
      for (let i = -2; i <= 2; i++) {
        const year = currentYear + i;
        const dateForYear = basePrediction.date.replace(/^\d{4}/, year.toString());
        
        console.log(`📊 Generating trend for ${year}: ${dateForYear}`);
        
        const response = await fetch(`${baseUrl}/predict`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            latitude: basePrediction.latitude,
            longitude: basePrediction.longitude,
            date: dateForYear,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          trends.push({
            year: year,
            prediction: result.prediction,
            isActual: i === 0 // Current year is the actual prediction
          });
          console.log(`✅ Trend data for ${year}: ${result.prediction}m`);
        } else {
          console.log(`❌ Failed to get prediction for ${year}`);
        }
      }

      setTrendData(trends);
    } catch (error) {
      console.error("❌ Failed to generate trend data:", error);
    }
    setLoading(false);
  };

  const selectPredictionForTrend = (prediction: PredictionData) => {
    setSelectedPrediction(prediction);
    generateTrendData(prediction);
  };

  const chartConfig = {
    backgroundColor: '#F8FBFF',
    backgroundGradientFrom: '#F8FBFF',
    backgroundGradientTo: '#F8FBFF',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#3498DB"
    }
  };

  const chartData = {
    labels: trendData.map(item => item.year.toString()),
    datasets: [
      {
        data: trendData.map(item => item.prediction),
        color: (opacity = 1) => `rgba(39, 174, 96, ${opacity})`, // Green for trend line
        strokeWidth: 3
      }
    ]
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#E67E22" />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>📊 Analytics</Text>
            <Text style={styles.headerSubtitle}>5-Year Trend Analysis</Text>
          </View>

          {/* Guidance Section - shown when no predictions */}
          {predictions.length === 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🚀 Get Started with Analytics</Text>
              <View style={styles.guidanceContainer}>
                <View style={styles.guidanceStep}>
                  <Text style={styles.guidanceStepNumber}>1</Text>
                  <View style={styles.guidanceStepContent}>
                    <Text style={styles.guidanceStepTitle}>📱 Make a Prediction</Text>
                    <Text style={styles.guidanceStepDescription}>
                      Go to Dashboard and enter coordinates manually, or use Map to pin a location
                    </Text>
                  </View>
                </View>
                
                <View style={styles.guidanceStep}>
                  <Text style={styles.guidanceStepNumber}>2</Text>
                  <View style={styles.guidanceStepContent}>
                    <Text style={styles.guidanceStepTitle}>📊 View Analytics</Text>
                    <Text style={styles.guidanceStepDescription}>
                      Return here to see 5-year trend analysis for your prediction
                    </Text>
                  </View>
                </View>
                
                <View style={styles.guidanceStep}>
                  <Text style={styles.guidanceStepNumber}>3</Text>
                  <View style={styles.guidanceStepContent}>
                    <Text style={styles.guidanceStepTitle}>📈 Explore Trends</Text>
                    <Text style={styles.guidanceStepDescription}>
                      Interactive charts show how groundwater levels change over time
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Current Selection Info */}
          {selectedPrediction && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📍 Selected Location</Text>
              <View style={styles.locationInfo}>
                <Text style={styles.locationText}>
                  Lat: {selectedPrediction.latitude.toFixed(4)}, Lng: {selectedPrediction.longitude.toFixed(4)}
                </Text>
                <Text style={styles.dateText}>Date: {selectedPrediction.date}</Text>
                <Text style={styles.sourceText}>
                  Source: {selectedPrediction.source === 'dashboard' ? '🏠 Dashboard' : '🗺️ Map'}
                </Text>
              </View>
              <Text style={styles.autoGeneratedNote}>
                ✨ Trend automatically generated for latest prediction
              </Text>
            </View>
          )}

          {/* Trend Chart */}
          {trendData.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📈 5-Year Groundwater Trend</Text>
              <Text style={styles.chartSubtitle}>
                Water depth predictions for same date across years
              </Text>
              
              <View style={styles.chartContainer}>
                <LineChart
                  data={chartData}
                  width={width - 80}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  withVerticalLabels={true}
                  withHorizontalLabels={true}
                  withDots={true}
                  withShadow={false}
                  yAxisSuffix="m"
                />
              </View>

              {/* Current Year Highlight */}
              {selectedPrediction && (
                <View style={styles.currentYearBox}>
                  <Text style={styles.currentYearTitle}>🎯 Current Prediction</Text>
                  <Text style={styles.currentYearValue}>
                    {selectedPrediction.prediction.toFixed(2)} meters below ground
                  </Text>
                  <Text style={styles.currentYearDate}>Date: {selectedPrediction.date}</Text>
                </View>
              )}
            </View>
          )}

          {/* Recent Predictions */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🕒 Recent Predictions</Text>
            <Text style={styles.cardSubtitle}>
              {predictions.length > 0 
                ? "Latest prediction auto-selected. Tap any prediction to see its 5-year trend" 
                : "Your predictions will appear here automatically"
              }
            </Text>
            
            {predictions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  🎯 Ready for your first prediction!{'\n\n'}
                  Use Dashboard or Map to make a prediction, then return here to see instant 5-year trend analysis.
                </Text>
              </View>
            ) : (
              predictions.slice(-5).reverse().map((prediction) => (
                <TouchableOpacity 
                  key={prediction.id} 
                  style={[
                    styles.predictionItem, 
                    selectedPrediction?.id === prediction.id && styles.selectedPredictionItem
                  ]}
                  onPress={() => selectPredictionForTrend(prediction)}
                >
                  <View style={styles.predictionHeader}>
                    <Text style={styles.predictionValue}>{prediction.prediction.toFixed(2)}m</Text>
                    <Text style={styles.predictionSource}>
                      {prediction.source === 'dashboard' ? '🏠' : '🗺️'}
                    </Text>
                  </View>
                  <Text style={styles.predictionLocation}>
                    Lat: {prediction.latitude.toFixed(4)}, Lng: {prediction.longitude.toFixed(4)}
                  </Text>
                  <Text style={styles.predictionDate}>{prediction.date}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Model Performance */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📈 Model Performance</Text>
            <View style={styles.metricRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>94.2%</Text>
                <Text style={styles.metricLabel}>Accuracy</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{predictions.length}</Text>
                <Text style={styles.metricLabel}>Total Predictions</Text>
              </View>
            </View>
          </View>

          {/* Loading State */}
          {loading && (
            <View style={styles.loadingCard}>
              <Text style={styles.loadingText}>⏳ Generating trend analysis...</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E67E22", // Orange theme for Analytics
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingVertical: 40,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
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
    color: "#F8C471",
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
    marginBottom: 15,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#7F8C8D",
    marginBottom: 15,
  },
  locationInfo: {
    backgroundColor: "#F8F9FA",
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#3498DB",
  },
  locationText: {
    fontSize: 16,
    color: "#2C3E50",
    fontWeight: "500",
    marginBottom: 5,
  },
  dateText: {
    fontSize: 14,
    color: "#7F8C8D",
    marginBottom: 5,
  },
  sourceText: {
    fontSize: 14,
    color: "#27AE60",
    fontWeight: "600",
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 10,
    backgroundColor: "#F8FBFF",
    borderRadius: 16,
    padding: 10,
  },
  chart: {
    borderRadius: 16,
  },
  chartSubtitle: {
    fontSize: 14,
    color: "#7F8C8D",
    textAlign: "center",
    marginBottom: 15,
  },
  currentYearBox: {
    backgroundColor: "#E8F5E8",
    padding: 15,
    borderRadius: 12,
    marginTop: 15,
    borderWidth: 2,
    borderColor: "#27AE60",
  },
  currentYearTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#27AE60",
    marginBottom: 8,
  },
  currentYearValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 5,
  },
  currentYearDate: {
    fontSize: 14,
    color: "#7F8C8D",
  },
  predictionItem: {
    backgroundColor: "#F8F9FA",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectedPredictionItem: {
    borderColor: "#3498DB",
    borderWidth: 2,
    backgroundColor: "#EBF4FF",
  },
  predictionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  predictionValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3498DB",
  },
  predictionSource: {
    fontSize: 18,
  },
  predictionLocation: {
    fontSize: 12,
    color: "#7F8C8D",
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  predictionDate: {
    fontSize: 14,
    color: "#2C3E50",
    fontWeight: "500",
  },
  emptyState: {
    padding: 30,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#7F8C8D",
    textAlign: "center",
    lineHeight: 24,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  metricItem: {
    alignItems: "center",
    flex: 1,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#3498DB",
    marginBottom: 5,
  },
  metricLabel: {
    fontSize: 14,
    color: "#7F8C8D",
    textAlign: "center",
  },
  loadingCard: {
    backgroundColor: "#FFF3CD",
    borderColor: "#F39C12",
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#D68910",
    fontWeight: "600",
  },
  guidanceContainer: {
    marginTop: 10,
  },
  guidanceStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
  },
  guidanceStepNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    backgroundColor: "#3498DB",
    width: 30,
    height: 30,
    borderRadius: 15,
    textAlign: "center",
    lineHeight: 30,
    marginRight: 15,
  },
  guidanceStepContent: {
    flex: 1,
  },
  guidanceStepTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 5,
  },
  guidanceStepDescription: {
    fontSize: 14,
    color: "#7F8C8D",
    lineHeight: 20,
  },
  autoGeneratedNote: {
    fontSize: 12,
    color: "#27AE60",
    fontStyle: "italic",
    marginTop: 10,
    textAlign: "center",
  },
});