import { Platform, Alert } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';

export async function downloadTemplate(
  templateContent: string,
  fileName: string,
  mimeType: string = 'text/csv'
): Promise<void> {
  try {
    if (Platform.OS === 'web') {
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

    console.log('Creating template file:', fileName);
    const file = new File(Paths.cache, fileName);
    file.create({ overwrite: true });
    file.write(templateContent);
    const fileUri = file.uri;
    console.log('Template file created at:', fileUri);

    if (!file.exists) {
      throw new Error('File was not created successfully');
    }

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

    try {
      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: `Save ${fileName}`,
        UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (shareError: any) {
      const errorMessage = shareError?.message || 'Unknown error';
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
