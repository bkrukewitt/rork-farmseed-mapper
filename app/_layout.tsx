import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DataProvider } from "@/contexts/DataContext";
import { FarmProvider } from "@/contexts/FarmContext";
import Colors from "@/constants/colors";
import { checkOnboardingComplete, resetOnboarding } from "./onboarding";
import AsyncStorage from "@react-native-async-storage/async-storage";

const APP_VERSION = "1.0.1";
const APP_VERSION_KEY = "farmseed_app_version";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [hasNavigated, setHasNavigated] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    async function prepare() {
      try {
        const storedVersion = await AsyncStorage.getItem(APP_VERSION_KEY);
        const isNewVersion = storedVersion !== APP_VERSION;
        
        if (isNewVersion) {
          console.log('New app version detected:', APP_VERSION);
          await resetOnboarding();
          await AsyncStorage.setItem(APP_VERSION_KEY, APP_VERSION);
        }
        
        const onboardingComplete = await checkOnboardingComplete();
        console.log('Onboarding complete status:', onboardingComplete);
        setShowOnboarding(!onboardingComplete);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setShowOnboarding(false);
      } finally {
        setIsReady(true);
        SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (showOnboarding === null || !isReady || hasNavigated) return;
    
    const inOnboarding = segments[0] === 'onboarding';
    
    if (showOnboarding && !inOnboarding) {
      console.log('Redirecting to onboarding screen...');
      setHasNavigated(true);
      router.replace('/onboarding');
    } else if (!showOnboarding && inOnboarding) {
      console.log('Onboarding complete, redirecting to tabs...');
      setHasNavigated(true);
      router.replace('/(tabs)');
    }
  }, [showOnboarding, isReady, segments, router, hasNavigated]);

  useEffect(() => {
    const checkIfCompleted = async () => {
      if (segments[0] === '(tabs)' && showOnboarding === true) {
        const complete = await checkOnboardingComplete();
        if (complete) {
          console.log('Detected onboarding completion from storage');
          setShowOnboarding(false);
        }
      }
    };
    checkIfCompleted();
  }, [segments, showOnboarding]);

  if (!isReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <DataProvider>
          <FarmProvider>
          <Stack
            screenOptions={{
              headerBackTitle: "Back",
              headerStyle: { backgroundColor: Colors.surface },
              headerTintColor: Colors.text,
              headerTitleStyle: { fontWeight: '600' as const },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen 
              name="add-entry" 
              options={{ 
                presentation: 'modal',
                title: 'New Seed Entry',
              }} 
            />
            <Stack.Screen 
              name="entry/[id]" 
              options={{ 
                title: 'Entry Details',
              }} 
            />
            <Stack.Screen 
              name="add-field" 
              options={{ 
                presentation: 'modal',
                title: 'Add Field',
              }} 
            />
            <Stack.Screen 
              name="field/[id]" 
              options={{ 
                title: 'Field Details',
              }} 
            />
            <Stack.Screen 
              name="add-inventory" 
              options={{ 
                presentation: 'modal',
                title: 'Add Inventory',
              }} 
            />
            <Stack.Screen 
              name="inventory/[id]" 
              options={{ 
                title: 'Inventory Details',
              }} 
            />
            <Stack.Screen 
              name="upload-inventory" 
              options={{ 
                presentation: 'modal',
                title: 'Upload Inventory',
              }} 
            />
            <Stack.Screen 
              name="upload-fields" 
              options={{ 
                presentation: 'modal',
                title: 'Upload Fields',
              }} 
            />
            <Stack.Screen 
              name="farm-setup" 
              options={{ 
                presentation: 'modal',
                title: 'Farm Setup',
              }} 
            />
            <Stack.Screen 
              name="farm-members" 
              options={{ 
                title: 'Farm Members',
              }} 
            />
            <Stack.Screen 
              name="admin-menu" 
              options={{ 
                presentation: 'modal',
                title: 'Admin',
              }} 
            />
          </Stack>
          </FarmProvider>
        </DataProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
