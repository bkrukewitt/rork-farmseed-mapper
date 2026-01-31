import { useState, useRef, useEffect } from 'react';
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
  Image,
  Keyboard,
  InputAccessoryView,
} from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Package,
  Check,
  ChevronDown,
  Camera,
  Image as ImageIcon,
  X,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import {
  PRODUCER_OPTIONS,
  TRAIT_OPTIONS,
  TREATMENT_OPTIONS,
  INVENTORY_UNIT_OPTIONS,
  InventoryUnit,
} from '@/types';

export default function AddInventoryScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { addInventoryItem, updateInventoryItem, getInventoryItemById } = useData();
  const isEditMode = !!editId;

  const [name, setName] = useState('');
  const [producer, setProducer] = useState('');
  const [varietyName, setVarietyName] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<InventoryUnit>('bags');
  const [seedsPerUnit, setSeedsPerUnit] = useState('');
  const [germinationPercent, setGerminationPercent] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [customTrait, setCustomTrait] = useState('');
  const [customTreatment, setCustomTreatment] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [showProducerPicker, setShowProducerPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showTraitsPicker, setShowTraitsPicker] = useState(false);
  const [showTreatmentsPicker, setShowTreatmentsPicker] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const inputAccessoryViewID = 'keyboard-accessory-inventory';

  useEffect(() => {
    if (isEditMode && editId) {
      const existingItem = getInventoryItemById(editId);
      if (existingItem) {
        setName(existingItem.name || '');
        setProducer(existingItem.producer || '');
        setVarietyName(existingItem.varietyName || '');
        setLotNumber(existingItem.lotNumber || '');
        setQuantity(existingItem.quantity?.toString() || '');
        setUnit(existingItem.unit || 'bags');
        setSeedsPerUnit(existingItem.seedsPerUnit?.toString() || '');
        setGerminationPercent(existingItem.germinationPercent || '');
        setNotes(existingItem.notes || '');
        const traits = existingItem.traits || [];
        const treatments = existingItem.treatments || [];
        const customTraitValue = traits.find(t => !TRAIT_OPTIONS.includes(t as any) && t !== 'Other');
        const customTreatmentValue = treatments.find(t => !TREATMENT_OPTIONS.includes(t as any) && t !== 'Other');
        setSelectedTraits(traits.filter(t => TRAIT_OPTIONS.includes(t as any)));
        setSelectedTreatments(treatments.filter(t => TREATMENT_OPTIONS.includes(t as any)));
        setCustomTrait(customTraitValue || '');
        setCustomTreatment(customTreatmentValue || '');
        setImageUri(existingItem.imageUri || null);
        console.log('Loaded inventory item for editing:', editId);
      }
    }
  }, [isEditMode, editId, getInventoryItemById]);
  const inputPositions = useRef<{ [key: string]: number }>({});

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

  const pickImageFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        console.log('Image selected from library:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
    setShowImagePicker(false);
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        console.log('Photo taken:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
    setShowImagePicker(false);
  };

  const removeImage = () => {
    setImageUri(null);
    console.log('Image removed');
  };

  const scrollToInput = (inputName: string) => {
    const yPosition = inputPositions.current[inputName];
    if (yPosition !== undefined && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, yPosition - 150),
          animated: true,
        });
      }, 150);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const handleInputLayout = (inputName: string, y: number) => {
    inputPositions.current[inputName] = y;
  };

  const handleSave = async () => {
    if (!varietyName.trim()) {
      Alert.alert('Missing Information', 'Please enter a Variety/Hybrid Name');
      return;
    }

    if (!quantity.trim() || isNaN(parseFloat(quantity))) {
      Alert.alert('Missing Information', 'Please enter a valid quantity');
      return;
    }

    setIsLoading(true);
    try {
      const finalTraits = selectedTraits.includes('Other') && customTrait.trim()
        ? [...selectedTraits.filter(t => t !== 'Other'), customTrait.trim()]
        : selectedTraits.filter(t => t !== 'Other');
      const finalTreatments = selectedTreatments.includes('Other') && customTreatment.trim()
        ? [...selectedTreatments.filter(t => t !== 'Other'), customTreatment.trim()]
        : selectedTreatments.filter(t => t !== 'Other');

      const itemData = {
        name: name || varietyName,
        producer,
        varietyName,
        lotNumber,
        traits: finalTraits,
        treatments: finalTreatments,
        quantity: parseFloat(quantity),
        unit,
        seedsPerUnit: seedsPerUnit ? parseInt(seedsPerUnit) : 0,
        germinationPercent,
        purchaseDate: '',
        expirationDate: '',
        notes,
        imageUri: imageUri || undefined,
      };

      if (isEditMode && editId) {
        updateInventoryItem(editId, itemData);
        console.log('Inventory item updated:', editId);
      } else {
        addInventoryItem(itemData);
        console.log('New inventory item added');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save inventory item');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: isEditMode ? 'Edit Inventory' : 'Add Inventory' }} />
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerSection}>
          <View style={styles.headerIcon}>
            <Package size={28} color={Colors.primary} />
          </View>
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit Seed Inventory' : 'Add Seed Inventory'}</Text>
          <Text style={styles.headerSubtitle}>
            Track bags, boxes, or units of seed
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View onLayout={(e) => handleInputLayout('varietyName', e.nativeEvent.layout.y)}>
            <TextInput
              style={styles.input}
              placeholder="Variety/Hybrid Name *"
              placeholderTextColor={Colors.textLight}
              value={varietyName}
              onChangeText={setVarietyName}
              onFocus={() => scrollToInput('varietyName')}
              inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
            />
          </View>

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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photo</Text>
          
          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
                <X size={18} color={Colors.textInverse} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.changeImageButton} 
                onPress={() => setShowImagePicker(!showImagePicker)}
              >
                <Text style={styles.changeImageText}>Change Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={() => setShowImagePicker(!showImagePicker)}
            >
              <Camera size={24} color={Colors.primary} />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          )}

          {showImagePicker && (
            <View style={styles.imagePickerOptions}>
              <TouchableOpacity style={styles.imagePickerOption} onPress={takePhoto}>
                <Camera size={20} color={Colors.text} />
                <Text style={styles.imagePickerOptionText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imagePickerOption} onPress={pickImageFromLibrary}>
                <ImageIcon size={20} color={Colors.text} />
                <Text style={styles.imagePickerOptionText}>Choose from Library</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quantity</Text>

          <View style={styles.row}>
            <View 
              style={styles.quantityInputWrapper}
              onLayout={(e) => handleInputLayout('quantity', e.nativeEvent.layout.y)}
            >
              <TextInput
                style={[styles.input, styles.quantityInput]}
                placeholder="Quantity *"
                placeholderTextColor={Colors.textLight}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                onFocus={() => scrollToInput('quantity')}
                inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
              />
            </View>

            <TouchableOpacity
              style={[styles.pickerButton, styles.unitPicker]}
              onPress={() => setShowUnitPicker(!showUnitPicker)}
            >
              <Text style={styles.pickerText}>{unit}</Text>
              <ChevronDown size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>

          {showUnitPicker && (
            <View style={styles.pickerOptions}>
              {INVENTORY_UNIT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.pickerOption}
                  onPress={() => {
                    setUnit(option);
                    setShowUnitPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{option}</Text>
                  {unit === option && <Check size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View onLayout={(e) => handleInputLayout('seedsPerUnit', e.nativeEvent.layout.y)}>
            <TextInput
              style={styles.input}
              placeholder="Seeds per Unit (optional)"
              placeholderTextColor={Colors.textLight}
              value={seedsPerUnit}
              onChangeText={setSeedsPerUnit}
              keyboardType="numeric"
              onFocus={() => scrollToInput('seedsPerUnit')}
              inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
            />
          </View>

          <View onLayout={(e) => handleInputLayout('germinationPercent', e.nativeEvent.layout.y)}>
            <TextInput
              style={styles.input}
              placeholder="Germination % (optional)"
              placeholderTextColor={Colors.textLight}
              value={germinationPercent}
              onChangeText={setGerminationPercent}
              keyboardType="numeric"
              onFocus={() => scrollToInput('germinationPercent')}
              inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Traits & Treatments</Text>

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

          {selectedTraits.includes('Other') && (
            <TextInput
              style={styles.input}
              placeholder="Enter custom trait..."
              placeholderTextColor={Colors.textLight}
              value={customTrait}
              onChangeText={setCustomTrait}
              inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
            />
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

          {selectedTreatments.includes('Other') && (
            <TextInput
              style={styles.input}
              placeholder="Enter custom treatment..."
              placeholderTextColor={Colors.textLight}
              value={customTreatment}
              onChangeText={setCustomTreatment}
              inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
            />
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
                <Text style={styles.saveButtonText}>{isEditMode ? 'Update Item' : 'Save Item'}</Text>
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
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
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
  quantityInputWrapper: {
    flex: 2,
  },
  quantityInput: {
    marginBottom: 12,
  },
  unitPicker: {
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
  imageContainer: {
    position: 'relative' as const,
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    backgroundColor: Colors.surface,
  },
  removeImageButton: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  changeImageButton: {
    position: 'absolute' as const,
    bottom: 8,
    right: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  changeImageText: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  addPhotoButton: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed' as const,
    paddingVertical: 32,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    marginBottom: 12,
  },
  addPhotoText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  imagePickerOptions: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden' as const,
  },
  imagePickerOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  imagePickerOptionText: {
    fontSize: 15,
    color: Colors.text,
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
