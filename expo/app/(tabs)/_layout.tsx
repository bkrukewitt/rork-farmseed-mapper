import { Tabs } from "expo-router";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Map, List, Layers, Settings, Package } from "lucide-react-native";
import Colors from "@/constants/colors";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom, 12) + 12 : 12;
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          height: 90 + bottomPadding,
          paddingTop: 20,
          paddingBottom: bottomPadding,
        },
        tabBarShowLabel: false,
        headerStyle: {
          backgroundColor: Colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: Colors.borderLight,
        },
        headerTintColor: Colors.text,
        headerTitleStyle: {
          fontWeight: '700' as const,
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Map",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabButton, focused && styles.tabButtonActive]}>
              <Text style={[styles.tabLabel, { color }]}>{"Map"}</Text>
              <Map size={30} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="entries"
        options={{
          title: "Entries",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabButton, focused && styles.tabButtonActive]}>
              <Text style={[styles.tabLabel, { color }]}>{"Entries"}</Text>
              <List size={30} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="fields"
        options={{
          title: "Fields",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabButton, focused && styles.tabButtonActive]}>
              <Text style={[styles.tabLabel, { color }]}>{"Fields"}</Text>
              <Layers size={30} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabButton, focused && styles.tabButtonActive]}>
              <Text style={[styles.tabLabel, { color }]}>{"Inventory"}</Text>
              <Package size={30} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabButton, focused && styles.tabButtonActive]}>
              <Text style={[styles.tabLabel, { color }]}>{"Settings"}</Text>
              <Settings size={30} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    width: 72,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 6,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary + '15',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 5,
  },
});
