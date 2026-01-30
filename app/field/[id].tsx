import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  InputAccessoryView,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Trash2, Check, Layers, MapPin, Ruler, Wheat, Calendar, ChevronDown } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';

let MapView: any = null;
let Marker: any = null;

if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

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

export default function FieldDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getFieldById, updateField, deleteField, entries } = useData();
  
  const field = getFieldById(id || '');
  
  const [name, setName] = useState(field?.name || '');
  const [acreage, setAcreage] = useState(field?.acreage || '');
  const [cropType, setCropType] = useState(field?.cropType || '');
  const [notes, setNotes] = useState(field?.notes || '');
  const [color, setColor] = useState(field?.color || FIELD_COLORS[0]);
  const [isEditing, setIsEditing] = useState(false);
  
  const inputAccessoryViewID = 'keyboard-accessory-field-detail';
  
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  useEffect(() => {
    if (field) {
      setName(field.name);
      setAcreage(field.acreage);
      setCropType(field.cropType);
      setNotes(field.notes);
      setColor(field.color);
    }
  }, [field]);

  if (!field) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Field not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const relatedEntries = entries.filter(
    e => e.fieldName.toLowerCase() === field.name.toLowerCase()
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Field name is required');
      return;
    }

    updateField(field.id, {
      name: name.trim(),
      acreage: acreage.trim(),
      cropType,
      notes: notes.trim(),
      color,
    });

    setIsEditing(false);
    console.log('Field updated:', field.id);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Field',
      'Are you sure you want to delete this field? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteField(field.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: field.name || 'Field Details',
          headerRight: () => (
            <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
              <Trash2 size={22} color={Colors.error} />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
        <View style={styles.mapSection}>
          {Platform.OS === 'web' ? (
            <View style={styles.webMapPlaceholder}>
              <Layers size={32} color={color} />
              <Text style={styles.webMapText}>Map View</Text>
            </View>
          ) : (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: field.coordinates.latitude,
                longitude: field.coordinates.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              mapType="hybrid"
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker coordinate={field.coordinates}>
                <View style={[styles.markerContainer, { backgroundColor: color }]}>
                  <Layers size={16} color="#fff" />
                </View>
              </Marker>
            </MapView>
          )}
          
          <View style={styles.coordsBadge}>
            <MapPin size={12} color={Colors.textSecondary} />
            <Text style={styles.coordsText}>
              {field.coordinates.latitude.toFixed(6)}, {field.coordinates.longitude.toFixed(6)}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {field.acreage && (
            <View style={styles.statItem}>
              <Ruler size={18} color={Colors.primary} />
              <Text style={styles.statValue}>{field.acreage}</Text>
              <Text style={styles.statLabel}>acres</Text>
            </View>
          )}
          {field.cropType && (
            <View style={styles.statItem}>
              <Wheat size={18} color={Colors.primary} />
              <Text style={styles.statValue}>{field.cropType}</Text>
              <Text style={styles.statLabel}>crop</Text>
            </View>
          )}
          <View style={styles.statItem}>
            <Calendar size={18} color={Colors.primary} />
            <Text style={styles.statValue}>{relatedEntries.length}</Text>
            <Text style={styles.statLabel}>entries</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Field Details</Text>
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Text style={styles.editLink}>{isEditing ? 'Cancel' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>

          {isEditing ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Field Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Field name"
                  placeholderTextColor={Colors.textLight}
                  inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Acreage</Text>
                <TextInput
                  style={styles.input}
                  value={acreage}
                  onChangeText={setAcreage}
                  placeholder="e.g., 80"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                  inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add notes..."
                  placeholderTextColor={Colors.textLight}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Check size={20} color={Colors.textInverse} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={styles.detailValue}>{field.name}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Acreage</Text>
                <Text style={styles.detailValue}>{field.acreage || 'Not set'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Crop Type</Text>
                <Text style={styles.detailValue}>{field.cropType || 'Not set'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Color</Text>
                <View style={[styles.colorPreview, { backgroundColor: field.color }]} />
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.detailValue}>{field.notes || 'No notes'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Created</Text>
                <Text style={styles.detailValue}>{formatDate(field.createdAt)}</Text>
              </View>
            </>
          )}
        </View>

        {relatedEntries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seed Entries in this Field</Text>
            {relatedEntries.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryCard}
                onPress={() => router.push({ pathname: '/entry/[id]' as any, params: { id: entry.id } })}
              >
                <View style={styles.entryInfo}>
                  <Text style={styles.entryVariety}>{entry.varietyName || 'Unknown Variety'}</Text>
                  <Text style={styles.entryProducer}>{entry.producer}</Text>
                </View>
                <Text style={styles.entryDate}>
                  {new Date(entry.plantingDate || entry.createdAt).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
    </>
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
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  notFoundText: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  backLink: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  headerButton: {
    padding: 8,
  },
  mapSection: {
    height: 180,
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
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  coordsBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  coordsText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  section: {
    backgroundColor: Colors.surface,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  editLink: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  detailLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
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
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  entryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  entryInfo: {
    flex: 1,
  },
  entryVariety: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  entryProducer: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  entryDate: {
    fontSize: 13,
    color: Colors.textLight,
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
