import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Camera, ChevronRight, Leaf, CheckCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';

const ONBOARDING_COMPLETE_KEY = 'onboarding_complete';

export async function checkOnboardingComplete(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
  } catch (error) {
    console.error('Error saving onboarding state:', error);
  }
}

export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
  } catch (error) {
    console.error('Error resetting onboarding:', error);
  }
}

interface PermissionCardProps {
  icon: React.ReactNode;
  title: string;
  reasons: string[];
}

function PermissionCard({ icon, title, reasons }: PermissionCardProps) {
  return (
    <View style={styles.permissionCard}>
      <View style={styles.permissionIconContainer}>
        {icon}
      </View>
      <View style={styles.permissionContent}>
        <Text style={styles.permissionTitle}>{title}</Text>
        {reasons.map((reason, index) => (
          <View key={index} style={styles.reasonRow}>
            <CheckCircle size={14} color={Colors.success} />
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setIsLoading(true);
    await setOnboardingComplete();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Leaf size={48} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Welcome to Seed Tracker</Text>
          <Text style={styles.subtitle}>
            To give you the best experience, we need a couple of permissions
          </Text>
        </View>

        <View style={styles.permissionsContainer}>
          <PermissionCard
            icon={<MapPin size={28} color={Colors.primary} />}
            title="Location Access"
            reasons={[
              "Record exact GPS coordinates where you plant seeds",
              "Navigate back to your planting locations",
              "View all your entries on an interactive map",
              "Auto-fill location data when adding new entries",
            ]}
          />

          <PermissionCard
            icon={<Camera size={28} color={Colors.secondary} />}
            title="Camera Access"
            reasons={[
              "Take photos of seeds, plants, and fields",
              "Document growth progress over time",
              "Capture seed packaging and labels",
              "Add visual records to your entries",
            ]}
          />
        </View>

        <View style={styles.noteContainer}>
          <Text style={styles.noteText}>
            Your data stays on your device. We never share or sell your location or photos.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            {isLoading ? 'Getting Started...' : 'Get Started'}
          </Text>
          {!isLoading && <ChevronRight size={22} color={Colors.textInverse} />}
        </TouchableOpacity>

        <Text style={styles.permissionNote}>
          You can change these permissions anytime in your device settings
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 12,
  },
  permissionsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  permissionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  permissionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  permissionContent: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 10,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  noteContainer: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
  },
  noteText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  permissionNote: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 16,
  },
});
