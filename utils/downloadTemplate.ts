import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';
import { logDebug } from '@/utils/debugLog';

export type DownloadTemplateOptions = {
  /** Full content of the file (e.g. CSV string) */
  content: string;
  /** Filename for the download (e.g. 'my_template.csv') */
  fileName: string;
  /** MIME type (e.g. 'text/csv', 'text/plain') */
  mimeType: string;
  /** UTI for iOS share sheet (e.g. 'public.comma-separated-values-text') – optional */
  uti?: string;
  /** Title for the share dialog – optional */
  dialogTitle?: string;
  /** Fallback title if Share.share is used – optional */
  shareTitle?: string;
};

/**
 * Download or share a template file. Web: blob + <a download>. Native: write to cache, open share sheet (or Share.share fallback).
 */
export async function downloadTemplate(options: DownloadTemplateOptions): Promise<void> {
  const {
    content,
    fileName,
    mimeType,
    uti = 'public.plain-text',
    dialogTitle = 'Save Template',
    shareTitle = 'Template',
  } = options;

  logDebug('template', `downloadTemplate called (platform=${Platform.OS}, file=${fileName})`);

  if (Platform.OS === 'web') {
    logDebug('template', 'Using web blob download');
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  try {
    const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!baseDir) {
      logDebug('template', 'No cache/document directory available; falling back to Share.share');
      await Share.share({
        message: content,
        title: shareTitle,
      });
      logDebug('template', 'Share.share() fallback invoked');
      return;
    }
    const path = `${baseDir}${fileName}`;
    logDebug('template', `Writing file to ${path}`);
    await FileSystem.writeAsStringAsync(path, content, { encoding: FileSystem.EncodingType.UTF8 });

    const canShare = await Sharing.isAvailableAsync();
    logDebug('template', `Sharing.isAvailableAsync -> ${canShare}`);

    if (canShare) {
      await Sharing.shareAsync(path, {
        mimeType,
        dialogTitle,
        UTI: uti,
      });
      logDebug('template', 'shareAsync completed');
    } else {
      logDebug('template', 'Sharing not available, falling back to Share.share');
      await Share.share({
        message: content,
        title: shareTitle,
      });
      logDebug('template', 'Share.share() fallback invoked');
    }
  } catch (error) {
    logDebug('template', `Error in downloadTemplate: ${(error as Error).message}`);
    throw error;
  }
}
