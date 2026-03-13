import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Leaf,
  MapPin,
  RefreshCw,
  Package,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useSubscription } from '@/contexts/SubscriptionContext';

type PlanType = 'monthly' | 'annual';

export default function PaywallScreen() {
  const router = useRouter();
  const {
    monthlyPackage,
    annualPackage,
    purchase,
    restore,
    isPurchasing,
    isRestoring,
    isProUser,
  } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');

  const handlePurchase = async () => {
    const pkg = selectedPlan === 'annual' ? annualPackage : monthlyPackage;
    if (!pkg) {
      Alert.alert('Error', 'Selected plan is not available. Please try again.');
      return;
    }
    try {
      await purchase(pkg);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      if (!err?.userCancelled) {
        Alert.alert('Purchase Failed', err?.message ?? 'Something went wrong. Please try again.');
      }
    }
  };

  const handleRestore = async () => {
    try {
      const info = await restore();
      const hasActive = !!info?.entitlements?.active?.['FarmSeed Mapper Pro'];
      if (hasActive) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Restored!', 'Your subscription has been restored.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('No Subscription Found', 'We couldn\'t find an active subscription for this account.');
      }
    } catch (err: any) {
      Alert.alert('Restore Failed', err?.message ?? 'Something went wrong.');
    }
  };

  const handleDismiss = () => {
    router.back();
  };

  if (isProUser) {
    router.back();
    return null;
  }

  const monthlyPrice = monthlyPackage?.product?.priceString ?? '$4.99';
  const annualPrice = annualPackage?.product?.priceString ?? '$39.99';
  const monthlyRaw = monthlyPackage?.product?.price ?? 4.99;
  const annualRaw = annualPackage?.product?.price ?? 39.99;
  const annualMonthly = (annualRaw / 12).toFixed(2);
  const savingsPercent = monthlyRaw > 0
    ? Math.round(((monthlyRaw * 12 - annualRaw) / (monthlyRaw * 12)) * 100)
    : 33;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          testID="paywall-close"
        >
          <X size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.iconRing}>
            <View style={styles.iconInner}>
              <Leaf size={36} color={Colors.primary} />
            </View>
          </View>
          <Text style={styles.heroTitle}>Seed Tracker</Text>
          <Text style={styles.heroTagline}>
            Track every seed, from bag to field
          </Text>
        </View>

        <View style={styles.benefitsSection}>
          <View style={styles.benefitRow}>
            <View style={styles.benefitIcon}>
              <MapPin size={18} color={Colors.secondary} />
            </View>
            <Text style={styles.benefitText}>
              GPS-pinned entries for every planting
            </Text>
          </View>
          <View style={styles.benefitRow}>
            <View style={styles.benefitIcon}>
              <Package size={18} color={Colors.primary} />
            </View>
            <Text style={styles.benefitText}>
              Full inventory & field management
            </Text>
          </View>
          <View style={styles.benefitRow}>
            <View style={styles.benefitIcon}>
              <RefreshCw size={18} color={Colors.info} />
            </View>
            <Text style={styles.benefitText}>
              Sync & share data across your farm team
            </Text>
          </View>
        </View>

        <View style={styles.plansSection}>
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'annual' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('annual')}
            activeOpacity={0.8}
            testID="plan-annual"
          >
            <View style={styles.planHeader}>
              <View style={styles.planRadio}>
                {selectedPlan === 'annual' && (
                  <View style={styles.planRadioFill} />
                )}
              </View>
              <View style={styles.planInfo}>
                <Text style={[
                  styles.planTitle,
                  selectedPlan === 'annual' && styles.planTitleSelected,
                ]}>Annual</Text>
                <Text style={styles.planBreakdown}>
                  ${annualMonthly}/mo
                </Text>
              </View>
              <View style={styles.planPriceCol}>
                <Text style={[
                  styles.planPrice,
                  selectedPlan === 'annual' && styles.planPriceSelected,
                ]}>{annualPrice}</Text>
                <Text style={styles.planPeriod}>per year</Text>
              </View>
            </View>
            {savingsPercent > 0 && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>Save {savingsPercent}%</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.8}
            testID="plan-monthly"
          >
            <View style={styles.planHeader}>
              <View style={styles.planRadio}>
                {selectedPlan === 'monthly' && (
                  <View style={styles.planRadioFill} />
                )}
              </View>
              <View style={styles.planInfo}>
                <Text style={[
                  styles.planTitle,
                  selectedPlan === 'monthly' && styles.planTitleSelected,
                ]}>Monthly</Text>
              </View>
              <View style={styles.planPriceCol}>
                <Text style={[
                  styles.planPrice,
                  selectedPlan === 'monthly' && styles.planPriceSelected,
                ]}>{monthlyPrice}</Text>
                <Text style={styles.planPeriod}>per month</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SafeAreaView style={styles.bottomSafe} edges={['bottom']}>
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[styles.subscribeButton, (isPurchasing || isRestoring) && styles.subscribeButtonDisabled]}
            onPress={handlePurchase}
            disabled={isPurchasing || isRestoring}
            activeOpacity={0.85}
            testID="paywall-subscribe"
          >
            {isPurchasing ? (
              <ActivityIndicator color={Colors.textInverse} size="small" />
            ) : (
              <>
                <Check size={20} color={Colors.textInverse} />
                <Text style={styles.subscribeText}>Subscribe</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isPurchasing || isRestoring}
            testID="paywall-restore"
          >
            {isRestoring ? (
              <ActivityIndicator color={Colors.textSecondary} size="small" />
            ) : (
              <Text style={styles.restoreText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  safeArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'android' ? 60 : 80,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  iconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroTagline: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  benefitsSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  plansSection: {
    gap: 12,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '06',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  planRadioFill: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  planTitleSelected: {
    color: Colors.primary,
  },
  planBreakdown: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  planPriceCol: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  planPriceSelected: {
    color: Colors.primary,
  },
  planPeriod: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  savingsBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textInverse,
    letterSpacing: 0.3,
  },
  bottomSafe: {
    backgroundColor: '#FAF8F5',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  subscribeButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  subscribeButtonDisabled: {
    opacity: 0.7,
  },
  subscribeText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  restoreText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
});
