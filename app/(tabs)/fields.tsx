import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Layers,
  Plus,
  ChevronRight,
  Calendar,
  Ruler,
  Wheat,
  X,
  PlusCircle,
  Download,
  Upload,
  FileSpreadsheet,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { Field } from '@/types';

const FIELD_CSV_TEMPLATE = `Name,Acreage,Crop Type,Latitude,Longitude,Color,Notes
North 40,80,Corn,40.123456,-95.123456,#4CAF50,Example field
South Field,120,Soybeans,40.234567,-95.234567,#2196F3,Another example`;

export default function FieldsScreen() {
  const router = useRouter();
  const { fields } = useData();
  const [refreshing, setRefreshing] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  }, []);

  const handleFieldPress = (id: string) => {
    router.push(`/field/${id}` as never);
  };

  const handleAddField = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowActionModal(true);
  };

  const handleManualAdd = () => {
    setShowActionModal(false);
    router.push('/add-field' as never);
  };

  const handleDownloadTemplate = async () => {
    setShowActionModal(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { downloadTemplate } = await import('@/utils/templateDownload');
      await downloadTemplate(FIELD_CSV_TEMPLATE, 'fields_template.csv', 'text/csv');
      console.log('Fields template downloaded');
    } catch (error) {
      console.error('Download template error:', error);
      // Error already handled in downloadTemplate utility
    }
  };

  const handleUploadFile = () => {
    setShowActionModal(false);
    router.push('/upload-fields' as never);
  };

  const handleExportData = async () => {
    setShowActionModal(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      if (fields.length === 0) {
        Alert.alert('No Data', 'There are no fields to export');
        return;
      }

      const headers = ['Name', 'Acreage', 'Crop Type', 'Latitude', 'Longitude', 'Color', 'Notes', 'Created At'];
      const rows = fields.map(field => [
        `"${(field.name || '').replace(/"/g, '""')}"`,
        field.acreage || '',
        field.cropType || '',
        field.coordinates?.latitude?.toString() || '',
        field.coordinates?.longitude?.toString() || '',
        field.color || '',
        `"${(field.notes || '').replace(/"/g, '""')}"`,
        field.createdAt || '',
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fields_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Alert.alert('Success', 'Fields exported successfully');
      } else {
        const file = new File(Paths.document, `fields_export_${new Date().toISOString().split('T')[0]}.csv`);
        file.create({ overwrite: true });
        file.write(csvContent);
        
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Fields Data',
          });
        }
      }
      console.log('Fields exported:', fields.length);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export fields');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderField = ({ item }: { item: Field }) => (
    <TouchableOpacity
      style={styles.fieldCard}
      onPress={() => handleFieldPress(item.id)}
      activeOpacity={0.7}
      testID={`field-card-${item.id}`}
    >
      <View style={[styles.fieldIcon, { backgroundColor: item.color + '20' }]}>
        <Layers size={28} color={item.color || Colors.primary} />
      </View>
      
      <View style={styles.fieldInfo}>
        <Text style={styles.fieldName} numberOfLines={1}>
          {item.name || 'Unnamed Field'}
        </Text>
        
        <View style={styles.fieldMeta}>
          {item.acreage && (
            <View style={styles.metaItem}>
              <Ruler size={14} color={Colors.textLight} />
              <Text style={styles.metaText}>{item.acreage} acres</Text>
            </View>
          )}
          {item.cropType && (
            <View style={styles.metaItem}>
              <Wheat size={14} color={Colors.textLight} />
              <Text style={styles.metaText}>{item.cropType}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.dateRow}>
          <Calendar size={12} color={Colors.textLight} />
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
      
      <View style={[styles.colorDot, { backgroundColor: item.color || Colors.primary }]} />
      <ChevronRight size={20} color={Colors.textLight} />
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Layers size={64} color={Colors.borderLight} />
      <Text style={styles.emptyTitle}>No Fields</Text>
      <Text style={styles.emptyText}>
        Tap the + button to add your first field
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={fields}
        renderItem={renderField}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.fab} onPress={handleAddField} testID="add-field-fab">
        <Plus size={26} color={Colors.textInverse} />
      </TouchableOpacity>

      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowActionModal(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Field</Text>
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
                <Text style={styles.actionSubtitle}>Create a new field entry</Text>
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
                <Text style={styles.actionSubtitle}>Download all fields as CSV</Text>
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  fieldCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  fieldIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  fieldName: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  fieldMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textLight,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: 20,
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
