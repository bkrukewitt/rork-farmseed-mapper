import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Shield,
  Trash2,
  Package,
  RefreshCw,
  Bug,
  Lock,
  AlertTriangle,
  Eye,
  Copy,
  ChevronRight,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useFarm } from '@/contexts/FarmContext';

const ADMIN_PIN = '9876';
const DEBUG_PIN = '1111';

type AccessLevel = 'locked' | 'debug' | 'admin';

export default function AdminMenuScreen() {
  const router = useRouter();
  const farm = useFarm();

  const [pin, setPin] = useState('');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('locked');
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteFarmIdInput, setDeleteFarmIdInput] = useState('');

  const handlePinSubmit = () => {
    if (pin === ADMIN_PIN) {
      setAccessLevel('admin');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (pin === DEBUG_PIN) {
      setAccessLevel('debug');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Invalid PIN', 'The PIN you entered is incorrect.');
      setPin('');
    }
  };

  const handleDeleteFarm = () => {
    const targetId = deleteFarmIdInput.trim().toUpperCase();
    if (!targetId) {
      Alert.alert('Required', 'Enter a Farm ID to delete');
      return;
    }

    Alert.alert(
      'Delete Farm',
      `This will permanently delete farm "${targetId}" and all its synced data. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await farm.deleteFarmById(targetId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Deleted', `Farm "${targetId}" has been deleted.`);
              setDeleteFarmIdInput('');
            } catch (error) {
              const msg = error instanceof Error ? error.message : 'Failed to delete farm';
              Alert.alert('Error', msg);
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleForceDeleteInventory = () => {
    if (!farm.farmId) {
      Alert.alert('No Farm', 'You are not connected to a farm.');
      return;
    }

    Alert.alert(
      'Force Delete All Inventory',
      'This will permanently delete ALL inventory items and usage records for the current farm, both locally and on the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await farm.forceDeleteAllInventory();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Done', 'All inventory has been deleted.');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete inventory');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handlePurgeAndResync = () => {
    if (!farm.farmId) {
      Alert.alert('No Farm', 'You are not connected to a farm.');
      return;
    }

    Alert.alert(
      'Purge Local & Resync',
      'This will clear all local data and re-download everything from the server. Use this if your local data is corrupted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purge & Resync',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await farm.purgeLocalAndResync();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Done', 'Local data purged and resynced from server.');
            } catch (error) {
              Alert.alert('Error', 'Failed to purge and resync');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const getDebugText = () => {
    const info = farm.getDebugInfo();
    return Object.entries(info)
      .map(([key, value]) => `${key}: ${value ?? 'null'}`)
      .join('\n');
  };

  const handleShareDebug = async () => {
    const debugText = getDebugText();
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Debug Info', debugText);
      } else {
        await Share.share({
          message: `FarmSeed Debug Info\n${'='.repeat(30)}\n${debugText}`,
          title: 'FarmSeed Debug Info',
        });
      }
    } catch (error) {
      console.error('Share debug error:', error);
    }
  };

  if (accessLevel === 'locked') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <Stack.Screen options={{ title: 'Admin Access' }} />
        <View style={styles.pinContainer}>
          <View style={styles.lockIcon}>
            <Lock size={40} color={Colors.textLight} />
          </View>
          <Text style={styles.pinTitle}>Enter PIN</Text>
          <Text style={styles.pinSubtitle}>
            Enter admin PIN for full access or debug PIN for diagnostics
          </Text>
          <TextInput
            style={styles.pinInput}
            value={pin}
            onChangeText={setPin}
            placeholder="Enter PIN"
            placeholderTextColor={Colors.textLight}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
            autoFocus
            testID="admin-pin-input"
          />
          <TouchableOpacity
            style={styles.pinButton}
            onPress={handlePinSubmit}
            activeOpacity={0.8}
          >
            <Text style={styles.pinButtonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: accessLevel === 'admin' ? 'Admin Menu' : 'Debug Info' }} />

      {accessLevel === 'admin' && (
        <View style={styles.adminBanner}>
          <Shield size={18} color={Colors.error} />
          <Text style={styles.adminBannerText}>Admin Access Active</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diagnostics</Text>
        <View style={styles.sectionCard}>
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>{getDebugText()}</Text>
          </View>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleShareDebug}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Copy size={18} color={Colors.info} />
            </View>
            <Text style={styles.actionText}>Share Debug Info</Text>
            <ChevronRight size={16} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      {accessLevel === 'admin' && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Farm Management</Text>
            <View style={styles.sectionCard}>
              <View style={styles.deleteInputRow}>
                <TextInput
                  style={styles.deleteInput}
                  value={deleteFarmIdInput}
                  onChangeText={(t) => setDeleteFarmIdInput(t.toUpperCase())}
                  placeholder="Farm ID to delete"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[styles.deleteButton, isProcessing && styles.disabledButton]}
                  onPress={handleDeleteFarm}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Trash2 size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dangerous Actions</Text>
            <View style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.dangerRow}
                onPress={handleForceDeleteInventory}
                disabled={isProcessing}
                activeOpacity={0.7}
              >
                <View style={styles.dangerIcon}>
                  <Package size={18} color={Colors.error} />
                </View>
                <View style={styles.dangerContent}>
                  <Text style={styles.dangerTitle}>Force Delete All Inventory</Text>
                  <Text style={styles.dangerDesc}>Remove all inventory items and usage</Text>
                </View>
                <AlertTriangle size={16} color={Colors.error} />
              </TouchableOpacity>

              <View style={styles.rowDivider} />

              <TouchableOpacity
                style={styles.dangerRow}
                onPress={handlePurgeAndResync}
                disabled={isProcessing}
                activeOpacity={0.7}
              >
                <View style={styles.dangerIcon}>
                  <RefreshCw size={18} color={Colors.error} />
                </View>
                <View style={styles.dangerContent}>
                  <Text style={styles.dangerTitle}>Purge Local & Resync</Text>
                  <Text style={styles.dangerDesc}>Clear local data, re-download from server</Text>
                </View>
                <AlertTriangle size={16} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  pinContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 40,
  },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 24,
  },
  pinTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  pinSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 32,
  },
  pinInput: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 20,
  },
  pinButton: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center' as const,
  },
  pinButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#fff',
  },
  adminBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: Colors.error + '12',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.error + '20',
  },
  adminBannerText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginLeft: 20,
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden' as const,
  },
  debugInfo: {
    padding: 16,
    backgroundColor: Colors.backgroundDark,
  },
  debugText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: Colors.text,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: Colors.info + '12',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  deleteInputRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    gap: 10,
  },
  deleteInput: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.error,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  disabledButton: {
    opacity: 0.5,
  },
  dangerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dangerIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.error + '12',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  dangerContent: {
    flex: 1,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.error,
  },
  dangerDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 66,
  },
  bottomPad: {
    height: 40,
  },
});
