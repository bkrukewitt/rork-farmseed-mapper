import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Tractor, Users, Lock, User, Hash, ArrowRight, Plus, LogIn } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useFarm } from '@/contexts/FarmContext';

type Mode = 'choose' | 'create' | 'join';

export default function FarmSetupScreen() {
  const router = useRouter();
  const { createFarm, joinFarm, userName: existingUserName } = useFarm();

  const [mode, setMode] = useState<Mode>('choose');
  const [farmId, setFarmId] = useState('');
  const [farmDisplayName, setFarmDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [localUserName, setLocalUserName] = useState(existingUserName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!farmId.trim()) {
      Alert.alert('Required', 'Enter a Farm ID');
      return;
    }
    if (!localUserName.trim()) {
      Alert.alert('Required', 'Enter your name');
      return;
    }

    setIsSubmitting(true);
    try {
      await createFarm(
        farmId.trim().toUpperCase(),
        farmDisplayName.trim() || farmId.trim(),
        localUserName.trim(),
        password.trim() || undefined,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Farm Created', `Farm "${farmId.trim().toUpperCase()}" has been created. Share this ID with your team.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create farm';
      console.error('Create farm error:', msg);
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!farmId.trim()) {
      Alert.alert('Required', 'Enter a Farm ID');
      return;
    }
    if (!localUserName.trim()) {
      Alert.alert('Required', 'Enter your name');
      return;
    }

    setIsSubmitting(true);
    try {
      await joinFarm(
        farmId.trim().toUpperCase(),
        localUserName.trim(),
        password.trim() || undefined,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Joined Farm', 'You have joined the farm. Data will now sync automatically.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to join farm';
      console.error('Join farm error:', msg);
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (mode === 'choose') {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Farm Setup' }} />
        <View style={styles.chooseContent}>
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <Tractor size={48} color={Colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Connect Your Farm</Text>
            <Text style={styles.heroSubtitle}>
              Share data with your team by creating or joining a Farm ID
            </Text>
          </View>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setMode('create')}
            activeOpacity={0.7}
          >
            <View style={styles.optionIconWrap}>
              <Plus size={24} color={Colors.primary} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Create a Farm</Text>
              <Text style={styles.optionDesc}>Start a new farm and invite others</Text>
            </View>
            <ArrowRight size={20} color={Colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setMode('join')}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIconWrap, { backgroundColor: Colors.secondary + '15' }]}>
              <LogIn size={24} color={Colors.secondary} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Join a Farm</Text>
              <Text style={styles.optionDesc}>Enter a Farm ID to join an existing farm</Text>
            </View>
            <ArrowRight size={20} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isCreateMode = mode === 'create';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <Stack.Screen options={{ title: isCreateMode ? 'Create Farm' : 'Join Farm' }} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formHeader}>
          <View style={[styles.formHeaderIcon, !isCreateMode && { backgroundColor: Colors.secondary + '15' }]}>
            {isCreateMode ? (
              <Plus size={28} color={Colors.primary} />
            ) : (
              <LogIn size={28} color={Colors.secondary} />
            )}
          </View>
          <Text style={styles.formHeaderTitle}>
            {isCreateMode ? 'Create Your Farm' : 'Join a Farm'}
          </Text>
          <Text style={styles.formHeaderSubtitle}>
            {isCreateMode
              ? 'Set up a Farm ID that your team can join'
              : 'Enter the Farm ID shared by your team'}
          </Text>
        </View>

        <View style={styles.inputSection}>
          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <User size={16} color={Colors.textSecondary} />
              <Text style={styles.inputLabelText}>Your Name *</Text>
            </View>
            <TextInput
              style={styles.input}
              value={localUserName}
              onChangeText={setLocalUserName}
              placeholder="e.g., John Smith"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="words"
              testID="user-name-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <Hash size={16} color={Colors.textSecondary} />
              <Text style={styles.inputLabelText}>Farm ID *</Text>
            </View>
            <TextInput
              style={styles.input}
              value={farmId}
              onChangeText={(t) => setFarmId(t.toUpperCase())}
              placeholder="e.g., SMITH-FARM"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="characters"
              testID="farm-id-input"
            />
            <Text style={styles.inputHint}>
              {isCreateMode
                ? 'Choose a unique ID to share with your team'
                : 'Enter the ID shared by your farm admin'}
            </Text>
          </View>

          {isCreateMode && (
            <View style={styles.inputGroup}>
              <View style={styles.inputLabel}>
                <Tractor size={16} color={Colors.textSecondary} />
                <Text style={styles.inputLabelText}>Farm Display Name</Text>
              </View>
              <TextInput
                style={styles.input}
                value={farmDisplayName}
                onChangeText={setFarmDisplayName}
                placeholder="e.g., Smith Family Farm"
                placeholderTextColor={Colors.textLight}
                testID="farm-name-input"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <Lock size={16} color={Colors.textSecondary} />
              <Text style={styles.inputLabelText}>Password {isCreateMode ? '(Optional)' : ''}</Text>
            </View>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={isCreateMode ? 'Set a password (optional)' : 'Enter farm password'}
              placeholderTextColor={Colors.textLight}
              secureTextEntry
              testID="farm-password-input"
            />
            {isCreateMode && (
              <Text style={styles.inputHint}>
                If set, users will need this password to join your farm
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={isCreateMode ? handleCreate : handleJoin}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>
                {isCreateMode ? 'Create Farm' : 'Join Farm'}
              </Text>
              <ArrowRight size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => setMode('choose')}
        >
          <Text style={styles.backLinkText}>Back to options</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  chooseContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  heroSection: {
    alignItems: 'center' as const,
    paddingVertical: 32,
    marginBottom: 8,
  },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: Colors.primary + '12',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    maxWidth: 280,
  },
  optionCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  optionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  optionTextWrap: {
    flex: 1,
    marginLeft: 14,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 3,
  },
  optionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  formContent: {
    padding: 20,
    paddingBottom: 60,
  },
  formHeader: {
    alignItems: 'center' as const,
    marginBottom: 32,
    paddingTop: 8,
  },
  formHeaderIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Colors.primary + '12',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  formHeaderTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  formHeaderSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    maxWidth: 280,
  },
  inputSection: {
    gap: 20,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginLeft: 4,
  },
  inputLabelText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  inputHint: {
    fontSize: 12,
    color: Colors.textLight,
    marginLeft: 4,
    lineHeight: 16,
  },
  submitButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 32,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#fff',
  },
  backLink: {
    alignItems: 'center' as const,
    paddingVertical: 16,
    marginTop: 8,
  },
  backLinkText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
});
