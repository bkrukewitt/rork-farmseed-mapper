import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Animated,
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
  Shield,
  Sparkles,
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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const iconScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, iconScale]);

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
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  useEffect(() => {
    if (isProUser) {
      router.back();
    }
  }, [isProUser, router]);

  if (isProUser) {
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
      <View style={styles.topBar}>
        <SafeAreaView edges={['top']}>
          <View style={styles.topBarInner}>
            <View style={{ width: 36 }} />
            <View style={styles.topBadge}>
              <Sparkles size={14} color={Colors.accent} />
              <Text style={styles.topBadgeText}>PREMIUM</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleDismiss}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              testID="paywall-close"
            >
              <X size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View style={[styles.heroSection, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }]}>
          <Animated.View style={[styles.iconRing, { transform: [{ scale: iconScale }] }]}>
            <View style={styles.iconInner}>
              <Leaf size={32} color="#fff" />
            </View>
          </Animated.View>
          <Text style={styles.heroTitle}>Seed Tracker</Text>
          <Text style={styles.heroTagline}>
            Track every seed, from bag to field
          </Text>
        </Animated.View>

        <Animated.View style={[styles.benefitsSection, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }]}>
          <BenefitRow
            icon={<MapPin size={18} color={Colors.secondary} />}
            text="GPS-pinned entries for every planting"
            bgColor={Colors.secondary + '15'}
          />
          <BenefitRow
            icon={<Package size={18} color={Colors.primary} />}
            text="Full inventory & field management"
            bgColor={Colors.primary + '15'}
          />
          <BenefitRow
            icon={<RefreshCw size={18} color={Colors.info} />}
            text="Sync & share data across your farm team"
            bgColor={Colors.info + '15'}
          />
        </Animated.View>

        <Animated.View style={[styles.plansSection, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'annual' && styles.planCardSelected,
            ]}
            onPress={() => {
              setSelectedPlan('annual');
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.8}
            testID="plan-annual"
          >
            {savingsPercent > 0 && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>SAVE {savingsPercent}%</Text>
              </View>
            )}
            <View style={styles.planHeader}>
              <View style={[
                styles.planRadio,
                selectedPlan === 'annual' && styles.planRadioSelected,
              ]}>
                {selectedPlan === 'annual' && (
                  <Check size={14} color="#fff" strokeWidth={3} />
                )}
              </View>
              <View style={styles.planInfo}>
                <Text style={[
                  styles.planTitle,
                  selectedPlan === 'annual' && styles.planTitleSelected,
                ]}>Annual</Text>
                <Text style={styles.planBreakdown}>
                  ${annualMonthly}/mo — best value
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
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardSelected,
            ]}
            onPress={() => {
              setSelectedPlan('monthly');
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.8}
            testID="plan-monthly"
          >
            <View style={styles.planHeader}>
              <View style={[
                styles.planRadio,
                selectedPlan === 'monthly' && styles.planRadioSelected,
              ]}>
                {selectedPlan === 'monthly' && (
                  <Check size={14} color="#fff" strokeWidth={3} />
                )}
              </View>
              <View style={styles.planInfo}>
                <Text style={[
                  styles.planTitle,
                  selectedPlan === 'monthly' && styles.planTitleSelected,
                ]}>Monthly</Text>
                <Text style={styles.planBreakdown}>Cancel anytime</Text>
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
        </Animated.View>

        <View style={styles.trustRow}>
          <Shield size={14} color={Colors.textLight} />
          <Text style={styles.trustText}>
            Cancel anytime. Secure payment via {Platform.OS === 'ios' ? 'App Store' : Platform.OS === 'android' ? 'Google Play' : 'your store'}.
          </Text>
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
              <Text style={styles.subscribeText}>
                {selectedPlan === 'annual' ? `Subscribe — ${annualPrice}/yr` : `Subscribe — ${monthlyPrice}/mo`}
              </Text>
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

function BenefitRow({ icon, text, bgColor }: { icon: React.ReactNode; text: string; bgColor: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={[styles.benefitIcon, { backgroundColor: bgColor }]}>
        {icon}
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FBF8F4',
  },
  topBar: {
    backgroundColor: '#FBF8F4',
    zIndex: 10,
  },
  topBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  topBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.accent + '18',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  topBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: Colors.accent,
    letterSpacing: 1.2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0EDE8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 8,
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  iconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 30,
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
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    gap: 14,
    borderWidth: 1,
    borderColor: '#EDE9E3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  benefitIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  plansSection: {
    gap: 10,
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#EDE9E3',
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
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D4D0C8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  planRadioSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  planTitleSelected: {
    color: Colors.primaryDark,
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
    fontWeight: '800' as const,
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
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  trustText: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 16,
  },
  bottomSafe: {
    backgroundColor: '#FBF8F4',
    borderTopWidth: 1,
    borderTopColor: '#EDE9E3',
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  subscribeButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  subscribeButtonDisabled: {
    opacity: 0.7,
  },
  subscribeText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.textInverse,
    letterSpacing: 0.2,
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
