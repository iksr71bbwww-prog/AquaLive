import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const profileOptions = [
    { id: 1, icon: "⚙️", title: "Settings", subtitle: "App preferences and configuration" },
    { id: 2, icon: "📊", title: "Data Export", subtitle: "Download your prediction history" },
    { id: 3, icon: "🔔", title: "Notifications", subtitle: "Manage alerts and updates" },
    { id: 4, icon: "ℹ️", title: "About", subtitle: "App version and information" },
    { id: 5, icon: "📞", title: "Support", subtitle: "Get help and contact us" },
    { id: 6, icon: "🔒", title: "Privacy", subtitle: "Data usage and privacy policy" },
  ];

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#2C3E50" />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>👤 Profile</Text>
            <Text style={styles.headerSubtitle}>Settings & preferences</Text>
          </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatar}>👤</Text>
          </View>
          <Text style={styles.userName}>Groundwater User</Text>
          <Text style={styles.userEmail}>user@aqualive.com</Text>
          <View style={styles.userStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>24</Text>
              <Text style={styles.statLabel}>Predictions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>7</Text>
              <Text style={styles.statLabel}>Days Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>94%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🛠️ App Settings</Text>
          {profileOptions.map((option) => (
            <TouchableOpacity key={option.id} style={styles.optionItem}>
              <View style={styles.optionLeft}>
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                </View>
              </View>
              <Text style={styles.optionArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📱 App Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Build</Text>
            <Text style={styles.infoValue}>2024.01.15</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Model</Text>
            <Text style={styles.infoValue}>AquaLive AI v1.2</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton}>
          <Text style={styles.signOutText}>🚪 Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2C3E50", // Dark theme for Profile
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
    color: "#BDC3C7",
  },
  profileCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 30,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F4FD",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  avatar: {
    fontSize: 40,
  },
  userName: {
    fontSize: 24,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: "#7F8C8D",
    marginBottom: 20,
  },
  userStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3498DB",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: "#7F8C8D",
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
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ECF0F1",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2C3E50",
    marginBottom: 3,
  },
  optionSubtitle: {
    fontSize: 14,
    color: "#7F8C8D",
  },
  optionArrow: {
    fontSize: 24,
    color: "#BDC3C7",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ECF0F1",
  },
  infoLabel: {
    fontSize: 16,
    color: "#7F8C8D",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2C3E50",
  },
  signOutButton: {
    backgroundColor: "#E74C3C",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginBottom: 30,
  },
  signOutText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});