import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import {
  Package,
  Edit3,
  Trash2,
  Hash,
  Beaker,
  Dna,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';

export default function InventoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getInventoryItemById,
    deleteInventoryItem,
    getUsageForItem,
    getTotalUsedForItem,
    getEntryById,
    isLoading,
  } = useData();

  const item = id ? getInventoryItemById(id) : null;
  const usageHistory = useMemo(() => {
    if (!id) return [];
    return getUsageForItem(id).map(usage => {
      const entry = getEntryById(usage.entryId);
      return {
        ...usage,
        entryLabel: entry?.mapLabel || entry?.varietyName || 'Unknown Entry',
        fieldName: entry?.fieldName || '',
      };
    }).sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime());
  }, [id, getUsageForItem, getEntryById]);

  const totalUsed = id ? getTotalUsedForItem(id) : 0;

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/add-inventory?editId=${id}` as any);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Inventory Item',
      'Are you sure you want to delete this item? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (id) {
              deleteInventoryItem(id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.errorContainer}>
        <Package size={48} color={Colors.textLight} />
        <Text style={styles.errorTitle}>Item Not Found</Text>
        <Text style={styles.errorSubtitle}>This inventory item may have been deleted</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: 'Out of Stock', color: Colors.error };
    if (quantity <= 2) return { label: 'Low Stock', color: Colors.warning };
    return { label: 'In Stock', color: Colors.success };
  };

  const status = getStockStatus(item.quantity);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: item.name || item.varietyName,
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerButton} onPress={handleEdit}>
                <Edit3 size={20} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleDelete}>
                <Trash2 size={20} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {item.imageUri && (
          <View style={styles.imageSection}>
            <Image source={{ uri: item.imageUri }} style={styles.itemImage} contentFit="cover" />
          </View>
        )}

        <View style={styles.headerSection}>
          <View style={styles.headerIcon}>
            <Package size={32} color={Colors.primary} />
          </View>
          <Text style={styles.itemName}>{item.name || item.varietyName}</Text>
          <Text style={styles.itemSubtitle}>
            {item.producer && item.lotNumber
              ? `${item.producer} • ${item.lotNumber}`
              : item.producer || item.lotNumber || ''}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            {status.label === 'Out of Stock' && <AlertTriangle size={14} color={status.color} />}
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Remaining</Text>
            <Text style={[styles.statValue, item.quantity === 0 && styles.statValueEmpty]}>
              {item.quantity}
            </Text>
            <Text style={styles.statUnit}>{item.unit}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Used</Text>
            <Text style={[styles.statValue, styles.statValueUsed]}>{totalUsed}</Text>
            <Text style={styles.statUnit}>{item.unit}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Original</Text>
            <Text style={styles.statValue}>{item.quantity + totalUsed}</Text>
            <Text style={styles.statUnit}>{item.unit}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsCard}>
            {item.varietyName && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Dna size={16} color={Colors.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Variety</Text>
                  <Text style={styles.detailValue}>{item.varietyName}</Text>
                </View>
              </View>
            )}

            {item.lotNumber && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Hash size={16} color={Colors.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Lot Number</Text>
                  <Text style={styles.detailValue}>{item.lotNumber}</Text>
                </View>
              </View>
            )}

            {item.seedsPerUnit > 0 && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Package size={16} color={Colors.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Seeds per Unit</Text>
                  <Text style={styles.detailValue}>{item.seedsPerUnit.toLocaleString()}</Text>
                </View>
              </View>
            )}

            {item.germinationPercent && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Beaker size={16} color={Colors.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Germination</Text>
                  <Text style={styles.detailValue}>{item.germinationPercent}%</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {(item.traits.length > 0 || item.treatments.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Traits & Treatments</Text>
            <View style={styles.tagsContainer}>
              {item.traits.map(trait => (
                <View key={trait} style={styles.tag}>
                  <Text style={styles.tagText}>{trait}</Text>
                </View>
              ))}
              {item.treatments.map(treatment => (
                <View key={treatment} style={[styles.tag, styles.treatmentTag]}>
                  <Text style={[styles.tagText, styles.treatmentTagText]}>{treatment}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {item.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          </View>
        )}

        {usageHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Usage History</Text>
            <View style={styles.usageList}>
              {usageHistory.map(usage => (
                <View key={usage.id} style={styles.usageItem}>
                  <View style={styles.usageIcon}>
                    <TrendingDown size={16} color={Colors.accent} />
                  </View>
                  <View style={styles.usageInfo}>
                    <Text style={styles.usageEntryLabel}>{usage.entryLabel}</Text>
                    {usage.fieldName && (
                      <Text style={styles.usageFieldName}>{usage.fieldName}</Text>
                    )}
                  </View>
                  <View style={styles.usageQuantity}>
                    <Text style={styles.usageQuantityText}>
                      -{usage.quantityUsed} {item.unit}
                    </Text>
                    <Text style={styles.usageDate}>
                      {new Date(usage.usedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 16,
  },
  errorSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  imageSection: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.backgroundDark,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  itemSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statValueEmpty: {
    color: Colors.error,
  },
  statValueUsed: {
    color: Colors.accent,
  },
  statUnit: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
    marginTop: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.primary,
  },
  treatmentTag: {
    backgroundColor: Colors.accent + '15',
  },
  treatmentTagText: {
    color: Colors.accent,
  },
  notesCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  notesText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  usageList: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  usageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  usageIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  usageInfo: {
    flex: 1,
  },
  usageEntryLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  usageFieldName: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  usageQuantity: {
    alignItems: 'flex-end',
  },
  usageQuantityText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  usageDate: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },
});
