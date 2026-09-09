/**
 * BleepSync - Google Apps Script (GAS) Web App Backend
 * 
 * Target: Google Sheets backend for surgical on-call duty logging.
 * Exposes doGet(e) and doPost(e) with CORS and text/plain parsing.
 */

const SHEET_NAME = 'Guardias';
const HEADERS = ['ID', 'Date', 'Colleague', 'Role', 'Notes', 'Created_At', 'Synced_At'];

/**
 * Clave de seguridad (API Key / Token) para proteger tus guardias y notas.
 * Puedes configurarla aquí directamente (ej: 'MiClaveSegura2026') o en
 * Extensiones > Apps Script > Configuración del proyecto > Propiedades de la secuencia de comandos con la clave 'API_KEY'.
 * Si se define, ninguna petición sin esta clave podrá leer ni escribir datos.
 */
const SECRET_API_KEY = ''; 

function getExpectedApiKey() {
  try {
    const propKey = PropertiesService.getScriptProperties().getProperty('API_KEY');
    if (propKey && propKey.trim()) return propKey.trim();
  } catch (e) {
    // Si no hay acceso a ScriptProperties, usar la constante
  }
  return SECRET_API_KEY.trim();
}

function isAuthorized(providedKey) {
  const expected = getExpectedApiKey();
  if (!expected) return true; // Si no se ha configurado ninguna clave, permite acceso
  return providedKey && String(providedKey).trim() === expected;
}

/**
 * Helper to get or create the Guardias sheet with formatted headers
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Initialize headers
    sheet.appendRow(HEADERS);
    
    // Style header row: Dark Slate background with white bold text
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground('#0f172a');
    headerRange.setFontColor('#f8fafc');
    headerRange.setFontWeight('bold');
    headerRange.setFontFamily('Inter');
    sheet.setFrozenRows(1);

    // Apply data validation to Role column (Column 4: D)
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Planta', 'Urgencias', 'Ambos'], true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange('D2:D1000').setDataValidation(rule);

    // Auto-fit columns
    for (let i = 1; i <= HEADERS.length; i++) {
      sheet.autoResizeColumn(i);
    }
  }

  return sheet;
}

/**
 * Handle GET requests: Fetch all shifts from the sheet
 */
function doGet(e) {
  try {
    const providedKey = (e && e.parameter && (e.parameter.apiKey || e.parameter.key)) || '';
    if (!isAuthorized(providedKey)) {
      return createJsonResponse({
        status: 'error',
        errorType: 'unauthorized',
        message: 'Acceso no autorizado: Clave de seguridad (API Key) no válida o no proporcionada.'
      });
    }

    const sheet = getOrCreateSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      // Empty or header only
      return createJsonResponse({
        status: 'success',
        data: [],
        count: 0
      });
    }

    // Read all rows starting from row 2
    const dataRange = sheet.getRange(2, 1, lastRow - 1, HEADERS.length);
    const values = dataRange.getValues();

    const shifts = values.map(row => {
      let rawDate = row[1];
      let formattedDate = '';
      if (rawDate instanceof Date) {
        // Format as YYYY-MM-DD
        const y = rawDate.getFullYear();
        const m = String(rawDate.getMonth() + 1).padStart(2, '0');
        const d = String(rawDate.getDate()).padStart(2, '0');
        formattedDate = `${y}-${m}-${d}`;
      } else {
        formattedDate = String(rawDate || '');
      }

      return {
        id: String(row[0] || ''),
        date: formattedDate,
        colleague: String(row[2] || ''),
        role: String(row[3] || ''),
        notes: String(row[4] || ''),
        createdAt: row[5] instanceof Date ? row[5].toISOString() : String(row[5] || ''),
        remoteSyncedAt: row[6] instanceof Date ? row[6].toISOString() : String(row[6] || '')
      };
    }).filter(s => s.id && s.date);

    return createJsonResponse({
      status: 'success',
      data: shifts,
      count: shifts.length
    });

  } catch (error) {
    return createJsonResponse({
      status: 'error',
      message: error.toString()
    });
  }
}

/**
 * Handle POST requests: Append or batch sync shifts
 * Payloads sent as text/plain (JSON.stringify) to bypass CORS preflight.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        status: 'error',
        message: 'Empty POST payload received.'
      });
    }

    const payloadRaw = e.postData.contents;
    const body = JSON.parse(payloadRaw);

    const providedKey = body.apiKey || (e && e.parameter && (e.parameter.apiKey || e.parameter.key)) || '';
    if (!isAuthorized(providedKey)) {
      return createJsonResponse({
        status: 'error',
        errorType: 'unauthorized',
        message: 'Acceso no autorizado: Clave de seguridad (API Key) no válida o no proporcionada.'
      });
    }

    const action = body.action || 'create_shift';
    const sheet = getOrCreateSheet();

    const nowIso = new Date().toISOString();

    if (action === 'create_shift') {
      const shift = body.payload;
      if (!shift || !shift.date || !shift.colleague || !shift.role) {
        return createJsonResponse({
          status: 'error',
          message: 'Invalid shift payload. Missing required fields.'
        });
      }

      upsertShiftRow(sheet, shift, nowIso);

      return createJsonResponse({
        status: 'success',
        syncedCount: 1,
        ids: [shift.id]
      });

    } else if (action === 'batch_sync') {
      const shifts = body.payload;
      if (!Array.isArray(shifts) || shifts.length === 0) {
        return createJsonResponse({
          status: 'success',
          syncedCount: 0,
          ids: []
        });
      }

      const syncedIds = [];
      for (let i = 0; i < shifts.length; i++) {
        const shift = shifts[i];
        if (shift && shift.date && shift.colleague && shift.role) {
          upsertShiftRow(sheet, shift, nowIso);
          syncedIds.push(shift.id);
        }
      }

      return createJsonResponse({
        status: 'success',
        syncedCount: syncedIds.length,
        ids: syncedIds
      });

    } else {
      return createJsonResponse({
        status: 'error',
        message: 'Unknown action: ' + action
      });
    }

  } catch (error) {
    return createJsonResponse({
      status: 'error',
      message: error.toString()
    });
  }
}

/**
 * Upsert a shift row by ID to prevent duplicates
 */
function upsertShiftRow(sheet, shift, syncedAt) {
  const lastRow = sheet.getLastRow();
  let existingRowIndex = -1;

  if (lastRow > 1) {
    const idColumnValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let r = 0; r < idColumnValues.length; r++) {
      if (String(idColumnValues[r][0]) === String(shift.id)) {
        existingRowIndex = r + 2; // Offset for 1-based index and header row
        break;
      }
    }
  }

  const rowData = [
    shift.id || ('shift_' + Date.now()),
    shift.date,
    shift.colleague,
    shift.role,
    shift.notes || '',
    shift.createdAt || syncedAt,
    syncedAt
  ];

  if (existingRowIndex > 0) {
    // Update existing row
    sheet.getRange(existingRowIndex, 1, 1, HEADERS.length).setValues([rowData]);
  } else {
    // Append new row
    sheet.appendRow(rowData);
  }
}

/**
 * Utility to format and return JSON responses with proper headers
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Optional manual setup runner to initialize sheet from script editor
 */
function setupSheet() {
  const sheet = getOrCreateSheet();
  SpreadsheetApp.getActiveSpreadsheet().toast('Sheet initialized for BleepSync', 'BleepSync Setup');
}

