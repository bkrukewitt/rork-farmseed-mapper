import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  MapPin,
  Calendar,
  Edit2,
  Trash2,
  Leaf,
  Beaker,
  Hash,
  Percent,
  FileText,
  Tag,
  Navigation,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';

export default function EntryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getEntryById, deleteEntry } = useData();
  
  const entry = getEntryById(id || '');

  if (!entry) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Entry not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this seed entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteEntry(entry.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          },
        },
      ]
    );
  };

  const DetailRow = ({ icon, label, value, action }: { icon: React.ReactNode; label: string; value: string; action?: React.ReactNode }) => (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>{icon}</View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value || 'Not specified'}</Text>
      </View>
      {action}
    </View>
  );

  const handleGoToMap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(tabs)?focusLat=${entry.coordinates.latitude}&focusLng=${entry.coordinates.longitude}&focusId=${entry.id}` as never);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: entry.varietyName || 'Entry Details',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                onPress={() => router.push(`/add-entry?id=${entry.id}` as never)}
                style={styles.editButton}
              >
                <Edit2 size={18} color={Colors.primary} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {entry.photos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.photoScroll}
            contentContainerStyle={styles.photoScrollContent}
          >
            {entry.photos.map((photo, index) => (
              <Image
                key={index}
                source={{ uri: photo }}
                style={styles.photo}
                contentFit="cover"
              />
            ))}
          </ScrollView>
        )}

        <View style={styles.header}>
          <Text style={styles.varietyName}>{entry.varietyName || 'Unnamed Variety'}</Text>
          <Text style={styles.producer}>{entry.producer || 'Unknown Producer'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location & Date</Text>
          <View style={styles.card}>
            <DetailRow
              icon={<MapPin size={18} color={Colors.primary} />}
              label="Field"
              value={entry.fieldName}
            />
            <DetailRow
              icon={<Tag size={18} color={Colors.primary} />}
              label="Map Label"
              value={entry.mapLabel}
            />
            <DetailRow
              icon={<MapPin size={18} color={Colors.textSecondary} />}
              label="Coordinates"
              value={`${entry.coordinates.latitude.toFixed(5)}, ${entry.coordinates.longitude.toFixed(5)}`}
              action={
                <TouchableOpacity style={styles.goToButton} onPress={handleGoToMap}>
                  <Navigation size={14} color={Colors.textInverse} />
                  <Text style={styles.goToButtonText}>Go to</Text>
                </TouchableOpacity>
              }
            />
            <DetailRow
              icon={<Calendar size={18} color={Colors.primary} />}
              label="Planting Date"
              value={entry.plantingDate ? formatDate(entry.plantingDate) : 'Not specified'}
            />
            {entry.entryDate && (
              <DetailRow
                icon={<Calendar size={18} color={Colors.textSecondary} />}
                label="Entry Date & Time"
                value={entry.entryDate && entry.entryTime 
                  ? `${entry.entryDate} at ${entry.entryTime}` 
                  : entry.entryDate || 'Not specified'}
              />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seed Information</Text>
          <View style={styles.card}>
            <DetailRow
              icon={<Hash size={18} color={Colors.primary} />}
              label="Lot Number"
              value={entry.lotNumber}
            />
            <DetailRow
              icon={<Leaf size={18} color={Colors.primary} />}
              label="Planting Rate"
              value={entry.rate ? `${entry.rate} seeds/acre` : ''}
            />
            <DetailRow
              icon={<Percent size={18} color={Colors.primary} />}
              label="Germination"
              value={entry.germinationPercent ? `${entry.germinationPercent}%` : ''}
            />
          </View>
        </View>

        {entry.traits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Traits</Text>
            <View style={styles.tagsContainer}>
              {entry.traits.map((trait, index) => (
                <View key={index} style={styles.tag}>
                  <Leaf size={14} color={Colors.primary} />
                  <Text style={styles.tagText}>{trait}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {entry.treatments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Treatments</Text>
            <View style={styles.tagsContainer}>
              {entry.treatments.map((treatment, index) => (
                <View key={index} style={[styles.tag, styles.treatmentTag]}>
                  <Beaker size={14} color={Colors.secondary} />
                  <Text style={[styles.tagText, styles.treatmentText]}>{treatment}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.card}>
            <View style={styles.notesContent}>
              <FileText size={18} color={Colors.textLight} />
              <Text style={styles.notesText}>
                {entry.notes || 'No notes added'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.metaSection}>
          <Text style={styles.metaText}>Created: {formatDate(entry.createdAt)}</Text>
          <Text style={styles.metaText}>Updated: {formatDate(entry.updatedAt)}</Text>
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Trash2 size={20} color={Colors.error} />
          <Text style={styles.deleteButtonText}>Delete Entry</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: Colors.textInverse,
    fontWeight: '600' as const,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  editButtonText: {
    color: Colors.primary,
    fontWeight: '600' as const,
    fontSize: 14,
  },
  photoScroll: {
    backgroundColor: Colors.backgroundDark,
  },
  photoScrollContent: {
    padding: 16,
    gap: 12,
  },
  photo: {
    width: 280,
    height: 200,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  header: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  varietyName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  producer: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  treatmentTag: {
    backgroundColor: Colors.secondary + '20',
  },
  treatmentText: {
    color: Colors.secondary,
  },
  notesContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  notesText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  metaSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.error + '30',
    backgroundColor: Colors.error + '08',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  goToButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  goToButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
});
