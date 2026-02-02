import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';

/**
 * Advanced template download system that works reliably on iOS
 * Uses expo-file-system with proper error handling and iOS-specific optimizations
 */
export async function downloadTemplate(
  templateContent: string,
  fileName: string,
  mimeType: string = 'text/csv'
): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      // Web platform - use blob download
      const blob = new Blob([templateContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Template downloaded successfully');
      return;
    }

    // Mobile platforms - use File API which is more reliable on iOS
    let fileUri: string;
    
    try {
      // Try using File API with Paths.cache (most reliable on iOS)
      const file = new File(Paths.cache, fileName);
      file.create({ overwrite: true });
      file.write(templateContent);
      fileUri = file.uri;
    } catch (fileError: any) {
      // Fallback: Try using FileSystem API directly
      const directory = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!directory) {
        throw new Error('No file system directory available. Please ensure the app has proper permissions.');
      }
      
      fileUri = `${directory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, templateContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    }

    // Verify file was created
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      throw new Error('File was not created successfully');
    }

    // Check if sharing is available
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert(
        'Template Saved',
        `Template saved to app cache.\n\nFile: ${fileName}\n\nYou can access it through the Files app.`,
        [{ text: 'OK' }]
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    // Share the file
    try {
      const result = await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: `Save ${fileName}`,
        UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : undefined,
      });

      // Handle sharing result
      if (result) {
        if (result.action === Sharing.SharingResultAction.shared) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (result.action === Sharing.SharingResultAction.dismissedActionSheet) {
          // User dismissed - don't show error
          return;
        }
      } else {
        // Result is null - on iOS this often means success
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (shareError: any) {
      const errorMessage = shareError?.message || 'Unknown error';
      // Only throw if it's a real error, not a cancellation
      if (!errorMessage.toLowerCase().includes('cancel') && 
          !errorMessage.toLowerCase().includes('dismiss')) {
        throw new Error(`Sharing failed: ${errorMessage}`);
      }
    }
  } catch (error: any) {
    console.error('Template download error:', error);
    const errorMessage = error?.message || 'Unknown error occurred';
    Alert.alert(
      'Download Failed',
      `Failed to download template:\n\n${errorMessage}`,
      [{ text: 'OK' }]
    );
    throw error;
  }
}
