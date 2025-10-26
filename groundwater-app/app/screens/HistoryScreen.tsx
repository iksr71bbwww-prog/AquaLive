import React from "react";
import { View, Text, StyleSheet, ScrollView, StatusBar, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const mockHistory = [
    { id: 1, location: "Bangalore, KA", result: "12.45m", date: "2024-01-15", accuracy: "95%" },
    { id: 2, location: "Chennai, TN", result: "8.92m", date: "2024-01-14", accuracy: "92%" },
    { id: 3, location: "Mumbai, MH", result: "15.67m", date: "2024-01-13", accuracy: "97%" },
    { id: 4, location: "Delhi, DL", result: "22.34m", date: "2024-01-12", accuracy: "89%" },
  ];

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#8E44AD" translucent={false} />
      <SafeAreaView style={styles.container} edges={[]}>
        <ScrollView 
          style={styles.scrollContainer} 
          contentContainerStyle={[
            styles.scrollContent, 
            { paddingBottom: 120 + insets.bottom }
          ]}
        >
          <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
            <Text style={styles.headerTitle}>📜 History</Text>
            <Text style={styles.headerSubtitle}>Past predictions</Text>
          </View>

        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>📊 Quick Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>24</Text>
              <Text style={styles.statLabel}>Total Predictions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>94%</Text>
              <Text style={styles.statLabel}>Avg Accuracy</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>7</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🕒 Recent Predictions</Text>
          {mockHistory.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.historyHeader}>
                <Text style={styles.locationText}>{item.location}</Text>
                <Text style={styles.dateText}>{item.date}</Text>
              </View>
              <View style={styles.historyDetails}>
                <View style={styles.resultContainer}>
                  <Text style={styles.resultText}>{item.result}</Text>
                  <Text style={styles.unitText}>below ground</Text>
                </View>
                <View style={styles.accuracyContainer}>
                  <Text style={styles.accuracyText}>{item.accuracy}</Text>
                  <Text style={styles.accuracyLabel}>accuracy</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#8E44AD", // Purple theme for History
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
    color: "#D2B4DE",
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
  statsCard: {
    backgroundColor: "#E8F5E8",
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
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#27AE60",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: "#2C3E50",
    textAlign: "center",
  },
  historyItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#ECF0F1",
    paddingVertical: 15,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  locationText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
  },
  dateText: {
    fontSize: 14,
    color: "#7F8C8D",
  },
  historyDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultContainer: {
    flex: 1,
  },
  resultText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3498DB",
  },
  unitText: {
    fontSize: 12,
    color: "#7F8C8D",
  },
  accuracyContainer: {
    alignItems: "flex-end",
  },
  accuracyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#27AE60",
  },
  accuracyLabel: {
    fontSize: 12,
    color: "#7F8C8D",
  },
});