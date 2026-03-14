import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
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
 * Download or share a template file. Web: blob + <a download>. Native: write to cache via File+Paths (same API as export), then share sheet.
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
    // Use same File + Paths API as Fields/Inventory export (expo-file-system v19). Use document so share sheet sees a persistent file (matches export).
    const file = new File(Paths.document, fileName);
    logDebug('template', `Writing file via File(Paths.document); uri=${file.uri}`);
    file.create({ overwrite: true });
    file.write(content);

    const canShare = await Sharing.isAvailableAsync();
    logDebug('template', `Sharing.isAvailableAsync -> ${canShare}`);

    if (canShare) {
      // Workaround: brief delay before shareAsync so iOS can present the share sheet (avoids hang / no-op)
      await new Promise((r) => setTimeout(r, 450));
      logDebug('template', `Calling shareAsync(uri=${file.uri}, mimeType=${mimeType}, UTI=${uti})`);
      await Sharing.shareAsync(file.uri, {
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
    try {
      logDebug('template', 'Attempting Share.share fallback after error');
      await Share.share({ message: content, title: shareTitle });
      logDebug('template', 'Share.share() fallback invoked');
    } catch (fallbackError) {
      logDebug('template', `Share.share fallback also failed: ${(fallbackError as Error).message}`);
      throw error;
    }
  }
}
