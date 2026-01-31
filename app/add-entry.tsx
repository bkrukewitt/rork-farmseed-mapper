import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  InputAccessoryView,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  Image as ImageIcon,
  MapPin,
  X,
  Check,
  ChevronDown,
  Layers,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { Coordinates, PRODUCER_OPTIONS, TRAIT_OPTIONS, TREATMENT_OPTIONS, InventoryItem, Field } from '@/types';

export default function AddEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lat?: string; lng?: string; id?: string }>();
  const { addEntry, updateEntry, getEntryById, inventory, consumeInventory, fields } = useData();
  
  const existingEntry = params.id ? getEntryById(params.id) : null;
  const isEditMode = !!existingEntry;
  
  const [photos, setPhotos] = useState<string[]>([]);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [producer, setProducer] = useState('');
  const [varietyName, setVarietyName] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [plantingDate, setPlantingDate] = useState('');
  const [rate, setRate] = useState('');
  const [germinationPercent, setGerminationPercent] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [mapLabel, setMapLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [showProducerPicker, setShowProducerPicker] = useState(false);
  const [showTraitsPicker, setShowTraitsPicker] = useState(false);
  const [showTreatmentsPicker, setShowTreatmentsPicker] = useState(false);
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [inventoryQuantity, setInventoryQuantity] = useState('1');
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [editLatitude, setEditLatitude] = useState('');
  const [editLongitude, setEditLongitude] = useState('');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const inputPositions = useRef<{ [key: string]: number }>({});
  const keyboardHeight = useRef(0);
  const inputAccessoryViewID = 'keyboard-accessory-entry';
  
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        keyboardHeight.current = e.endCoordinates.height;
      }
    );
    
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        keyboardHeight.current = 0;
      }
    );
    
    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  useEffect(() => {
    if (existingEntry) {
      console.log('Loading existing entry for edit:', existingEntry.id);
      setPhotos(existingEntry.photos || []);
      setCoordinates(existingEntry.coordinates);
      setEditLatitude(existingEntry.coordinates?.latitude?.toString() || '');
      setEditLongitude(existingEntry.coordinates?.longitude?.toString() || '');
      setProducer(existingEntry.producer || '');
      setVarietyName(existingEntry.varietyName || '');
      setLotNumber(existingEntry.lotNumber || '');
      setPlantingDate(existingEntry.plantingDate || '');
      setRate(existingEntry.rate || '');
      setGerminationPercent(existingEntry.germinationPercent || '');
      setFieldName(existingEntry.fieldName || '');
      setMapLabel(existingEntry.mapLabel || '');
      setNotes(existingEntry.notes || '');
      setSelectedTraits(existingEntry.traits || []);
      setSelectedTreatments(existingEntry.treatments || []);
      setLocationLoading(false);
      setIsCustomLocation(true);
    }
  }, [existingEntry])

  useEffect(() => {
    if (isEditMode) {
      return;
    }
    if (params.lat && params.lng) {
      const lat = parseFloat(params.lat);
      const lng = parseFloat(params.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        console.log('Using custom location from params:', lat, lng);
        setCoordinates({ latitude: lat, longitude: lng });
        setIsCustomLocation(true);
        setLocationLoading(false);
        return;
      }
    }
    getCurrentLocation();
  }, [params.lat, params.lng, isEditMode]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location is required to place map pins');
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setCoordinates({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      console.log('Location captured:', location.coords);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Could not get current location');
    } finally {
      setLocationLoading(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos([...photos, result.assets[0].uri]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 5 - photos.length,
      });

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map(asset => asset.uri);
        setPhotos([...photos, ...newPhotos]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const toggleTrait = (trait: string) => {
    if (selectedTraits.includes(trait)) {
      setSelectedTraits(selectedTraits.filter(t => t !== trait));
    } else {
      setSelectedTraits([...selectedTraits, trait]);
    }
  };

  const toggleTreatment = (treatment: string) => {
    if (selectedTreatments.includes(treatment)) {
      setSelectedTreatments(selectedTreatments.filter(t => t !== treatment));
    } else {
      setSelectedTreatments([...selectedTreatments, treatment]);
    }
  };

  const scrollToInput = (inputName: string) => {
    const yPosition = inputPositions.current[inputName];
    if (yPosition !== undefined && scrollViewRef.current) {
      // Calculate scroll position: input position - keyboard height - safe area - input field height - padding
      // On iOS, we need more space for the header/nav bar and safe area
      const safeAreaOffset = Platform.OS === 'ios' ? 120 : 80;
      const inputHeight = 50; // Approximate input field height
      const padding = 20; // Extra padding above keyboard
      const scrollY = Math.max(0, yPosition - (keyboardHeight.current + safeAreaOffset + inputHeight + padding));
      
      // Initial scroll
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: scrollY,
          animated: true,
        });
      }, Platform.OS === 'ios' ? 200 : 100);
      
      // Second scroll after keyboard animation completes to ensure proper positioning
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: scrollY,
          animated: true,
        });
      }, Platform.OS === 'ios' ? 500 : 300);
    }
  };

  const handleInputLayout = (inputName: string, y: number) => {
    inputPositions.current[inputName] = y;
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const handleSelectField = (field: Field) => {
    setSelectedField(field);
    setFieldName(field.name);
    setShowFieldPicker(false);
  };

  const handleSelectInventoryItem = (item: InventoryItem) => {
    setSelectedInventoryItem(item);
    setShowInventoryPicker(false);
    if (!producer) setProducer(item.producer);
    if (!varietyName) setVarietyName(item.varietyName);
    if (!lotNumber) setLotNumber(item.lotNumber);
    if (!germinationPercent) setGerminationPercent(item.germinationPercent);
    if (selectedTraits.length === 0 && item.traits.length > 0) setSelectedTraits(item.traits);
    if (selectedTreatments.length === 0 && item.treatments.length > 0) setSelectedTreatments(item.treatments);
  };

  const handleSave = async () => {
    if (!coordinates) {
      Alert.alert('Location Required', 'Please wait for location to be captured');
      return;
    }

    if (!varietyName.trim() && !producer.trim() && photos.length === 0) {
      Alert.alert('Missing Information', 'Please add at least a photo, variety name, or producer');
      return;
    }

    if (selectedInventoryItem) {
      const qty = parseInt(inventoryQuantity) || 1;
      if (qty > selectedInventoryItem.quantity) {
        Alert.alert('Insufficient Inventory', `Only ${selectedInventoryItem.quantity} ${selectedInventoryItem.unit} available`);
        return;
      }
    }

    setIsLoading(true);
    try {
      const entryData = {
        photos,
        coordinates,
        producer: producer || selectedInventoryItem?.producer || '',
        varietyName: varietyName || selectedInventoryItem?.varietyName || '',
        lotNumber: lotNumber || selectedInventoryItem?.lotNumber || '',
        plantingDate: plantingDate || new Date().toISOString().split('T')[0],
        rate,
        germinationPercent: germinationPercent || selectedInventoryItem?.germinationPercent || '',
        fieldName,
        mapLabel,
        notes,
        traits: selectedTraits.length > 0 ? selectedTraits : (selectedInventoryItem?.traits || []),
        treatments: selectedTreatments.length > 0 ? selectedTreatments : (selectedInventoryItem?.treatments || []),
      };

      let entryId: string;
      if (isEditMode && params.id) {
        updateEntry(params.id, entryData);
        entryId = params.id;
        console.log('Entry updated:', params.id);
      } else {
        const newEntry = addEntry(entryData);
        entryId = newEntry.id;
        console.log('Entry added:', entryId);
      }

      if (selectedInventoryItem && !isEditMode) {
        const qty = parseInt(inventoryQuantity) || 1;
        consumeInventory(selectedInventoryItem.id, entryId, qty);
        console.log('Inventory reduced:', qty, selectedInventoryItem.unit);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save entry');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: isEditMode ? 'Edit Entry' : 'Add Entry' }} />
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.locationSection}>
          <View style={styles.locationHeader}>
            <MapPin size={20} color={Colors.primary} />
            <Text style={styles.locationTitle}>Location</Text>
            {isCustomLocation && (
              <View style={styles.customLocationBadge}>
                <Text style={styles.customLocationBadgeText}>Custom</Text>
              </View>
            )}
          </View>
          {locationLoading ? (
            <View style={styles.locationLoading}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.locationLoadingText}>Getting location...</Text>
            </View>
          ) : coordinates && !isEditingLocation ? (
            <View>
              <Text style={styles.locationText}>
                {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
              </Text>
              <View style={styles.locationActions}>
                {isCustomLocation && (
                  <TouchableOpacity onPress={() => {
                    setIsCustomLocation(false);
                    getCurrentLocation();
                  }}>
                    <Text style={styles.useCurrentLocation}>Use current location</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => {
                  setEditLatitude(coordinates.latitude.toString());
                  setEditLongitude(coordinates.longitude.toString());
                  setIsEditingLocation(true);
                }}>
                  <Text style={styles.editLocationText}>Edit coordinates</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : isEditingLocation ? (
            <View>
              <View style={styles.coordInputRow}>
                <View style={styles.coordInputContainer}>
                  <Text style={styles.coordLabel}>Latitude</Text>
                  <TextInput
                    style={styles.coordInput}
                    value={editLatitude}
                    onChangeText={setEditLatitude}
                    keyboardType="numeric"
                    placeholder="e.g. 41.8781"
                    placeholderTextColor={Colors.textLight}
                    inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
                  />
                </View>
                <View style={styles.coordInputContainer}>
                  <Text style={styles.coordLabel}>Longitude</Text>
                  <TextInput
                    style={styles.coordInput}
                    value={editLongitude}
                    onChangeText={setEditLongitude}
                    keyboardType="numeric"
                    placeholder="e.g. -87.6298"
                    placeholderTextColor={Colors.textLight}
                    inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
                  />
                </View>
              </View>
              <View style={styles.coordButtonRow}>
                <TouchableOpacity 
                  style={styles.coordCancelButton}
                  onPress={() => {
                    setIsEditingLocation(false);
                    if (coordinates) {
                      setEditLatitude(coordinates.latitude.toString());
                      setEditLongitude(coordinates.longitude.toString());
                    }
                  }}
                >
                  <Text style={styles.coordCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.coordSaveButton}
                  onPress={() => {
                    const lat = parseFloat(editLatitude);
                    const lng = parseFloat(editLongitude);
                    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                      setCoordinates({ latitude: lat, longitude: lng });
                      setIsCustomLocation(true);
                      setIsEditingLocation(false);
                    } else {
                      Alert.alert('Invalid Coordinates', 'Please enter valid latitude (-90 to 90) and longitude (-180 to 180)');
                    }
                  }}
                >
                  <Text style={styles.coordSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={getCurrentLocation}>
              <Text style={styles.locationRetry}>Tap to retry location</Text>
            </TouchableOpacity>
          )}

          <View style={styles.mapLabelContainer} onLayout={(e) => handleInputLayout('mapLabel', e.nativeEvent.layout.y)}>
            <Text style={styles.mapLabelTitle}>Map Pin Label</Text>
            <TextInput
              style={styles.mapLabelInput}
              placeholder="Label shown on map pin"
              placeholderTextColor={Colors.textLight}
              value={mapLabel}
              onChangeText={setMapLabel}
              onFocus={() => scrollToInput('mapLabel')}
              inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seed Tag Photos</Text>
          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <X size={16} color={Colors.textInverse} />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 5 && (
              <View style={styles.photoActions}>
                <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                  <Camera size={24} color={Colors.primary} />
                  <Text style={styles.photoButtonText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                  <ImageIcon size={24} color={Colors.primary} />
                  <Text style={styles.photoButtonText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seed Details</Text>

          {inventory.length > 0 && !isEditMode && (
            <>
              <TouchableOpacity
                style={[styles.pickerButton, selectedInventoryItem && styles.inventorySelected]}
                onPress={() => setShowInventoryPicker(!showInventoryPicker)}
              >
                <Text style={[styles.pickerText, !selectedInventoryItem && styles.placeholder]}>
                  {selectedInventoryItem
                    ? `${selectedInventoryItem.name || selectedInventoryItem.varietyName} (${selectedInventoryItem.quantity} ${selectedInventoryItem.unit})`
                    : 'Select from Inventory (optional)'}
                </Text>
                <ChevronDown size={20} color={Colors.textLight} />
              </TouchableOpacity>

              {showInventoryPicker && (
                <View style={styles.pickerOptions}>
                  <TouchableOpacity
                    style={styles.pickerOption}
                    onPress={() => {
                      setSelectedInventoryItem(null);
                      setShowInventoryPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, styles.placeholder]}>None (manual entry)</Text>
                  </TouchableOpacity>
                  {inventory.filter(item => item.quantity > 0).map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.pickerOption}
                      onPress={() => handleSelectInventoryItem(item)}
                    >
                      <View style={styles.inventoryOptionContent}>
                        <Text style={styles.pickerOptionText}>
                          {item.name || item.varietyName}
                        </Text>
                        <Text style={styles.inventoryOptionSubtext}>
                          {item.producer} • {item.quantity} {item.unit} available
                        </Text>
                      </View>
                      {selectedInventoryItem?.id === item.id && <Check size={18} color={Colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {selectedInventoryItem && (
                <View style={styles.inventoryQuantityRow}>
                  <Text style={styles.inventoryQuantityLabel}>Quantity to use:</Text>
                  <TextInput
                    style={styles.inventoryQuantityInput}
                    value={inventoryQuantity}
                    onChangeText={setInventoryQuantity}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={Colors.textLight}
                    inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
                  />
                  <Text style={styles.inventoryQuantityUnit}>{selectedInventoryItem.unit}</Text>
                </View>
              )}
            </>
          )}
          
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowProducerPicker(!showProducerPicker)}
          >
            <Text style={[styles.pickerText, !producer && styles.placeholder]}>
              {producer || 'Select Producer'}
            </Text>
            <ChevronDown size={20} color={Colors.textLight} />
          </TouchableOpacity>
          
          {showProducerPicker && (
            <View style={styles.pickerOptions}>
              {PRODUCER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.pickerOption}
                  onPress={() => {
                    setProducer(option);
                    setShowProducerPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{option}</Text>
                  {producer === option && <Check size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View onLayout={(e) => handleInputLayout('varietyName', e.nativeEvent.layout.y)}>
            <TextInput
              style={styles.input}
              placeholder="Variety/Hybrid Name"
              placeholderTextColor={Colors.textLight}
              value={varietyName}
              onChangeText={setVarietyName}
              onFocus={() => scrollToInput('varietyName')}
              inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
            />
          </View>

          <View onLayout={(e) => handleInputLayout('lotNumber', e.nativeEvent.layout.y)}>
            <TextInput
              style={styles.input}
              placeholder="Lot Number"
              placeholderTextColor={Colors.textLight}
              value={lotNumber}
              onChangeText={setLotNumber}
              onFocus={() => scrollToInput('lotNumber')}
              inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
            />
          </View>

          <View onLayout={(e) => handleInputLayout('fieldName', e.nativeEvent.layout.y)}>
            {fields.length > 0 && (
              <TouchableOpacity
                style={[styles.pickerButton, selectedField && styles.fieldSelected]}
                onPress={() => setShowFieldPicker(!showFieldPicker)}
              >
                <View style={styles.fieldPickerContent}>
                  <Layers size={18} color={selectedField ? Colors.primary : Colors.textLight} />
                  <Text style={[styles.pickerText, !selectedField && styles.placeholder]}>
                    {selectedField ? selectedField.name : 'Select from Fields'}
                  </Text>
                </View>
                <ChevronDown size={20} color={Colors.textLight} />
              </TouchableOpacity>
            )}

            {showFieldPicker && (
              <View style={styles.pickerOptions}>
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => {
                    setSelectedField(null);
                    setShowFieldPicker(false);
                  }}
                >
                  <Text style={[styles.pickerOptionText, styles.placeholder]}>None (manual entry)</Text>
                </TouchableOpacity>
                {fields.map((field) => (
                  <TouchableOpacity
                    key={field.id}
                    style={styles.pickerOption}
                    onPress={() => handleSelectField(field)}
                  >
                    <View style={styles.fieldOptionContent}>
                      <View style={[styles.fieldColorDot, { backgroundColor: field.color || Colors.primary }]} />
                      <View style={styles.fieldOptionTextContainer}>
                        <Text style={styles.pickerOptionText}>{field.name}</Text>
                        {field.acreage && (
                          <Text style={styles.fieldOptionSubtext}>{field.acreage} acres</Text>
                        )}
                      </View>
                    </View>
                    {selectedField?.id === field.id && <Check size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder={fields.length > 0 ? "Or enter field name manually" : "Field Name / Location"}
              placeholderTextColor={Colors.textLight}
              value={fieldName}
              onChangeText={(text) => {
                setFieldName(text);
                if (selectedField && text !== selectedField.name) {
                  setSelectedField(null);
                }
              }}
              onFocus={() => scrollToInput('fieldName')}
              inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
            />
          </View>

          <View 
            style={styles.row}
            onLayout={(e) => handleInputLayout('rate', e.nativeEvent.layout.y)}
          >
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Rate (seeds/acre)"
              placeholderTextColor={Colors.textLight}
              value={rate}
              onChangeText={setRate}
              keyboardType="numeric"
              onFocus={() => scrollToInput('rate')}
              inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Germination %"
              placeholderTextColor={Colors.textLight}
              value={germinationPercent}
              onChangeText={setGerminationPercent}
              keyboardType="numeric"
              onFocus={() => scrollToInput('rate')}
              inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
            />
          </View>

          <View onLayout={(e) => handleInputLayout('plantingDate', e.nativeEvent.layout.y)}>
            <TextInput
              style={styles.input}
              placeholder="Planting Date (YYYY-MM-DD)"
              placeholderTextColor={Colors.textLight}
              value={plantingDate}
              onChangeText={setPlantingDate}
              onFocus={() => scrollToInput('plantingDate')}
              inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
            />
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowTraitsPicker(!showTraitsPicker)}
          >
            <Text style={[styles.pickerText, selectedTraits.length === 0 && styles.placeholder]}>
              {selectedTraits.length > 0 ? `${selectedTraits.length} traits selected` : 'Select Traits'}
            </Text>
            <ChevronDown size={20} color={Colors.textLight} />
          </TouchableOpacity>
          
          {showTraitsPicker && (
            <View style={styles.pickerOptions}>
              {TRAIT_OPTIONS.map((trait) => (
                <TouchableOpacity
                  key={trait}
                  style={styles.pickerOption}
                  onPress={() => toggleTrait(trait)}
                >
                  <Text style={styles.pickerOptionText}>{trait}</Text>
                  {selectedTraits.includes(trait) && <Check size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowTreatmentsPicker(!showTreatmentsPicker)}
          >
            <Text style={[styles.pickerText, selectedTreatments.length === 0 && styles.placeholder]}>
              {selectedTreatments.length > 0 ? `${selectedTreatments.length} treatments selected` : 'Select Treatments'}
            </Text>
            <ChevronDown size={20} color={Colors.textLight} />
          </TouchableOpacity>
          
          {showTreatmentsPicker && (
            <View style={styles.pickerOptions}>
              {TREATMENT_OPTIONS.map((treatment) => (
                <TouchableOpacity
                  key={treatment}
                  style={styles.pickerOption}
                  onPress={() => toggleTreatment(treatment)}
                >
                  <Text style={styles.pickerOptionText}>{treatment}</Text>
                  {selectedTreatments.includes(treatment) && <Check size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View 
          style={styles.section}
          onLayout={(e) => handleInputLayout('notes', e.nativeEvent.layout.y)}
        >
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Additional notes..."
            placeholderTextColor={Colors.textLight}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            onFocus={() => scrollToInput('notes')}
            inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : (
              <>
                <Check size={20} color={Colors.textInverse} />
                <Text style={styles.saveButtonText}>{isEditMode ? 'Update Entry' : 'Save Entry'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

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
    padding: 16,
    paddingBottom: 40,
  },
  locationSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationLoadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  locationText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  locationRetry: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  customLocationBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  customLocationBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  useCurrentLocation: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  locationActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  editLocationText: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '500' as const,
  },
  coordInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  coordInputContainer: {
    flex: 1,
  },
  coordLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  coordInput: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  coordButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  coordCancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  coordCancelText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  coordSaveButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  coordSaveText: {
    fontSize: 14,
    color: Colors.textInverse,
    fontWeight: '500' as const,
  },
  mapLabelContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  mapLabelTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  mapLabelInput: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: Colors.backgroundDark,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background,
  },
  photoButtonText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  notesInput: {
    height: 100,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  pickerButton: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  pickerText: {
    fontSize: 16,
    color: Colors.text,
  },
  placeholder: {
    color: Colors.textLight,
  },
  pickerOptions: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  pickerOptionText: {
    fontSize: 15,
    color: Colors.text,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  inventorySelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  inventoryOptionContent: {
    flex: 1,
  },
  inventoryOptionSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  inventoryQuantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  inventoryQuantityLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  inventoryQuantityInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
    paddingVertical: 4,
  },
  inventoryQuantityUnit: {
    fontSize: 14,
    color: Colors.textSecondary,
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
  fieldSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  fieldPickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  fieldColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  fieldOptionTextContainer: {
    flex: 1,
  },
  fieldOptionSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
