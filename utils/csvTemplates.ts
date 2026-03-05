import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';

// CSV Template content (preserved from original system)
export const FIELDS_TEMPLATE = `Name,Acreage,Crop Type,Latitude,Longitude,Color,Notes
North Field,120,Corn,41.8781,-87.6298,#4CAF50,Sample field entry
South Pasture,80,Soybeans,41.8750,-87.6320,#2196F3,Another sample field`;

export const INVENTORY_TEMPLATE = `Name,Producer,Variety,Lot Number,Quantity,Unit,Seeds Per Unit,Germination %,Purchase Date,Expiration Date,Traits,Treatments,Notes
Corn Hybrid A,Pioneer,P1234,LOT-2024-001,50,bags,80000,95%,2024-01-15,2025-12-31,"Drought Tolerant,High Yield",Treated,Sample entry
Soybean Premium,Dekalb,DK4567,LOT-2024-002,30,bags,140000,92%,2024-02-01,2025-06-30,Non-GMO,,Another sample`;

/**
 * Simple template download function that works reliably across platforms
 */
export async function downloadCsvTemplate(
  templateContent: string,
  fileName: string
): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      // Web platform - simple blob download
      const blob = new Blob([templateContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `${fileName} downloaded successfully`);
      return;
    }

    // Mobile platforms - use File API for reliability
    const file = new File(Paths.cache, fileName);
    file.create({ overwrite: true });
    file.write(templateContent);

    // Simple sharing approach
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: `Save ${fileName}`,
      });
    } else {
      Alert.alert('Template Ready', `Template saved to cache as ${fileName}`);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error: any) {
    console.error('Template download error:', error);
    Alert.alert(
      'Download Failed',
      `Failed to download template: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Download fields template
 */
export async function downloadFieldsTemplate(): Promise<void> {
  return downloadCsvTemplate(FIELDS_TEMPLATE, 'fields_template.csv');
}

/**
 * Download inventory template
 */
export async function downloadInventoryTemplate(): Promise<void> {
  return downloadCsvTemplate(INVENTORY_TEMPLATE, 'inventory_template.csv');
}