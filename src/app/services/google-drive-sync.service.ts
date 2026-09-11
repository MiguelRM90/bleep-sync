import { Injectable, signal } from '@angular/core';
import { Shift, DutyRole } from '../models/shift.model';
import { normalizeDateToIso } from '../pipes/date-format.pipe';
import { SPREADSHEET_TITLE, SHEET_NAME, SHEET_HEADERS } from '../constants/google-auth.constant';
import {
  GoogleDriveFileListResponse,
  GoogleSheetsCreateResponse,
  GoogleSheetsValueRange,
} from '../models/google-drive.model';

const STORAGE_KEY_SHEET_ID = 'bleepsync_google_sheet_id_v1';

@Injectable({
  providedIn: 'root',
})
export class GoogleDriveSyncService {
  readonly spreadsheetId = signal<string | null>(null);
  readonly sheetUrl = signal<string | null>(null);

  constructor() {
    this.restoreCachedSheetId();
  }

  private restoreCachedSheetId(): void {
    if (typeof localStorage === 'undefined') return;
    const cached = localStorage.getItem(STORAGE_KEY_SHEET_ID);
    if (cached) {
      this.spreadsheetId.set(cached);
      this.sheetUrl.set(`https://docs.google.com/spreadsheets/d/${cached}`);
    }
  }

  /**
   * Find existing 'Guardias BleepSync' spreadsheet in user's Drive, or create it if missing
   */
  async findOrCreateSpreadsheet(accessToken: string): Promise<string> {
    const cachedId = this.spreadsheetId();
    if (cachedId) {
      const exists = await this.verifySpreadsheetExists(accessToken, cachedId);
      if (exists) return cachedId;
    }

    // 1. Search in Drive
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
      SPREADSHEET_TITLE
    )}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name,webViewLink)`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (searchRes.ok) {
      const searchData = (await searchRes.json()) as GoogleDriveFileListResponse;
      if (searchData.files && searchData.files.length > 0) {
        const file = searchData.files[0];
        this.saveSpreadsheetId(file.id, file.webViewLink);
        return file.id;
      }
    }

    // 2. Not found: create a new spreadsheet with initial headers
    const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    const createBody = {
      properties: {
        title: SPREADSHEET_TITLE,
      },
      sheets: [
        {
          properties: {
            title: SHEET_NAME,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: SHEET_HEADERS.map((header) => ({
                    userEnteredValue: { stringValue: header },
                  })),
                },
              ],
            },
          ],
        },
      ],
    };

    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBody),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Error al crear la hoja en Google Drive: ${createRes.status} ${err}`);
    }

    const createdData = (await createRes.json()) as GoogleSheetsCreateResponse;
    const newId = createdData.spreadsheetId;
    this.saveSpreadsheetId(newId, createdData.spreadsheetUrl);
    return newId;
  }

  private async verifySpreadsheetExists(accessToken: string, id: string): Promise<boolean> {
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,trashed`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { id?: string; trashed?: boolean };
      return !data.trashed;
    } catch {
      return false;
    }
  }

  private saveSpreadsheetId(id: string, url?: string): void {
    this.spreadsheetId.set(id);
    const fullUrl = url || `https://docs.google.com/spreadsheets/d/${id}`;
    this.sheetUrl.set(fullUrl);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SHEET_ID, id);
    }
  }

  /**
   * Fetch all shifts from the Google Sheet
   */
  async fetchRemoteShifts(accessToken: string, spreadsheetId: string): Promise<Shift[]> {
    const range = `${SHEET_NAME}!A2:G`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range
    )}?valueRenderOption=UNFORMATTED_VALUE`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Error al leer las guardias de Google Sheets: HTTP ${res.status}`);
    }

    const data = (await res.json()) as GoogleSheetsValueRange;
    const rows = data.values || [];

    return rows
      .filter((row): row is (string | number | boolean | null)[] => Boolean(row && row[0] && row[1]))
      .map((row) => ({
        id: String(row[0]),
        date: normalizeDateToIso(row[1]),
        colleague: String(row[2] || ''),
        role: (String(row[3]) as DutyRole) || 'Planta',
        notes: row[4] ? String(row[4]) : undefined,
        createdAt: row[5] ? String(row[5]) : new Date().toISOString(),
        syncStatus: 'synced' as const,
        remoteSyncedAt: row[6] ? String(row[6]) : new Date().toISOString(),
      }));
  }

  /**
   * Clear all data rows in the Google Sheet (A2:Z), preserving header row
   */
  async clearRemoteDataRows(accessToken: string, spreadsheetId: string): Promise<void> {
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      `${SHEET_NAME}!A2:Z`
    )}:clear`;

    const res = await fetch(clearUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Could not clear remote sheet rows: ${res.status} ${errText}`);
    }
  }

  /**
   * Upsert and synchronize shifts to Google Sheet (merges remote and local rows, removes deleted rows)
   */
  async upsertShifts(
    accessToken: string,
    spreadsheetId: string,
    shiftsToSync: Shift[],
    allLocalShifts: Shift[],
    deletedShiftIds: string[] = []
  ): Promise<void> {
    // 1. Fetch current remote shifts
    let existingShifts: Shift[] = [];
    try {
      existingShifts = await this.fetchRemoteShifts(accessToken, spreadsheetId);
    } catch (e: unknown) {
      console.warn('Could not read existing remote shifts before upsert, will proceed with local data:', e);
    }

    const deletedSet = new Set(deletedShiftIds);

    // 2. Build map of ID -> Shift (excluding any deleted ones)
    const map = new Map<string, Shift>();
    for (const shift of existingShifts) {
      if (!deletedSet.has(shift.id)) {
        map.set(shift.id, shift);
      }
    }
    for (const shift of allLocalShifts) {
      if (!deletedSet.has(shift.id)) {
        map.set(shift.id, shift);
      }
    }
    for (const shift of shiftsToSync) {
      if (!deletedSet.has(shift.id)) {
        map.set(shift.id, shift);
      }
    }

    // 3. Sort chronologically (date descending)
    const mergedList = Array.from(map.values()).sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    // 4. Always clear A2:G before rewriting so deleted rows disappear completely
    await this.clearRemoteDataRows(accessToken, spreadsheetId);

    if (mergedList.length === 0) {
      return;
    }

    // 5. Format rows for Google Sheets API
    const nowIso = new Date().toISOString();
    const rows = mergedList.map((s) => [
      s.id,
      normalizeDateToIso(s.date),
      s.colleague,
      s.role,
      s.notes || '',
      s.createdAt || nowIso,
      nowIso,
    ]);

    // 6. Update range A2:G in sheet
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      `${SHEET_NAME}!A2:G${rows.length + 1}`
    )}?valueInputOption=USER_ENTERED`;

    const res = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `${SHEET_NAME}!A2:G${rows.length + 1}`,
        majorDimension: 'ROWS',
        values: rows,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error al actualizar Google Sheets: HTTP ${res.status} ${errText}`);
    }
  }
}
