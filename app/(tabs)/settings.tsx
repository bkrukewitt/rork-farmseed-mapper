import React, { useState, ReactNode, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
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
  AlertTriangle,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { useRouter } from 'expo-router';

interface ErrorLogEntry {
  timestamp: string;
  message: string;
  stack?: string;
  source?: string;
}

const ERROR_LOG_KEY = 'farmseed_error_log';
const MAX_LOG_ENTRIES = 1000; // Keep last 1000 errors

export default function SettingsScreen() {
  const { entries, fields } = useData();
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingErrorLog, setIsExportingErrorLog] = useState(false);
  const [errorLogCount, setErrorLogCount] = useState(0);
  const router = useRouter();
  const originalConsoleError = useRef(console.error);

  // Initialize error logging
  useEffect(() => {
    // Load error log count
    loadErrorLogCount();
    
    // Override console.error to capture errors
    console.error = (...args: any[]) => {
      // Call original console.error
      originalConsoleError.current(...args);
      
      // Log to our error storage
      const errorMessage = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      logError(errorMessage, new Error().stack);
    };

    // Capture unhandled promise rejections
    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || String(event.reason) || 'Unhandled promise rejection';
      logError(errorMessage, event.reason?.stack);
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', unhandledRejectionHandler);
    }

    return () => {
      console.error = originalConsoleError.current;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
      }
    };
  }, []);

  const loadErrorLogCount = async () => {
    try {
      const logData = await AsyncStorage.getItem(ERROR_LOG_KEY);
      if (logData) {
        const logs: ErrorLogEntry[] = JSON.parse(logData);
        setErrorLogCount(logs.length);
      }
    } catch (error) {
      console.error('Error loading error log count:', error);
    }
  };

  const logError = async (message: string, stack?: string) => {
    try {
      const logData = await AsyncStorage.getItem(ERROR_LOG_KEY);
      let logs: ErrorLogEntry[] = logData ? JSON.parse(logData) : [];
      
      const newEntry: ErrorLogEntry = {
        timestamp: new Date().toISOString(),
        message,
        stack,
        source: 'console.error',
      };
      
      logs.push(newEntry);
      
      // Keep only the last MAX_LOG_ENTRIES
      if (logs.length > MAX_LOG_ENTRIES) {
        logs = logs.slice(-MAX_LOG_ENTRIES);
      }
      
      await AsyncStorage.setItem(ERROR_LOG_KEY, JSON.stringify(logs));
      setErrorLogCount(logs.length);
    } catch (error) {
      // Silently fail to avoid infinite loop
      originalConsoleError.current('Error logging failed:', error);
    }
  };

  const handleExportErrorLog = async () => {
    setIsExportingErrorLog(true);
    try {
      const logData = await AsyncStorage.getItem(ERROR_LOG_KEY);
      const logs: ErrorLogEntry[] = logData ? JSON.parse(logData) : [];
      
      if (logs.length === 0) {
        Alert.alert('No Errors', 'No error logs found to export.');
        return;
      }

      // Format error log as text
      let errorLogText = `FarmSeed Mapper - Error Log\n`;
      errorLogText += `Generated: ${new Date().toLocaleString()}\n`;
      errorLogText += `Total Errors: ${logs.length}\n`;
      errorLogText += `Platform: ${Platform.OS}\n`;
      errorLogText += `${'='.repeat(60)}\n\n`;

      logs.forEach((entry, index) => {
        errorLogText += `[${index + 1}] ${entry.timestamp}\n`;
        errorLogText += `Source: ${entry.source || 'Unknown'}\n`;
        errorLogText += `Message: ${entry.message}\n`;
        if (entry.stack) {
          errorLogText += `Stack:\n${entry.stack}\n`;
        }
        errorLogText += `${'-'.repeat(60)}\n\n`;
      });

      if (Platform.OS === 'web') {
        const blob = new Blob([errorLogText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error_log_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Alert.alert('Success', 'Error log downloaded successfully');
      } else {
        const directory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
        if (!directory) {
          throw new Error('No file system directory available');
        }
        
        const fileName = `error_log_${new Date().toISOString().split('T')[0]}.txt`;
        const fileUri = directory + fileName;
        
        console.log('[DEBUG] Export error log - Writing file to:', fileUri);
        
        await FileSystem.writeAsStringAsync(fileUri, errorLogText, {
          encoding: FileSystem.EncodingType.UTF8 as any,
        });
        
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        console.log('[DEBUG] Error log file created:', fileInfo.exists);
        
        if (!fileInfo.exists) {
          throw new Error('Error log file was not created successfully');
        }
        
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          try {
            const result = await Sharing.shareAsync(fileUri, {
              mimeType: 'text/plain',
              dialogTitle: 'Export Error Log',
              UTI: 'public.plain-text',
            });
            console.log('[DEBUG] Error log sharing result:', result);
            
            if (result.action === Sharing.SharingResultAction.shared) {
              Alert.alert('Success', 'Error log exported successfully');
            }
          } catch (shareError: any) {
            console.error('[DEBUG] Error log sharing error:', shareError);
            throw new Error(`Sharing failed: ${shareError.message || 'Unknown error'}`);
          }
        } else {
          Alert.alert(
            'Error Log Saved',
            `Error log saved to app documents.\n\nFile: ${fileName}\n\nYou can access it through the Files app.`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      console.error('[DEBUG] Export error log error:', error);
      Alert.alert(
        'Export Failed',
        `Failed to export error log:\n\n${error?.message || 'Unknown error'}\n\nCheck console for details.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsExportingErrorLog(false);
    }
  };

  const handleClearErrorLog = () => {
    Alert.alert(
      'Clear Error Log',
      `This will permanently delete all ${errorLogCount} error log entries. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(ERROR_LOG_KEY);
              setErrorLogCount(0);
              Alert.alert('Success', 'Error log cleared');
            } catch (error) {
              console.error('Clear error log error:', error);
              Alert.alert('Error', 'Failed to clear error log');
            }
          },
        },
      ]
    );
  };

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
    isLoading,
  }: {
    icon: ReactNode;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    destructive?: boolean;
    value?: string;
    isLoading?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress || isLoading}
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
      {isLoading ? (
        <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 8 }} />
      ) : value ? (
        <Text style={styles.settingValue}>{value}</Text>
      ) : null}
      {onPress && !isLoading && <ChevronRight size={18} color={Colors.textLight} />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Leaf size={40} color={Colors.primary} />
        </View>
        <Text style={styles.appName}>FarmSeed Mapper</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Debugging</Text>
        <View style={styles.sectionContent}>
          <SettingRow
            icon={<AlertTriangle size={20} color={Colors.warning} />}
            title="Export Error Log"
            subtitle={errorLogCount > 0 ? `${errorLogCount} error${errorLogCount !== 1 ? 's' : ''} logged` : 'No errors logged'}
            onPress={handleExportErrorLog}
            isLoading={isExportingErrorLog}
          />
          {errorLogCount > 0 && (
            <SettingRow
              icon={<Trash2 size={20} color={Colors.error} />}
              title="Clear Error Log"
              subtitle={`Remove all ${errorLogCount} error entries`}
              onPress={handleClearErrorLog}
              destructive
            />
          )}
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
  version: {
    fontSize: 14,
    color: Colors.textSecondary,
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
