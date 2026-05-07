import { Alert } from 'react-native';
import { downloadTemplate } from '@/utils/downloadTemplate';

// Columns must match upload-fields.tsx and upload-inventory.tsx header matching.
export const FIELDS_TEMPLATE = `Name,Acreage,Crop Type,Latitude,Longitude,Color,Notes
North Field,120,Corn,41.8781,-87.6298,#4CAF50,Sample field entry
South Pasture,80,Soybeans,41.8750,-87.6320,#2196F3,Another sample field`;

export const INVENTORY_TEMPLATE = `Name,Producer,Variety,Lot Number,Quantity,Unit,Seeds Per Unit,Germination %,Purchase Date,Expiration Date,Traits,Treatments,Notes
Corn Hybrid A,Pioneer,P1234,LOT-2024-001,50,bags,80000,95%,2024-01-15,2025-12-31,"Drought Tolerant,High Yield",Treated,Sample entry
Soybean Premium,Dekalb,DK4567,LOT-2024-002,30,bags,140000,92%,2024-02-01,2025-06-30,Non-GMO,,Another sample`;

export async function downloadFieldsTemplate(): Promise<void> {
  try {
    await downloadTemplate({
      content: FIELDS_TEMPLATE,
      fileName: 'fields_template.csv',
      mimeType: 'text/csv',
      uti: 'public.comma-separated-values-text',
      dialogTitle: 'Save Fields Template',
      shareTitle: 'Fields Import Template',
    });
    Alert.alert('Success', 'Fields template downloaded successfully.');
  } catch (error: unknown) {
    console.error('[Template] downloadFieldsTemplate error:', error);
    Alert.alert(
      'Error',
      `Failed to download template. ${error instanceof Error ? error.message : 'Please try again.'}`
    );
    throw error;
  }
}

export async function downloadInventoryTemplate(): Promise<void> {
  try {
    await downloadTemplate({
      content: INVENTORY_TEMPLATE,
      fileName: 'inventory_template.csv',
      mimeType: 'text/csv',
      uti: 'public.comma-separated-values-text',
      dialogTitle: 'Save Inventory Template',
      shareTitle: 'Inventory Import Template',
    });
    Alert.alert('Success', 'Inventory template downloaded successfully.');
  } catch (error: unknown) {
    console.error('[Template] downloadInventoryTemplate error:', error);
    Alert.alert(
      'Error',
      `Failed to download template. ${error instanceof Error ? error.message : 'Please try again.'}`
    );
    throw error;
  }
}
