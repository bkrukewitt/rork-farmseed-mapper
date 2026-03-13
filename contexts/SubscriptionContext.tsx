import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOffering,
} from 'react-native-purchases';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { isGrandfathered } from '@/utils/originalAppVersion';

const ENTITLEMENT_ID = 'FarmSeed Mapper Pro';

function getRCToken(): string {
  if (__DEV__ || Platform.OS === 'web') {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? '';
  }
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    default: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
  }) ?? '';
}

let rcConfigured = false;
const rcToken = getRCToken();

if (rcToken) {
  try {
    console.log('[RC] Configuring RevenueCat...');
    Purchases.configure({ apiKey: rcToken });
    rcConfigured = true;
    console.log('[RC] RevenueCat configured successfully');
  } catch (err) {
    console.warn('[RC] Failed to configure RevenueCat:', err);
    rcConfigured = false;
  }
} else {
  console.log('[RC] No API key available, skipping RevenueCat');
}

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [grandfathered, setGrandfathered] = useState<boolean | null>(null);

  useEffect(() => {
    void isGrandfathered().then((val) => {
      console.log('[RC] Grandfathered status:', val);
      setGrandfathered(val);
    });
  }, []);

  const customerInfoQuery = useQuery({
    queryKey: ['rc-customer-info'],
    queryFn: async (): Promise<CustomerInfo | null> => {
      if (!rcConfigured) return null;
      try {
        console.log('[RC] Fetching customer info...');
        const info = await Purchases.getCustomerInfo();
        console.log('[RC] Active entitlements:', Object.keys(info.entitlements.active));
        return info;
      } catch (err) {
        console.warn('[RC] Error fetching customer info:', err);
        return null;
      }
    },
    enabled: rcConfigured,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const offeringsQuery = useQuery({
    queryKey: ['rc-offerings'],
    queryFn: async (): Promise<PurchasesOffering | null> => {
      if (!rcConfigured) return null;
      try {
        console.log('[RC] Fetching offerings...');
        const offerings = await Purchases.getOfferings();
        console.log('[RC] Current offering:', offerings.current?.identifier);
        console.log('[RC] Available packages:', offerings.current?.availablePackages?.map(p => p.identifier));
        return offerings.current ?? null;
      } catch (err) {
        console.warn('[RC] Error fetching offerings:', err);
        return null;
      }
    },
    enabled: rcConfigured,
    staleTime: 300_000,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      console.log('[RC] Purchasing package:', pkg.identifier);
      const result = await Purchases.purchasePackage(pkg);
      return result;
    },
    onSuccess: (data) => {
      console.log('[RC] Purchase success:', Object.keys(data.customerInfo.entitlements.active));
      queryClient.setQueryData(['rc-customer-info'], data.customerInfo);
    },
    onError: (error: any) => {
      if (error.userCancelled) {
        console.log('[RC] Purchase cancelled by user');
      } else {
        console.error('[RC] Purchase error:', error.message);
      }
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      console.log('[RC] Restoring purchases...');
      const info = await Purchases.restorePurchases();
      return info;
    },
    onSuccess: (data) => {
      console.log('[RC] Restore success:', Object.keys(data.entitlements.active));
      queryClient.setQueryData(['rc-customer-info'], data);
    },
    onError: (error: any) => {
      console.error('[RC] Restore error:', error.message);
    },
  });

  const customerInfo = customerInfoQuery.data ?? null;
  const hasEntitlement = !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
  const isProUser = grandfathered === true || hasEntitlement;
  const isLoading = grandfathered === null || (rcConfigured && customerInfoQuery.isLoading);

  const offering = offeringsQuery.data ?? null;
  const monthlyPackage = offering?.monthly ?? null;
  const annualPackage = offering?.annual ?? null;
  const allPackages = useMemo(() => offering?.availablePackages ?? [], [offering]);

  const activeSubscription = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID] ?? null;
  const expirationDate = activeSubscription?.expirationDate ?? null;
  const willRenew = activeSubscription?.willRenew ?? false;
  const productIdentifier = activeSubscription?.productIdentifier ?? null;

  const refreshCustomerInfo = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['rc-customer-info'] });
  }, [queryClient]);

  const purchase = useCallback(
    (pkg: PurchasesPackage) => purchaseMutation.mutateAsync(pkg),
    [purchaseMutation]
  );

  const restore = useCallback(
    () => restoreMutation.mutateAsync(),
    [restoreMutation]
  );

  return useMemo(() => ({
    isProUser,
    isLoading,
    grandfathered: grandfathered === true,
    hasEntitlement,
    customerInfo,
    offering,
    monthlyPackage,
    annualPackage,
    allPackages,
    purchase,
    restore,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    purchaseError: purchaseMutation.error,
    restoreError: restoreMutation.error,
    refreshCustomerInfo,
    activeSubscription,
    expirationDate,
    willRenew,
    productIdentifier,
    rcConfigured,
  }), [
    isProUser, isLoading, grandfathered, hasEntitlement, customerInfo,
    offering, monthlyPackage, annualPackage, allPackages,
    purchase, restore,
    purchaseMutation.isPending, purchaseMutation.error,
    restoreMutation.isPending, restoreMutation.error, refreshCustomerInfo,
    activeSubscription, expirationDate, willRenew, productIdentifier,
  ]);
});
