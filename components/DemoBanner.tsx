import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useDemo } from '@/contexts/DemoContext';

type Props = {
  compact?: boolean;
};

export default function DemoBanner({ compact = false }: Props) {
  const router = useRouter();
  const { demoActive, scansRemaining, scanLimit } = useDemo();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (demoActive) {
      Animated.timing(fade, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }
  }, [demoActive, fade]);

  if (!demoActive) return null;

  const hasScanLeft = scansRemaining > 0;
  const title = hasScanLeft
    ? `Demo mode · ${scansRemaining} free scan${scansRemaining === 1 ? '' : 's'} left`
    : 'Demo scan used';
  const subtitle = hasScanLeft
    ? `Try ${scanLimit} seed tag scan, then subscribe to keep going`
    : 'Subscribe to keep scanning & save your work';

  const handleSubscribe = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/paywall' as never);
  };

  return (
    <Animated.View
      style={[styles.wrap, compact && styles.wrapCompact, { opacity: fade }]}
      testID="demo-banner"
    >
      <View style={styles.iconBox}>
        <Sparkles size={16} color="#B45309" />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <TouchableOpacity
        style={styles.cta}
        onPress={handleSubscribe}
        activeOpacity={0.85}
        testID="demo-banner-subscribe"
      >
        <Text style={styles.ctaText}>Subscribe</Text>
        <ArrowRight size={12} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  wrapCompact: {
    marginHorizontal: 0,
    marginTop: 0,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#92400E',
  },
  subtitle: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  ctaText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700' as const,
  },
});
