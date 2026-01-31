import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import {
  Package,
  Plus,
  Search,
  ChevronRight,
  AlertTriangle,
  TrendingDown,
  X,
  PlusCircle,
  Download,
  Upload,
  FileSpreadsheet,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { InventoryItem } from '@/types';

const INVENTORY_CSV_TEMPLATE = `Name,Producer,Variety,Lot Number,Quantity,Unit,Seeds Per Unit,Germination %,Traits,Treatments,Notes
Example Seed,Pioneer,P1234,LOT123,10,bags,80000,95,"Roundup Ready,Liberty Link","Cruiser,Poncho",Sample inventory item`;

export default function InventoryScreen() {
  const router = useRouter();
  const { inventory, inventoryUsage, isLoading, getTotalUsedForItem, getEntryById } = useData();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);

  const filteredInventory = useMemo(() => {
    if (!search.trim()) return inventory;
    const lower = search.toLowerCase();
    return inventory.filter(
      item =>
        item.name.toLowerCase().includes(lower) ||
        item.varietyName.toLowerCase().includes(lower) ||
        item.producer.toLowerCase().includes(lower) ||
        item.lotNumber.toLowerCase().includes(lower)
    );
  }, [inventory, search]);

  const totalItems = inventory.length;
  const lowStockItems = inventory.filter(item => item.quantity <= 2 && item.quantity > 0).length;
  const outOfStockItems = inventory.filter(item => item.quantity === 0).length;

  const usageHistory = useMemo(() => {
    return inventoryUsage
      .map(usage => {
        const item = inventory.find(i => i.id === usage.inventoryItemId);
        const entry = getEntryById(usage.entryId);
        return {
          ...usage,
          itemName: item?.name || 'Unknown Item',
          itemUnit: item?.unit || 'units',
          entryLabel: entry?.mapLabel || entry?.varietyName || 'Unknown Entry',
        };
      })
      .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
      .slice(0, 20);
  }, [inventoryUsage, inventory, getEntryById]);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  const handleOpenActionModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowActionModal(true);
  };

  const handleManualAdd = () => {
    setShowActionModal(false);
    router.push('/add-inventory' as any);
  };

  const handleDownloadTemplate = async () => {
    setShowActionModal(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      if (Platform.OS === 'web') {
        const blob = new Blob([INVENTORY_CSV_TEMPLATE], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'inventory_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Alert.alert('Success', 'Template downloaded successfully');
      } else {
        // Use FileSystem API for better reliability
        const directory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
        if (!directory) {
          throw new Error('No file system directory available');
        }
        
        const fileName = 'inventory_template.csv';
        const fileUri = directory + fileName;
        
        console.log('[DEBUG] Download template - Writing file to:', fileUri);
        
        // Write the file
        await FileSystem.writeAsStringAsync(fileUri, INVENTORY_CSV_TEMPLATE, {
          encoding: FileSystem.EncodingType.UTF8 as any,
        });
        
        // Verify file exists
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        console.log('[DEBUG] File created:', fileInfo.exists, fileInfo);
        
        if (!fileInfo.exists) {
          throw new Error('File was not created successfully');
        }
        
        // Check if sharing is available
        const canShare = await Sharing.isAvailableAsync();
        console.log('[DEBUG] Sharing available:', canShare);
        
        if (canShare) {
          try {
            const result = await Sharing.shareAsync(fileUri, {
              mimeType: 'text/csv',
              dialogTitle: 'Download Inventory Template',
              UTI: 'public.comma-separated-values-text',
            });
            console.log('[DEBUG] Sharing result:', result);
            
            if (result.action === Sharing.SharingResultAction.shared) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else if (result.action === Sharing.SharingResultAction.dismissedActionSheet) {
              console.log('[DEBUG] User dismissed share sheet');
            }
          } catch (shareError: any) {
            console.error('[DEBUG] Sharing error:', shareError);
            throw new Error(`Sharing failed: ${shareError.message || 'Unknown error'}`);
          }
        } else {
          Alert.alert(
            'Template Saved',
            `Template saved to app documents.\n\nFile: ${fileName}\n\nYou can access it through the Files app.`,
            [{ text: 'OK' }]
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
      console.log('[DEBUG] Inventory template downloaded successfully');
    } catch (error: any) {
      console.error('[DEBUG] Download template error:', error);
      console.error('[DEBUG] Error details:', {
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        platform: Platform.OS,
      });
      
      const errorMessage = error?.message || 'Unknown error occurred';
      Alert.alert(
        'Download Failed',
        `Failed to download template:\n\n${errorMessage}\n\nCheck console for details.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleUploadFile = () => {
    setShowActionModal(false);
    router.push('/upload-inventory' as any);
  };

  const handleExportData = async () => {
    setShowActionModal(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      if (inventory.length === 0) {
        Alert.alert('No Data', 'There are no inventory items to export');
        return;
      }

      const headers = ['Name', 'Producer', 'Variety', 'Lot Number', 'Quantity', 'Unit', 'Seeds Per Unit', 'Germination %', 'Traits', 'Treatments', 'Notes', 'Created At'];
      const rows = inventory.map(item => [
        `"${(item.name || '').replace(/"/g, '""')}"`,
        `"${(item.producer || '').replace(/"/g, '""')}"`,
        `"${(item.varietyName || '').replace(/"/g, '""')}"`,
        `"${(item.lotNumber || '').replace(/"/g, '""')}"`,
        item.quantity?.toString() || '0',
        item.unit || 'bags',
        item.seedsPerUnit?.toString() || '',
        item.germinationPercent || '',
        `"${(item.traits || []).join(', ')}"`,
        `"${(item.treatments || []).join(', ')}"`,
        `"${(item.notes || '').replace(/"/g, '""')}"`,
        item.createdAt || '',
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Alert.alert('Success', 'Inventory exported successfully');
      } else {
        const file = new File(Paths.document, `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
        file.create({ overwrite: true });
        file.write(csvContent);
        
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Inventory Data',
          });
        }
      }
      console.log('Inventory exported:', inventory.length);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export inventory');
    }
  };

  const handleItemPress = (item: InventoryItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/inventory/${item.id}` as any);
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: 'Out of Stock', color: Colors.error };
    if (quantity <= 2) return { label: 'Low Stock', color: Colors.warning };
    return { label: 'In Stock', color: Colors.success };
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search inventory..."
            placeholderTextColor={Colors.textLight}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleOpenActionModal}>
          <Plus size={20} color={Colors.textInverse} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Package size={20} color={Colors.primary} />
            <Text style={styles.statValue}>{totalItems}</Text>
            <Text style={styles.statLabel}>Total Items</Text>
          </View>
          <View style={[styles.statCard, lowStockItems > 0 && styles.statCardWarning]}>
            <AlertTriangle size={20} color={lowStockItems > 0 ? Colors.warning : Colors.textLight} />
            <Text style={[styles.statValue, lowStockItems > 0 && styles.statValueWarning]}>{lowStockItems}</Text>
            <Text style={styles.statLabel}>Low Stock</Text>
          </View>
          <View style={[styles.statCard, outOfStockItems > 0 && styles.statCardError]}>
            <TrendingDown size={20} color={outOfStockItems > 0 ? Colors.error : Colors.textLight} />
            <Text style={[styles.statValue, outOfStockItems > 0 && styles.statValueError]}>{outOfStockItems}</Text>
            <Text style={styles.statLabel}>Out of Stock</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Inventory</Text>
          {filteredInventory.length === 0 ? (
            <View style={styles.emptyState}>
              <Package size={48} color={Colors.textLight} />
              <Text style={styles.emptyTitle}>No inventory items</Text>
              <Text style={styles.emptySubtitle}>
                Add seed bags or boxes to track your inventory
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={handleOpenActionModal}>
                <Plus size={18} color={Colors.textInverse} />
                <Text style={styles.emptyButtonText}>Add Inventory</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredInventory.map(item => {
              const totalUsed = getTotalUsedForItem(item.id);
              const status = getStockStatus(item.quantity);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.inventoryCard}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.name || item.varietyName}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardSubtitle}>
                      {item.producer && item.lotNumber
                        ? `${item.producer} • ${item.lotNumber}`
                        : item.producer || item.lotNumber || 'No details'}
                    </Text>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.quantityInfo}>
                      <View style={styles.quantityRow}>
                        <Text style={styles.quantityLabel}>Remaining:</Text>
                        <Text style={[styles.quantityValue, item.quantity === 0 && styles.quantityEmpty]}>
                          {item.quantity} {item.unit}
                        </Text>
                      </View>
                      {totalUsed > 0 && (
                        <View style={styles.quantityRow}>
                          <Text style={styles.quantityLabel}>Used:</Text>
                          <Text style={styles.quantityUsed}>
                            {totalUsed} {item.unit}
                          </Text>
                        </View>
                      )}
                    </View>
                    <ChevronRight size={20} color={Colors.textLight} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {usageHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Usage</Text>
            <View style={styles.usageList}>
              {usageHistory.map(usage => (
                <View key={usage.id} style={styles.usageItem}>
                  <View style={styles.usageIcon}>
                    <TrendingDown size={16} color={Colors.accent} />
                  </View>
                  <View style={styles.usageInfo}>
                    <Text style={styles.usageItemName} numberOfLines={1}>
                      {usage.itemName}
                    </Text>
                    <Text style={styles.usageEntryLabel} numberOfLines={1}>
                      Used for: {usage.entryLabel}
                    </Text>
                  </View>
                  <View style={styles.usageQuantity}>
                    <Text style={styles.usageQuantityText}>
                      -{usage.quantityUsed} {usage.itemUnit}
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

      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowActionModal(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inventory Options</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowActionModal(false)}
              >
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.actionItem} onPress={handleManualAdd}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.primary + '15' }]}>
                <PlusCircle size={22} color={Colors.primary} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Add Manually</Text>
                <Text style={styles.actionSubtitle}>Create a new inventory item</Text>
              </View>
              <ChevronRight size={20} color={Colors.textLight} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleDownloadTemplate}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.accent + '15' }]}>
                <Download size={22} color={Colors.accent} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Download Template</Text>
                <Text style={styles.actionSubtitle}>Get CSV template for bulk import</Text>
              </View>
              <ChevronRight size={20} color={Colors.textLight} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleUploadFile}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.success + '15' }]}>
                <Upload size={22} color={Colors.success} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Upload File</Text>
                <Text style={styles.actionSubtitle}>Import from CSV or Dropbox</Text>
              </View>
              <ChevronRight size={20} color={Colors.textLight} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleExportData}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.warning + '15' }]}>
                <FileSpreadsheet size={22} color={Colors.warning} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Export Data</Text>
                <Text style={styles.actionSubtitle}>Download all inventory as CSV</Text>
              </View>
              <ChevronRight size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statCardWarning: {
    borderColor: Colors.warning + '40',
    backgroundColor: Colors.warning + '08',
  },
  statCardError: {
    borderColor: Colors.error + '40',
    backgroundColor: Colors.error + '08',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 6,
  },
  statValueWarning: {
    color: Colors.warning,
  },
  statValueError: {
    color: Colors.error,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  inventoryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityInfo: {
    flex: 1,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  quantityLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  quantityValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  quantityEmpty: {
    color: Colors.error,
  },
  quantityUsed: {
    fontSize: 14,
    color: Colors.accent,
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
  usageItemName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  usageEntryLabel: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  actionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
