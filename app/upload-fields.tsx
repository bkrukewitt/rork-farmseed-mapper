import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
  Cloud,
  Link as LinkIcon,
  FileDown,
} from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';

interface ParsedField {
  name: string;
  acreage: string;
  cropType: string;
  coordinates: { latitude: number; longitude: number };
  color: string;
  notes: string;
}

const BATCH_SIZE = 50;

const FIELDS_TEMPLATE_CSV = `Name,Acreage,Crop Type,Latitude,Longitude,Color,Notes
North Field,120,Corn,41.8781,-87.6298,#4CAF50,Sample field entry
South Pasture,80,Soybeans,41.8750,-87.6320,#2196F3,Another sample field`;

export default function UploadFieldsScreen() {
  const router = useRouter();
  const { addMultipleFields } = useData();
  const abortRef = useRef(false);

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedField[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [dropboxUrl, setDropboxUrl] = useState('');
  const [showDropboxInput, setShowDropboxInput] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const pickDocument = async () => {
    try {
      abortRef.current = false;
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile(asset.uri);
        setFileName(asset.name);
        setParsedData([]);
        setParseErrors([]);
        setShowDropboxInput(false);
        console.log('File selected:', asset.name);
        
        await parseFile(asset.uri);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleDropboxUpload = async () => {
    if (!dropboxUrl.trim()) {
      Alert.alert('Error', 'Please enter a Dropbox URL');
      return;
    }

    setIsLoading(true);
    setParsedData([]);
    setParseErrors([]);
    abortRef.current = false;

    try {
      let directUrl = dropboxUrl.trim();
      if (directUrl.includes('dropbox.com')) {
        directUrl = directUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
        directUrl = directUrl.replace('?dl=0', '').replace('?dl=1', '');
        if (!directUrl.includes('dl.dropboxusercontent.com')) {
          directUrl = directUrl.replace('dropbox.com', 'dl.dropboxusercontent.com');
        }
      }

      console.log('Fetching from Dropbox URL:', directUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(directUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/csv,text/plain,*/*',
        },
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }

      const content = await response.text();
      console.log('Dropbox file content length:', content.length);
      
      setFileName('Dropbox File');
      setSelectedFile('dropbox');
      await parseContent(content);
    } catch (error: any) {
      console.error('Dropbox fetch error:', error);
      if (error.name === 'AbortError') {
        Alert.alert('Timeout', 'Request timed out. Please try again or use a smaller file.');
      } else {
        Alert.alert('Error', 'Failed to fetch file from Dropbox. Make sure the link is valid and the file is publicly accessible.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const parseFile = async (uri: string) => {
    setIsLoading(true);
    setParseErrors([]);
    
    try {
      const content = await FileSystem.readAsStringAsync(uri);
      console.log('File content length:', content.length);
      await parseContent(content);
    } catch (error) {
      console.error('Parse error:', error);
      setParseErrors(['Failed to read or parse file']);
    } finally {
      setIsLoading(false);
    }
  };

  const parseContent = async (content: string) => {
    try {
      const lines = content.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length < 2) {
        setParseErrors(['File must have a header row and at least one data row']);
        return;
      }

      const headerLine = lines[0].toLowerCase();
      const headers = parseCSVLine(headerLine);
      console.log('Parsed headers:', headers);
      
      const columnMap: { [key: string]: number } = {};
      headers.forEach((header, index) => {
        const h = header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (h.includes('name') && !h.includes('crop')) columnMap['name'] = index;
        if (h.includes('acreage') || h.includes('acre') || h.includes('size')) columnMap['acreage'] = index;
        if (h.includes('crop') || h.includes('croptype')) columnMap['cropType'] = index;
        if (h.includes('lat')) columnMap['latitude'] = index;
        if (h.includes('lon') || h.includes('lng')) columnMap['longitude'] = index;
        if (h.includes('color') || h.includes('colour')) columnMap['color'] = index;
        if (h.includes('note')) columnMap['notes'] = index;
      });

      console.log('Column mapping:', columnMap);

      const errors: string[] = [];
      const parsed: ParsedField[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (abortRef.current) break;
        
        const values = parseCSVLine(lines[i]);
        
        try {
          const getValue = (key: string): string => {
            const idx = columnMap[key];
            return idx !== undefined && values[idx] ? values[idx].trim().replace(/^"|"$/g, '') : '';
          };

          const name = getValue('name');
          if (!name) {
            errors.push(`Row ${i + 1}: Missing field name`);
            continue;
          }

          const latStr = getValue('latitude');
          const lonStr = getValue('longitude');
          const latitude = latStr ? parseFloat(latStr) : 40.0;
          const longitude = lonStr ? parseFloat(lonStr) : -95.0;

          if (latStr && (isNaN(latitude) || latitude < -90 || latitude > 90)) {
            errors.push(`Row ${i + 1}: Invalid latitude "${latStr}"`);
            continue;
          }

          if (lonStr && (isNaN(longitude) || longitude < -180 || longitude > 180)) {
            errors.push(`Row ${i + 1}: Invalid longitude "${lonStr}"`);
            continue;
          }

          const field: ParsedField = {
            name,
            acreage: getValue('acreage'),
            cropType: getValue('cropType'),
            coordinates: { latitude, longitude },
            color: getValue('color') || '#4CAF50',
            notes: getValue('notes'),
          };

          parsed.push(field);
        } catch {
          errors.push(`Row ${i + 1}: Failed to parse row`);
        }

        if (i % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      setParsedData(parsed);
      setParseErrors(errors);
      console.log('Parsed rows:', parsed.length, 'Errors:', errors.length);
    } catch (error) {
      console.error('Parse content error:', error);
      setParseErrors(['Failed to parse file content']);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result;
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      Alert.alert('No Data', 'No valid data to import');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    abortRef.current = false;

    try {
      const totalBatches = Math.ceil(parsedData.length / BATCH_SIZE);
      
      for (let batch = 0; batch < totalBatches; batch++) {
        if (abortRef.current) {
          Alert.alert('Cancelled', 'Import was cancelled');
          break;
        }

        const start = batch * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, parsedData.length);
        const batchData = parsedData.slice(start, end);

        addMultipleFields(batchData);
        
        const progress = Math.round(((batch + 1) / totalBatches) * 100);
        setImportProgress(progress);
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (!abortRef.current) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Import Complete',
          `Successfully imported ${parsedData.length} fields`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Error', 'Failed to import fields');
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const handleCancel = () => {
    if (isImporting) {
      abortRef.current = true;
    } else {
      router.back();
    }
  };

  const downloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([FIELDS_TEMPLATE_CSV], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fields_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Use File API which is more reliable on iOS
        const fileName = 'fields_template.csv';
        let file: File;
        let fileUri: string;
        
        try {
          // Try using Paths.cache first (more reliable)
          console.log('[DEBUG] Attempting to use File API with Paths.cache');
          file = new File(Paths.cache, fileName);
          file.create({ overwrite: true });
          file.write(FIELDS_TEMPLATE_CSV);
          fileUri = file.uri;
          console.log('[DEBUG] File created using Paths.cache:', fileUri);
        } catch (fileError: any) {
          console.log('[DEBUG] File API with Paths.cache failed:', fileError.message);
          
          // Fallback: Try using FileSystem API directly
          try {
            const directory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
            if (!directory) {
              throw new Error('No file system directory available');
            }
            
            fileUri = directory + fileName;
            console.log('[DEBUG] Fallback: Using FileSystem API, directory:', directory);
            
            await FileSystem.writeAsStringAsync(fileUri, FIELDS_TEMPLATE_CSV, {
              encoding: FileSystem.EncodingType.UTF8 as any,
            });
            
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            if (!fileInfo.exists) {
              throw new Error('File was not created successfully');
            }
            console.log('[DEBUG] File created using FileSystem API:', fileUri);
          } catch (fsError: any) {
            console.error('[DEBUG] Both File API and FileSystem API failed:', fsError);
            throw new Error(`Unable to create file: ${fsError.message || 'Unknown error'}`);
          }
        }
        
        // Check if sharing is available
        const canShare = await Sharing.isAvailableAsync();
        console.log('[DEBUG] Sharing available:', canShare);
        
        if (canShare) {
          try {
            const result = await Sharing.shareAsync(fileUri, {
              mimeType: 'text/csv',
              dialogTitle: 'Save Fields Template',
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
    } catch (error: any) {
      console.error('[DEBUG] Download template error:', error);
      console.error('[DEBUG] Error details:', {
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        platform: Platform.OS,
        documentDir: FileSystem.documentDirectory,
        cacheDir: FileSystem.cacheDirectory,
      });
      
      const errorMessage = error?.message || 'Unknown error occurred';
      Alert.alert(
        'Download Failed',
        `Failed to download template:\n\n${errorMessage}\n\nCheck console for details.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Import Fields' }} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerSection}>
          <View style={styles.headerIcon}>
            <FileSpreadsheet size={32} color={Colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Import Fields</Text>
          <Text style={styles.headerSubtitle}>
            Upload a CSV file or import from Dropbox
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expected Columns</Text>
          <View style={styles.columnsCard}>
            <Text style={styles.columnsText}>
              Name*, Acreage, Crop Type, Latitude, Longitude, Color, Notes
            </Text>
          </View>
          <Text style={styles.columnsNote}>
            * Required field. Column headers are flexible.
          </Text>
          <TouchableOpacity
            style={styles.downloadTemplateButton}
            onPress={downloadTemplate}
            disabled={isDownloadingTemplate}
            activeOpacity={0.7}
          >
            {isDownloadingTemplate ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <FileDown size={18} color={Colors.primary} />
                <Text style={styles.downloadTemplateText}>Download Template CSV</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.uploadOptions}>
          <TouchableOpacity
            style={styles.uploadArea}
            onPress={pickDocument}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            {isLoading && !showDropboxInput ? (
              <ActivityIndicator size="large" color={Colors.primary} />
            ) : selectedFile && !showDropboxInput ? (
              <>
                <FileText size={48} color={Colors.primary} />
                <Text style={styles.uploadFileName}>{fileName}</Text>
                <Text style={styles.uploadChangeText}>Tap to change file</Text>
              </>
            ) : (
              <>
                <Upload size={48} color={Colors.primary} />
                <Text style={styles.uploadTitle}>Select File</Text>
                <Text style={styles.uploadSubtitle}>CSV or Excel (.xlsx) format</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.orDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.dropboxButton}
            onPress={() => setShowDropboxInput(!showDropboxInput)}
            activeOpacity={0.7}
          >
            <Cloud size={24} color={Colors.accent} />
            <Text style={styles.dropboxButtonText}>Import from Dropbox</Text>
          </TouchableOpacity>

          {showDropboxInput && (
            <View style={styles.dropboxInputContainer}>
              <View style={styles.dropboxInputRow}>
                <LinkIcon size={20} color={Colors.textLight} />
                <TextInput
                  style={styles.dropboxInput}
                  placeholder="Paste Dropbox share link..."
                  placeholderTextColor={Colors.textLight}
                  value={dropboxUrl}
                  onChangeText={setDropboxUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <TouchableOpacity
                style={[styles.fetchButton, (!dropboxUrl.trim() || isLoading) && styles.fetchButtonDisabled]}
                onPress={handleDropboxUpload}
                disabled={!dropboxUrl.trim() || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <Text style={styles.fetchButtonText}>Fetch File</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.dropboxHint}>
                Make sure your Dropbox link is set to &quot;Anyone with link can view&quot;
              </Text>
            </View>
          )}
        </View>

        {parseErrors.length > 0 && (
          <View style={styles.errorsSection}>
            <View style={styles.errorHeader}>
              <AlertCircle size={20} color={Colors.error} />
              <Text style={styles.errorTitle}>
                {parseErrors.length} Error{parseErrors.length > 1 ? 's' : ''} Found
              </Text>
            </View>
            {parseErrors.slice(0, 5).map((error, index) => (
              <Text key={index} style={styles.errorText}>• {error}</Text>
            ))}
            {parseErrors.length > 5 && (
              <Text style={styles.errorMore}>
                ... and {parseErrors.length - 5} more errors
              </Text>
            )}
          </View>
        )}

        {parsedData.length > 0 && (
          <View style={styles.previewSection}>
            <View style={styles.previewHeader}>
              <CheckCircle size={20} color={Colors.success} />
              <Text style={styles.previewTitle}>
                {parsedData.length} Field{parsedData.length > 1 ? 's' : ''} Ready to Import
              </Text>
            </View>
            <View style={styles.previewList}>
              {parsedData.slice(0, 5).map((field, index) => (
                <View key={index} style={styles.previewItem}>
                  <Text style={styles.previewItemName} numberOfLines={1}>
                    {field.name}
                  </Text>
                  <Text style={styles.previewItemDetails}>
                    {field.acreage ? `${field.acreage} acres` : 'No acreage'} • {field.cropType || 'No crop type'}
                  </Text>
                </View>
              ))}
              {parsedData.length > 5 && (
                <Text style={styles.previewMore}>
                  ... and {parsedData.length - 5} more fields
                </Text>
              )}
            </View>
          </View>
        )}

        {isImporting && (
          <View style={styles.progressSection}>
            <Text style={styles.progressText}>Importing... {importProgress}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${importProgress}%` }]} />
            </View>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>
              {isImporting ? 'Cancel' : 'Back'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.importButton,
              (parsedData.length === 0 || isImporting) && styles.importButtonDisabled,
            ]}
            onPress={handleImport}
            disabled={parsedData.length === 0 || isImporting}
          >
            {isImporting ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : (
              <>
                <Download size={20} color={Colors.textInverse} />
                <Text style={styles.importButtonText}>{`Import ${parsedData.length > 0 ? parsedData.length : ''} Fields`}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
    width: 72,
    height: 72,
    borderRadius: 22,
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
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 10,
  },
  columnsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  columnsText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  columnsNote: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 8,
    fontStyle: 'italic',
  },
  downloadTemplateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary + '15',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 12,
  },
  downloadTemplateText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  uploadOptions: {
    marginBottom: 20,
  },
  uploadArea: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    padding: 32,
    alignItems: 'center',
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 12,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  uploadFileName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 12,
    textAlign: 'center',
  },
  uploadChangeText: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 6,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  orText: {
    paddingHorizontal: 16,
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: '500' as const,
  },
  dropboxButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  dropboxButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
  dropboxInputContainer: {
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  dropboxInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  dropboxInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 12,
  },
  fetchButton: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  fetchButtonDisabled: {
    opacity: 0.5,
  },
  fetchButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  dropboxHint: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorsSection: {
    backgroundColor: Colors.error + '10',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    marginBottom: 4,
  },
  errorMore: {
    fontSize: 13,
    color: Colors.error,
    fontStyle: 'italic',
    marginTop: 4,
  },
  previewSection: {
    backgroundColor: Colors.success + '10',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  previewList: {
    gap: 8,
  },
  previewItem: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
  },
  previewItemName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  previewItemDetails: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  previewMore: {
    fontSize: 13,
    color: Colors.success,
    fontStyle: 'italic',
    marginTop: 4,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
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
  importButton: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  importButtonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
});
