import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Keyboard,
  InputAccessoryView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as Location from 'expo-location';
import { MapPin, Check, Navigation, Layers, ChevronDown } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { Coordinates } from '@/types';

let MapView: any = null;
let Marker: any = null;

if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

type MapPressEvent = { nativeEvent: { coordinate: { latitude: number; longitude: number } } };

const FIELD_COLORS = [
  '#4CAF50',
  '#2196F3',
  '#FF9800',
  '#9C27B0',
  '#F44336',
  '#795548',
  '#607D8B',
  '#00BCD4',
];

const CROP_TYPES = [
  'Corn',
  'Soybeans',
  'Wheat',
  'Cotton',
  'Alfalfa',
  'Hay',
  'Other',
];

export default function AddFieldScreen() {
  const router = useRouter();
  const { addField } = useData();
  
  const [name, setName] = useState('');
  const [acreage, setAcreage] = useState('');
  const [cropType, setCropType] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState(FIELD_COLORS[0]);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [mapRegion, setMapRegion] = useState({
    latitude: 40.0,
    longitude: -95.0,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const inputAccessoryViewID = 'keyboard-accessory-field';
  const scrollViewRef = useRef<ScrollView>(null);
  const inputPositions = useRef<{ [key: string]: number }>({});
  const keyboardHeight = useRef<number>(300);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardHeight.current = e.endCoordinates.height;
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      keyboardHeight.current = 300;
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const scrollToInput = (inputName: string) => {
    const yPosition = inputPositions.current[inputName];
    if (yPosition !== undefined && scrollViewRef.current) {
      setTimeout(() => {
        // Scroll to show input above keyboard with some padding
        const offset = keyboardHeight.current + 100; // keyboard height + padding
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, yPosition - offset),
          animated: true,
        });
      }, 100);
    }
  };

  const handleInputLayout = (inputName: string, y: number) => {
    inputPositions.current[inputName] = y;
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        setIsLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCoordinates(coords);
      setMapRegion({
        ...coords,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      console.log('Got current location:', coords);
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleMapPress = (event: MapPressEvent) => {
    const { coordinate } = event.nativeEvent;
    setCoordinates(coordinate);
    console.log('Map pressed at:', coordinate);
  };

  const handleUseCurrentLocation = async () => {
    setIsLoadingLocation(true);
    await getCurrentLocation();
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a field name');
      return;
    }

    if (!coordinates) {
      Alert.alert('Error', 'Please select a location on the map');
      return;
    }

    addField({
      name: name.trim(),
      coordinates,
      acreage: acreage.trim(),
      cropType,
      notes: notes.trim(),
      color,
    });

    console.log('Field saved successfully');
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen options={{ title: 'Add Field' }} />
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView} 
          contentContainerStyle={styles.content} 
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Field Location</Text>
          <Text style={styles.sectionSubtitle}>Tap on the map to set the field location</Text>
          
          <View style={styles.mapContainer}>
            {Platform.OS === 'web' ? (
              <View style={styles.webMapPlaceholder}>
                <MapPin size={32} color={Colors.textLight} />
                <Text style={styles.webMapText}>Map not available on web</Text>
                {coordinates && (
                  <Text style={styles.webMapCoords}>
                    {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
                  </Text>
                )}
              </View>
            ) : (
              <MapView
                style={styles.map}
                region={mapRegion}
                onRegionChangeComplete={setMapRegion}
                onPress={handleMapPress}
                mapType="hybrid"
              >
                {coordinates && (
                  <Marker coordinate={coordinates}>
                    <View style={[styles.markerContainer, { backgroundColor: color }]}>
                      <Layers size={16} color="#fff" />
                    </View>
                  </Marker>
                )}
              </MapView>
            )}
            
            <TouchableOpacity
              style={styles.locationButton}
              onPress={handleUseCurrentLocation}
              disabled={isLoadingLocation}
            >
              <Navigation size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {coordinates && (
            <View style={styles.coordsDisplay}>
              <MapPin size={14} color={Colors.textSecondary} />
              <Text style={styles.coordsText}>
                {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Field Details</Text>
          
          <View 
            style={styles.inputGroup}
            onLayout={(e) => handleInputLayout('name', e.nativeEvent.layout.y)}
          >
            <Text style={styles.label}>Field Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., North 40, Home Field"
              placeholderTextColor={Colors.textLight}
              testID="field-name-input"
              inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
              onFocus={() => scrollToInput('name')}
            />
          </View>

          <View 
            style={styles.inputGroup}
            onLayout={(e) => handleInputLayout('acreage', e.nativeEvent.layout.y)}
          >
            <Text style={styles.label}>Acreage</Text>
            <TextInput
              style={styles.input}
              value={acreage}
              onChangeText={setAcreage}
              placeholder="e.g., 80"
              placeholderTextColor={Colors.textLight}
              keyboardType="decimal-pad"
              testID="field-acreage-input"
              inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
              onFocus={() => scrollToInput('acreage')}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Crop Type</Text>
            <View style={styles.chipContainer}>
              {CROP_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.chip,
                    cropType === type && styles.chipSelected,
                  ]}
                  onPress={() => setCropType(cropType === type ? '' : type)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      cropType === type && styles.chipTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Field Color</Text>
            <View style={styles.colorContainer}>
              {FIELD_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorOption,
                    { backgroundColor: c },
                    color === c && styles.colorSelected,
                  ]}
                  onPress={() => setColor(c)}
                >
                  {color === c && <Check size={16} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View 
            style={styles.inputGroup}
            onLayout={(e) => handleInputLayout('notes', e.nativeEvent.layout.y)}
          >
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes about this field..."
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              testID="field-notes-input"
              inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
              onFocus={() => scrollToInput('notes')}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (!name.trim() || !coordinates) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!name.trim() || !coordinates}
          testID="save-field-button"
        >
          <Check size={20} color={Colors.textInverse} />
          <Text style={styles.saveButtonText}>Save Field</Text>
        </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>

      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={inputAccessoryViewID}>
          <View style={styles.keyboardAccessory}>
            <TouchableOpacity style={styles.dismissKeyboardButton} onPress={dismissKeyboard}>
              <ChevronDown size={20} color={Colors.primary} />
              <Text style={styles.dismissKeyboardText}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </KeyboardAvoidingView>
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
  content: {
    paddingBottom: 40,
  },
  section: {
    backgroundColor: Colors.surface,
    marginTop: 16,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  webMapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  webMapText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  webMapCoords: {
    fontSize: 12,
    color: Colors.textLight,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  locationButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: Colors.surface,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  coordsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  coordsText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  inputGroup: {
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: Colors.text,
  },
  chipTextSelected: {
    color: Colors.textInverse,
    fontWeight: '500' as const,
  },
  colorContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: Colors.text,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  keyboardAccessory: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dismissKeyboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary + '15',
    borderRadius: 8,
    gap: 4,
  },
  dismissKeyboardText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
