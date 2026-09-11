# 🔒 Política de Privacidad / Privacy Policy — BleepSync

**Last updated / Última actualización:** 2026/09/11

---

## 🇬🇧 English Version

### 1. Overview & Privacy Commitment
**BleepSync** is an open-source Progressive Web App (PWA) created for healthcare and surgical teams to track, balance, and synchronize on-call shifts.

We operate under a strict **local-first and privacy-by-design** philosophy:
* BleepSync operates **without** any proprietary servers, middleman databases, or telemetry tracking your clinical schedules.
* Your schedule data lives strictly on your local device and inside your own personal **Google Drive** storage.

---

### 2. Information We Access
* **Duty Logs:** Dates, shift types (Ward, Emergency, Both), attending surgeon alias, hours, location, and clinical notes.
* **Google Account Profile:** Email address, display name, and avatar, solely to display your active connected session in the settings interface.

---

### 3. Google API Scopes & Permissions
BleepSync requests the absolute minimum necessary permissions to function:

1. **`https://www.googleapis.com/auth/drive.file`**:
   * **Purpose:** Create, read, and update the spreadsheet titled `Guardias BleepSync` in your private Google Drive via Google Drive API v3 and Google Sheets API v4.
   * **Guarantee:** This scope **strictly prevents** access to any other documents, photos, or files in your Google Drive. It is sandboxed solely to files created by or explicitly opened with BleepSync.
2. **`https://www.googleapis.com/auth/userinfo.email`**, **`.../userinfo.profile`**, & **`openid`**:
   * **Purpose:** Securely identify and display your connected Google identity within the app's settings screen.

---

### 4. Google API Services User Data Policy Compliance (Limited Use Disclosure)
**BleepSync's use and transfer to any other app of information received from Google APIs will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.**

Specifically:
* We do **not** sell, rent, or transfer your Google user data to any third parties.
* We do **not** use or transfer Google user data for serving advertisements, personalized advertising, or retargeting.
* We do **not** use Google user data to train machine learning or generalized artificial intelligence models.
* No human reads or accesses your schedule data.

---

### 5. Data Retention, Security, and User Rights
* **Encryption in Transit:** All traffic between BleepSync and Google APIs travels across secure HTTPS/TLS encrypted channels.
* **Revoking Access:** You can disconnect at any time from the BleepSync Settings modal, or permanently revoke permissions at any time via your Google Security Dashboard:  
  👉 [https://myaccount.google.com/permissions](https://myaccount.google.com/permissions)
* **Data Erasure:** You have full control over your data at all times. You can trigger complete data erasure directly inside the app ("Eliminar Todos los Datos" in Settings), which immediately wipes all local browser storage and clears all recorded duty rows in your Google Sheet. Additionally, manually deleting the `Guardias BleepSync` sheet from your Google Drive or clearing your browser storage permanently purges your data.

---

### 6. Contact & Open Source
For any questions regarding privacy or source code inspection:  
👉 **[https://github.com/MiguelRM90/bleep-sync](https://github.com/MiguelRM90/bleep-sync)**

---

<br/>

## 🇪🇸 Versión en Español

### 1. Introducción y Compromiso de Privacidad
**BleepSync** es una aplicación web progresiva (PWA) de código abierto diseñada para profesionales sanitarios (equipos quirúrgicos y médicos de guardia) con el fin de registrar, calcular recomendaciones equitativas y sincronizar turnos de guardia entre compañeros.

En BleepSync creemos firmemente en la **privacidad por diseño (Privacy by Design)** y la **soberanía total de tus datos**:
* BleepSync **NO** tiene ningún servidor central, base de datos externa ni intermediarios que recopilen o almacenen tus turnos, notas clínicas o información personal.
* Toda tu información reside exclusivamente en tu propio dispositivo (navegador) y en tu propia cuenta personal de **Google Drive**.

---

### 2. ¿Qué datos procesa BleepSync?
* **Turnos de guardia médica:** Fecha, tipo de guardia (Planta, Urgencias, Ambos), nombre o alias del compañero de guardia, horario, ubicación y notas clínicas asociadas al turno.
* **Datos de la cuenta de Google:** Si decides conectar tu Google Drive mediante el inicio de sesión de Google, BleepSync accede únicamente a tu dirección de correo electrónico y nombre/foto de perfil con el único fin de mostrarte en pantalla qué cuenta tienes conectada.

---

### 3. Uso de permisos de Google (Google API Scopes)
Cuando conectas BleepSync con Google, se solicitan exclusivamente los permisos mínimos necesarios:

1. **`https://www.googleapis.com/auth/drive.file`**:
   * **Propósito:** Permite a la app crear y actualizar una única hoja de cálculo llamada `Guardias BleepSync` en tu Google Drive mediante Google Drive API v3 y Google Sheets API v4.
   * **Garantía:** Este permiso **NO** da acceso a ver, leer ni modificar el resto de tus archivos personales en Google Drive. Solo permite interactuar con los archivos que la propia aplicación ha creado.
2. **`https://www.googleapis.com/auth/userinfo.email`**, **`.../userinfo.profile`** y **`openid`**:
   * **Propósito:** Identificar y autenticar visualmente la sesión activa en el panel de ajustes de la aplicación.

---

### 4. Cumplimiento de la Política de Datos de Usuario de Google (Limited Use)
El uso y la transferencia que BleepSync hace de la información recibida a través de las APIs de Google se apegan a la **[Política de Datos de Usuario de los Servicios de la API de Google](https://developers.google.com/terms/api-services-user-data-policy)**, incluidos los requisitos de **Uso Limitado (Limited Use)**:
* **No venta de datos:** BleepSync nunca venderá, alquilará ni comercializará datos de usuarios de Google a terceros.
* **No publicidad:** La información obtenida a través de las APIs de Google nunca se utilizará con fines publicitarios, retargeting ni para inferir perfiles comerciales.
* **No entrenamiento de IA:** Tus datos nunca se utilizarán para entrenar modelos generales de inteligencia artificial ni aprendizaje automático.
* **Acceso humano restringido:** Ningún ser humano ni desarrollador de BleepSync tiene acceso a tus hojas de cálculo ni a tus turnos de guardia.

---

### 5. Almacenamiento, Seguridad y Control del Usuario
* **Cifrado en tránsito:** Toda comunicación entre BleepSync y las APIs de Google se realiza mediante conexiones seguras cifradas con HTTPS/TLS.
* **Revocación en cualquier momento:** Puedes desconectar tu cuenta desde el modal de Ajustes de BleepSync en cualquier momento. También puedes revocar el acceso de forma inmediata y permanente a través del portal de seguridad de tu cuenta de Google en:  
  👉 [https://myaccount.google.com/permissions](https://myaccount.google.com/permissions)
* **Eliminación total de datos:** Tienes control total sobre tus datos en todo momento. Puedes ejecutar el borrado completo directamente desde la app mediante el botón «Eliminar Todos los Datos» en Ajustes, lo que vacía de inmediato el almacenamiento local de tu navegador y borra todas las filas registradas en tu hoja de Google Drive. También puedes eliminar manualmente la hoja `Guardias BleepSync` en Drive o borrar la memoria caché de tu navegador.

---

### 6. Contacto
Si tienes cualquier pregunta sobre esta política de privacidad o sobre el funcionamiento de BleepSync, puedes abrir una incidencia o contactar a través del repositorio oficial del proyecto:  
👉 **[https://github.com/MiguelRM90/bleep-sync](https://github.com/MiguelRM90/bleep-sync)**

