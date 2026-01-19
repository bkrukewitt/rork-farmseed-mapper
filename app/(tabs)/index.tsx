import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { Plus, Navigation, Layers, MapPin as MapIcon, Crosshair } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { Coordinates } from '@/types';

let MapView: any = null;
let Marker: any = null;
let Callout: any = null;
let PROVIDER_DEFAULT: any = null;

if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Callout = Maps.Callout;
  PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
}

type MapPressEvent = { nativeEvent: { coordinate: { latitude: number; longitude: number } } };
type LongPressEvent = { nativeEvent: { coordinate: { latitude: number; longitude: number } } };

const DEFAULT_REGION = {
  latitude: 41.8781,
  longitude: -93.0977,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

export default function MapScreen() {
  const router = useRouter();
  const { focusLat, focusLng, focusId } = useLocalSearchParams<{ focusLat?: string; focusLng?: string; focusId?: string }>();
  const { entries, isLoading } = useData();
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('hybrid');
  const [locationLoading, setLocationLoading] = useState(true);
  const [mapRef, setMapRef] = useState<any>(null);
  const [pinDropMode, setPinDropMode] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    // Set a timeout to prevent infinite loading on iPads/devices with slow location services
    const timeoutId = setTimeout(() => {
      console.log('Location request timed out, continuing without location');
      setLocationLoading(false);
    }, 10000); // 10 second timeout

    try {
      console.log('Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Location permission denied');
        clearTimeout(timeoutId);
        Alert.alert(
          'Location Permission',
          'Location access is needed to show your position on the map and record planting locations.',
          [{ text: 'OK' }]
        );
        setLocationLoading(false);
        return;
      }

      // Use a timeout for the actual position request
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Race between location request and a 8 second timeout
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Location timeout')), 8000)
      );

      try {
        const currentLocation = await Promise.race([locationPromise, timeoutPromise]);
        if (currentLocation) {
          console.log('Location obtained:', currentLocation.coords);
          setLocation({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          });
        }
      } catch (locationError) {
        console.log('Could not get precise location, using default region:', locationError);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      clearTimeout(timeoutId);
      setLocationLoading(false);
    }
  };

  const centerOnLocation = useCallback(() => {
    if (location && mapRef) {
      mapRef.animateToRegion({
        ...location,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  }, [location, mapRef]);

  useEffect(() => {
    if (focusLat && focusLng && mapRef) {
      const lat = parseFloat(focusLat);
      const lng = parseFloat(focusLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        console.log('Zooming to entry location:', lat, lng);
        mapRef.animateToRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 800);
        if (focusId) {
          setSelectedMarkerId(focusId);
        }
      }
    }
  }, [focusLat, focusLng, focusId, mapRef]);

  const toggleMapType = () => {
    const types: ('standard' | 'satellite' | 'hybrid')[] = ['standard', 'satellite', 'hybrid'];
    const currentIndex = types.indexOf(mapType);
    const nextIndex = (currentIndex + 1) % types.length;
    setMapType(types[nextIndex]);
  };

  const handleAddEntry = () => {
    router.push('/add-entry' as never);
  };

  const handleMapLongPress = (event: LongPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    console.log('Map long press at:', latitude, longitude);
    setSelectedLocation({ latitude, longitude });
  };

  const handleMapPress = (event: MapPressEvent) => {
    if (pinDropMode) {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      console.log('Pin drop at:', latitude, longitude);
      setSelectedLocation({ latitude, longitude });
    }
  };

  const togglePinDropMode = () => {
    setPinDropMode(!pinDropMode);
    if (pinDropMode) {
      setSelectedLocation(null);
    }
  };

  const confirmSelectedLocation = () => {
    if (selectedLocation) {
      router.push(`/add-entry?lat=${selectedLocation.latitude}&lng=${selectedLocation.longitude}` as never);
      setPinDropMode(false);
      setSelectedLocation(null);
    }
  };

  const cancelPinDrop = () => {
    setPinDropMode(false);
    setSelectedLocation(null);
  };

  const handleMarkerPress = (entryId: string) => {
    if (selectedMarkerId === entryId) {
      router.push(`/entry/${entryId}` as never);
    } else {
      setSelectedMarkerId(entryId);
    }
  };

  const handleMapPressDeselect = (event: MapPressEvent) => {
    if (!pinDropMode) {
      setSelectedMarkerId(null);
    }
    handleMapPress(event);
  };

  if (isLoading || locationLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  const initialRegion = location
    ? { ...location, latitudeDelta: 0.1, longitudeDelta: 0.1 }
    : DEFAULT_REGION;

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <View style={styles.webMapPlaceholder}>
          <MapIcon size={64} color={Colors.textLight} />
          <Text style={styles.webMapText}>Map View</Text>
          <Text style={styles.webMapSubtext}>
            Interactive map available on mobile devices
          </Text>
          {entries.length > 0 && (
            <View style={styles.webEntryList}>
              <Text style={styles.webEntryTitle}>{entries.length} Seed Entries</Text>
              {entries.slice(0, 5).map((entry) => (
                <TouchableOpacity
                  key={entry.id}
                  style={styles.webEntryItem}
                  onPress={() => handleMarkerPress(entry.id)}
                >
                  <Text style={styles.webEntryName}>{entry.varietyName || 'Unnamed'}</Text>
                  <Text style={styles.webEntryProducer}>{entry.producer}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ) : (
        <MapView
          ref={(ref: any) => setMapRef(ref)}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={initialRegion}
          mapType={mapType}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass
          showsScale
          onLongPress={handleMapLongPress}
          onPress={handleMapPressDeselect}
        >
          {entries.map((entry) => (
            <Marker
              key={entry.id}
              coordinate={entry.coordinates}
              onPress={() => handleMarkerPress(entry.id)}
            >
              <View style={styles.customMarker}>
                <View style={styles.markerPin}>
                  <View style={styles.markerDot} />
                </View>
                {selectedMarkerId === entry.id && entry.mapLabel && (
                  <View style={styles.markerLabel}>
                    <Text style={styles.markerLabelText} numberOfLines={1}>
                      {entry.mapLabel}
                    </Text>
                  </View>
                )}
              </View>
              <Callout tooltip onPress={() => router.push(`/entry/${entry.id}` as never)}>
                <TouchableOpacity 
                  style={styles.calloutContainer}
                  onPress={() => router.push(`/entry/${entry.id}` as never)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.calloutTitle}>{entry.varietyName || 'Seed Entry'}</Text>
                  {entry.producer && <Text style={styles.calloutSubtitle}>{entry.producer}</Text>}
                  {entry.fieldName && <Text style={styles.calloutField}>{entry.fieldName}</Text>}
                  <Text style={styles.calloutHint}>Tap to view details</Text>
                </TouchableOpacity>
              </Callout>
            </Marker>
          ))}
          {selectedLocation && (
            <Marker
              coordinate={selectedLocation}
            >
              <View style={styles.customMarker}>
                <View style={[styles.markerPin, styles.markerPinNew]}>
                  <View style={[styles.markerDot, styles.markerDotNew]} />
                </View>
                <View style={[styles.markerLabel, styles.markerLabelNew]}>
                  <Text style={[styles.markerLabelText, styles.markerLabelTextNew]}>New Pin</Text>
                </View>
              </View>
            </Marker>
          )}
        </MapView>
      )}

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={centerOnLocation}
          disabled={!location}
        >
          <Navigation size={22} color={location ? Colors.primary : Colors.textLight} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={toggleMapType}>
          <Layers size={22} color={Colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton, pinDropMode && styles.controlButtonActive]} 
          onPress={togglePinDropMode}
        >
          <Crosshair size={22} color={pinDropMode ? Colors.textInverse : Colors.primary} />
        </TouchableOpacity>
      </View>

      {selectedLocation ? (
        <View style={styles.pinConfirmContainer}>
          <TouchableOpacity style={styles.cancelPinButton} onPress={cancelPinDrop}>
            <Text style={styles.cancelPinText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmPinButton} onPress={confirmSelectedLocation}>
            <Plus size={20} color={Colors.textInverse} />
            <Text style={styles.confirmPinText}>Add Entry Here</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.addButton} onPress={handleAddEntry}>
          <Plus size={28} color={Colors.textInverse} />
        </TouchableOpacity>
      )}

      {pinDropMode && !selectedLocation && (
        <View style={styles.pinDropHint}>
          <Text style={styles.pinDropHintText}>Tap anywhere on the map to place a pin</Text>
        </View>
      )}

      {entries.length === 0 && (
        <View style={styles.emptyOverlay}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Entries Yet</Text>
            <Text style={styles.emptyText}>
              Tap the + button to add your first seed entry
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  map: {
    flex: 1,
  },
  webMapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundDark,
    padding: 20,
  },
  webMapText: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 16,
  },
  webMapSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  webEntryList: {
    marginTop: 24,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 400,
  },
  webEntryTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  webEntryItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  webEntryName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.primary,
  },
  webEntryProducer: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  controlsContainer: {
    position: 'absolute',
    right: 16,
    top: 16,
    gap: 12,
  },
  controlButton: {
    backgroundColor: Colors.surface,
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  addButton: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    backgroundColor: Colors.primary,
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  controlButtonActive: {
    backgroundColor: Colors.primary,
  },
  pinConfirmContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  cancelPinButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelPinText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  confirmPinButton: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmPinText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  pinDropHint: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  pinDropHintText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  customMarker: {
    alignItems: 'center',
  },
  markerPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 3,
    borderColor: Colors.textInverse,
  },
  markerPinNew: {
    backgroundColor: Colors.accent,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textInverse,
  },
  markerDotNew: {
    backgroundColor: Colors.textInverse,
  },
  markerLabel: {
    marginTop: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  markerLabelNew: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  markerLabelText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  markerLabelTextNew: {
    color: Colors.textInverse,
  },
  calloutContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    minWidth: 150,
    maxWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  calloutTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  calloutSubtitle: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  calloutField: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  calloutHint: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 6,
    fontStyle: 'italic',
  },
});
