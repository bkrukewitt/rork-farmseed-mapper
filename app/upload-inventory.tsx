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
import { File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
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
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { InventoryUnit } from '@/types';

interface ParsedRow {
  name: string;
  producer: string;
  varietyName: string;
  lotNumber: string;
  quantity: number;
  unit: InventoryUnit;
  seedsPerUnit: number;
  germinationPercent: string;
  purchaseDate: string;
  expirationDate: string;
  notes: string;
  traits: string[];
  treatments: string[];
}

const BATCH_SIZE = 50;

const INVENTORY_TEMPLATE_CSV = `Name,Producer,Variety,Lot Number,Quantity,Unit,Seeds Per Unit,Germination %,Purchase Date,Expiration Date,Traits,Treatments,Notes
Corn Hybrid A,Pioneer,P1234,LOT-2024-001,50,bags,80000,95%,2024-01-15,2025-12-31,"Drought Tolerant,High Yield",Treated,Sample entry
Soybean Premium,Dekalb,DK4567,LOT-2024-002,30,bags,140000,92%,2024-02-01,2025-06-30,Non-GMO,,Another sample`;

export default function UploadInventoryScreen() {
  const router = useRouter();
  const { addMultipleInventoryItems } = useData();
  const abortRef = useRef(false);

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
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
      const file = new File(uri);
      const content = await file.text();
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
        if (h.includes('name') && !h.includes('variety')) columnMap['name'] = index;
        if (h.includes('producer') || h.includes('brand')) columnMap['producer'] = index;
        if (h.includes('variety') || h.includes('hybrid')) columnMap['varietyName'] = index;
        if (h.includes('lot') || h.includes('lotnumber')) columnMap['lotNumber'] = index;
        if (h.includes('quantity') || h.includes('qty') || h.includes('amount')) columnMap['quantity'] = index;
        if (h.includes('unit') && !h.includes('seeds')) columnMap['unit'] = index;
        if (h.includes('seedsper') || h.includes('seedcount')) columnMap['seedsPerUnit'] = index;
        if (h.includes('germination') || h.includes('germ')) columnMap['germinationPercent'] = index;
        if (h.includes('purchase') || h.includes('purchasedate')) columnMap['purchaseDate'] = index;
        if (h.includes('expir') || h.includes('expiration')) columnMap['expirationDate'] = index;
        if (h.includes('note')) columnMap['notes'] = index;
        if (h.includes('trait')) columnMap['traits'] = index;
        if (h.includes('treatment')) columnMap['treatments'] = index;
      });

      console.log('Column mapping:', columnMap);

      const errors: string[] = [];
      const parsed: ParsedRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (abortRef.current) break;
        
        const values = parseCSVLine(lines[i]);
        
        try {
          const getValue = (key: string): string => {
            const idx = columnMap[key];
            return idx !== undefined && values[idx] ? values[idx].trim().replace(/^"|"$/g, '') : '';
          };

          const quantityStr = getValue('quantity');
          const quantity = quantityStr ? parseFloat(quantityStr) : 0;
          
          if (isNaN(quantity) || quantity < 0) {
            errors.push(`Row ${i + 1}: Invalid quantity "${quantityStr}"`);
            continue;
          }

          const unitStr = getValue('unit').toLowerCase();
          let unit: InventoryUnit = 'bags';
          if (unitStr.includes('box')) unit = 'boxes';
          else if (unitStr.includes('unit')) unit = 'units';

          const traitsStr = getValue('traits');
          const traits = traitsStr ? traitsStr.split(/[,;]/).map(t => t.trim()).filter(Boolean) : [];

          const treatmentsStr = getValue('treatments');
          const treatments = treatmentsStr ? treatmentsStr.split(/[,;]/).map(t => t.trim()).filter(Boolean) : [];

          const seedsPerUnitStr = getValue('seedsPerUnit');
          const seedsPerUnit = seedsPerUnitStr ? parseInt(seedsPerUnitStr) : 0;

          const row: ParsedRow = {
            name: getValue('name') || getValue('varietyName'),
            producer: getValue('producer'),
            varietyName: getValue('varietyName'),
            lotNumber: getValue('lotNumber'),
            quantity,
            unit,
            seedsPerUnit: isNaN(seedsPerUnit) ? 0 : seedsPerUnit,
            germinationPercent: getValue('germinationPercent'),
            purchaseDate: getValue('purchaseDate'),
            expirationDate: getValue('expirationDate'),
            notes: getValue('notes'),
            traits,
            treatments,
          };

          if (!row.name && !row.varietyName) {
            errors.push(`Row ${i + 1}: Missing name or variety name`);
            continue;
          }

          parsed.push(row);
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

        addMultipleInventoryItems(batchData);
        
        const progress = Math.round(((batch + 1) / totalBatches) * 100);
        setImportProgress(progress);
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (!abortRef.current) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Import Complete',
          `Successfully imported ${parsedData.length} inventory items`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Error', 'Failed to import inventory items');
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
        const blob = new Blob([INVENTORY_TEMPLATE_CSV], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'inventory_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const file = new File(Paths.cache, 'inventory_template.csv');
        file.create({ overwrite: true });
        file.write(INVENTORY_TEMPLATE_CSV);
        
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'text/csv',
            dialogTitle: 'Save Inventory Template',
            UTI: 'public.comma-separated-values-text',
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      console.error('Download template error:', error);
      Alert.alert('Error', 'Failed to download template');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Import Inventory' }} />
      
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
          <Text style={styles.headerTitle}>Import Inventory</Text>
          <Text style={styles.headerSubtitle}>
            Upload a CSV file or import from Dropbox
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expected Columns</Text>
          <View style={styles.columnsCard}>
            <Text style={styles.columnsText}>
              Name, Producer, Variety, Lot Number, Quantity, Unit, Seeds Per Unit, Germination %, Purchase Date, Expiration Date, Traits, Treatments, Notes
            </Text>
          </View>
          <Text style={styles.columnsNote}>
            Column headers are flexible - the system will attempt to match similar names
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
                {parsedData.length} Item{parsedData.length > 1 ? 's' : ''} Ready to Import
              </Text>
            </View>
            <View style={styles.previewList}>
              {parsedData.slice(0, 5).map((row, index) => (
                <View key={index} style={styles.previewItem}>
                  <Text style={styles.previewItemName} numberOfLines={1}>
                    {row.name || row.varietyName}
                  </Text>
                  <Text style={styles.previewItemDetails}>
                    {row.quantity} {row.unit} • {row.producer || 'No producer'}
                  </Text>
                </View>
              ))}
              {parsedData.length > 5 && (
                <Text style={styles.previewMore}>
                  ... and {parsedData.length - 5} more items
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
                <Text style={styles.importButtonText}>{`Import ${parsedData.length > 0 ? parsedData.length : ''} Items`}</Text>
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
