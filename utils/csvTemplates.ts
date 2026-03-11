import { Platform, Alert } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';

export const FIELDS_TEMPLATE = `Name,Acreage,Crop Type,Latitude,Longitude,Color,Notes
North Field,120,Corn,41.8781,-87.6298,#4CAF50,Sample field entry
South Pasture,80,Soybeans,41.8750,-87.6320,#2196F3,Another sample field`;

export const INVENTORY_TEMPLATE = `Name,Producer,Variety,Lot Number,Quantity,Unit,Seeds Per Unit,Germination %,Purchase Date,Expiration Date,Traits,Treatments,Notes
Corn Hybrid A,Pioneer,P1234,LOT-2024-001,50,bags,80000,95%,2024-01-15,2025-12-31,"Drought Tolerant,High Yield",Treated,Sample entry
Soybean Premium,Dekalb,DK4567,LOT-2024-002,30,bags,140000,92%,2024-02-01,2025-06-30,Non-GMO,,Another sample`;

async function downloadCsvTemplate(
  templateContent: string,
  fileName: string
): Promise<void> {
  console.log('[Template] Starting download for:', fileName);

  try {
    if (Platform.OS === 'web') {
      console.log('[Template] Web platform detected, using blob download');
      const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      }, 100);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `${fileName} downloaded successfully`);
      return;
    }

    const file = new File(Paths.cache, fileName);
    console.log('[Template] Writing file to:', file.uri);

    file.create({ overwrite: true });
    file.write(templateContent);

    console.log('[Template] File written successfully, opening share sheet');

    const sharingAvailable = await Sharing.isAvailableAsync();
    if (!sharingAvailable) {
      Alert.alert('Sharing Unavailable', 'Sharing is not available on this device. The template has been saved to the app cache.');
      return;
    }

    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: `Save ${fileName}`,
      UTI: 'public.comma-separated-values-text',
    });

    console.log('[Template] Share sheet completed');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error: any) {
    console.error('[Template] Download error:', error);
    Alert.alert(
      'Download Failed',
      `Could not download template: ${error?.message || 'Unknown error'}`
    );
  }
}

export async function downloadFieldsTemplate(): Promise<void> {
  return downloadCsvTemplate(FIELDS_TEMPLATE, 'fields_template.csv');
}

export async function downloadInventoryTemplate(): Promise<void> {
  return downloadCsvTemplate(INVENTORY_TEMPLATE, 'inventory_template.csv');
}
