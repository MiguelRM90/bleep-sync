/**
 * BleepSync - Google OAuth & Sheets Constants
 */

export const GOOGLE_CLIENT_ID = '816246423317-k2j1qpnd9e7fhgrkl5m295kv7ga8lve9.apps.googleusercontent.com';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid',
].join(' ');

export const SPREADSHEET_TITLE = 'Guardias BleepSync';
export const SHEET_NAME = 'Guardias';

export const SHEET_HEADERS = [
  'ID',
  'Fecha',
  'Adjunto',
  'Rol',
  'Notas',
  'Creado',
  'Sincronizado',
];

