import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  PurchasesPackage,
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

const rcToken = Platform.OS !== 'web' ? getRCToken() : '';
if (rcToken) {
  console.log('[RC] Configuring RevenueCat...');
  Purchases.configure({ apiKey: rcToken });
} else {
  console.log('[RC] Skipping RevenueCat configuration (web or no key)');
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
    queryFn: async () => {
      console.log('[RC] Fetching customer info...');
      const info = await Purchases.getCustomerInfo();
      console.log('[RC] Customer info:', JSON.stringify(info.entitlements.active));
      return info;
    },
    enabled: !!rcToken,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const offeringsQuery = useQuery({
    queryKey: ['rc-offerings'],
    queryFn: async () => {
      console.log('[RC] Fetching offerings...');
      const offerings = await Purchases.getOfferings();
      console.log('[RC] Current offering:', offerings.current?.identifier);
      return offerings.current;
    },
    enabled: !!rcToken,
    staleTime: 300_000,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      console.log('[RC] Purchasing package:', pkg.identifier);
      const result = await Purchases.purchasePackage(pkg);
      return result;
    },
    onSuccess: (data) => {
      console.log('[RC] Purchase success:', data.customerInfo.entitlements.active);
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
      console.log('[RC] Restore success:', data.entitlements.active);
      queryClient.setQueryData(['rc-customer-info'], data);
    },
    onError: (error: any) => {
      console.error('[RC] Restore error:', error.message);
    },
  });

  const customerInfo = customerInfoQuery.data;
  const hasEntitlement = !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
  const isProUser = grandfathered === true || hasEntitlement;
  const isLoading = grandfathered === null || customerInfoQuery.isLoading;

  const offering = offeringsQuery.data ?? null;
  const monthlyPackage = offering?.monthly ?? null;
  const annualPackage = offering?.annual ?? null;

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
    customerInfo: customerInfo ?? null,
    offering,
    monthlyPackage,
    annualPackage,
    purchase,
    restore,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    purchaseError: purchaseMutation.error,
    restoreError: restoreMutation.error,
    refreshCustomerInfo,
  }), [
    isProUser, isLoading, grandfathered, hasEntitlement, customerInfo,
    offering, monthlyPackage, annualPackage, purchase, restore,
    purchaseMutation.isPending, purchaseMutation.error,
    restoreMutation.isPending, restoreMutation.error, refreshCustomerInfo,
  ]);
});
