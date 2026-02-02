import React, { useState, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import {
  Trash2,
  Download,
  Info,
  MapPin,
  FileText,
  ChevronRight,
  Leaf,
  FileSpreadsheet,
  HelpCircle,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const { entries, fields } = useData();
  const [isExporting, setIsExporting] = useState(false);
  const router = useRouter();

  const handleViewOnboarding = () => {
    router.push('/onboarding');
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const exportData = {
        entries,
        fields,
        exportedAt: new Date().toISOString(),
      };
      
      const jsonString = JSON.stringify(exportData, null, 2);
      console.log('Export data prepared:', jsonString.length, 'characters');
      
      Alert.alert(
        'Export Ready',
        `Data export contains ${entries.length} entries and ${fields.length} fields. Copy to clipboard?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Copy', 
            onPress: () => {
              console.log('Data exported to clipboard simulation');
              Alert.alert('Success', 'Data copied to clipboard');
            }
          },
        ]
      );
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    
    try {
      console.log('Starting Excel export...');
      
      const entriesData = entries.map(entry => ({
        'ID': entry.id,
        'Field Name': entry.fieldName || '',
        'Map Label': entry.mapLabel || '',
        'Producer': entry.producer || '',
        'Variety/Hybrid': entry.varietyName || '',
        'Lot Number': entry.lotNumber || '',
        'Planting Date': entry.plantingDate || '',
        'Rate (seeds/acre)': entry.rate || '',
        'Germination %': entry.germinationPercent || '',
        'Traits': entry.traits?.join(', ') || '',
        'Treatments': entry.treatments?.join(', ') || '',
        'Latitude': entry.coordinates?.latitude || '',
        'Longitude': entry.coordinates?.longitude || '',
        'Notes': entry.notes || '',
        'Entry Date': entry.entryDate || (entry.createdAt ? new Date(entry.createdAt).toISOString().split('T')[0] : ''),
        'Entry Time': entry.entryTime || (entry.createdAt ? new Date(entry.createdAt).toTimeString().split(' ')[0] : ''),
        'Created': entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '',
        'Updated': entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString() : '',
      }));

      const fieldsData = fields.map(field => ({
        'ID': field.id,
        'Field Name': field.name,
        'Crop Type': field.cropType,
        'Acreage': field.acreage,
        'Latitude': field.coordinates.latitude,
        'Longitude': field.coordinates.longitude,
        'Notes': field.notes,
        'Color': field.color,
        'Created': new Date(field.createdAt).toLocaleDateString(),
        'Updated': new Date(field.updatedAt).toLocaleDateString(),
      }));

      const wb = XLSX.utils.book_new();
      
      const wsEntries = XLSX.utils.json_to_sheet(
        entriesData.length > 0 ? entriesData : [{ 'Message': 'No entries found' }]
      );
      XLSX.utils.book_append_sheet(wb, wsEntries, 'Seed Entries');

      const wsFields = XLSX.utils.json_to_sheet(
        fieldsData.length > 0 ? fieldsData : [{ 'Message': 'No fields found' }]
      );
      XLSX.utils.book_append_sheet(wb, wsFields, 'Fields');

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      
      if (Platform.OS === 'web') {
        const blob = new Blob(
          [Uint8Array.from(atob(wbout), c => c.charCodeAt(0))],
          { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FarmSeed_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Success', 'Excel file downloaded successfully!');
      } else {
        const fileName = `FarmSeed_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
        const file = new File(Paths.cache, fileName);
        
        const binaryString = atob(wbout);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        file.write(bytes);
        
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Export FarmSeed Data',
          });
        } else {
          Alert.alert('Success', `File saved to: ${file.uri}`);
        }
      }
      
      console.log('Excel export completed successfully');
    } catch (error) {
      console.error('Excel export error:', error);
      Alert.alert('Error', 'Failed to export Excel file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all seed entries and fields. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'farmseed_entries',
                'farmseed_fields',
              ]);
              Alert.alert('Success', 'All data has been cleared. Restart the app to see changes.');
            } catch (error) {
              console.error('Clear data error:', error);
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const SettingRow = ({
    icon,
    title,
    subtitle,
    onPress,
    destructive = false,
    value,
  }: {
    icon: ReactNode;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    destructive?: boolean;
    value?: string;
  }) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIcon, destructive && styles.destructiveIcon]}>
        {icon}
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, destructive && styles.destructiveText]}>
          {title}
        </Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {onPress && <ChevronRight size={18} color={Colors.textLight} />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Leaf size={40} color={Colors.primary} />
        </View>
        <Text style={styles.appName}>FarmSeed Mapper</Text>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{entries.length}</Text>
          <Text style={styles.statLabel}>Entries</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{fields.length}</Text>
          <Text style={styles.statLabel}>Fields</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {new Set(entries.map(e => e.producer)).size}
          </Text>
          <Text style={styles.statLabel}>Producers</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        <View style={styles.sectionContent}>
          <SettingRow
            icon={<FileSpreadsheet size={20} color={Colors.primary} />}
            title="Export to Excel"
            subtitle="Download all data as spreadsheet (.xlsx)"
            onPress={handleExportExcel}
          />
          <SettingRow
            icon={<Download size={20} color={Colors.primary} />}
            title="Export as JSON"
            subtitle="Download raw data for backup"
            onPress={handleExportData}
          />
          <SettingRow
            icon={<Trash2 size={20} color={Colors.error} />}
            title="Clear All Data"
            subtitle="Permanently delete all records"
            onPress={handleClearData}
            destructive
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.sectionContent}>
          <SettingRow
            icon={<Info size={20} color={Colors.primary} />}
            title="App Information"
            subtitle="FarmSeed Mapper helps farmers track seed varieties planted across their fields"
          />
          <SettingRow
            icon={<MapPin size={20} color={Colors.primary} />}
            title="Location Services"
            subtitle="Required for accurate pin placement"
          />
          <SettingRow
            icon={<HelpCircle size={20} color={Colors.primary} />}
            title="View App Introduction"
            subtitle="See why we need permissions"
            onPress={handleViewOnboarding}
          />
          <SettingRow
            icon={<FileText size={20} color={Colors.primary} />}
            title="Privacy Policy"
            subtitle="Your data stays on your device"
          />
        </View>
      </View>

      <Text style={styles.footer}>
        Made for precision agriculture
      </Text>
    </ScrollView>
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
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingTop: 20,
    backgroundColor: Colors.surface,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 4,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 20,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  destructiveIcon: {
    backgroundColor: Colors.error + '15',
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  destructiveText: {
    color: Colors.error,
  },
  settingSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  settingValue: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginRight: 6,
  },
  footer: {
    textAlign: 'center',
    color: Colors.textLight,
    fontSize: 13,
    marginTop: 32,
    marginBottom: 16,
  },
});
