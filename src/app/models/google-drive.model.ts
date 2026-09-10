/**
 * BleepSync - Google Drive & Google Sheets API Domain Models
 */

export interface GoogleDriveFile {
  id: string;
  name: string;
  webViewLink?: string;
  trashed?: boolean;
}

export interface GoogleDriveFileListResponse {
  files?: GoogleDriveFile[];
}

export interface GoogleSheetsCreateResponse {
  spreadsheetId: string;
  spreadsheetUrl?: string;
}

export interface GoogleSheetsValueRange {
  range?: string;
  majorDimension?: 'ROWS' | 'COLUMNS';
  values?: (string | number | boolean | null)[][];
}

