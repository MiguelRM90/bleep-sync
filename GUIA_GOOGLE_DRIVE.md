# 🏥 Guía Fácil: Cómo conectar BleepSync con tu Google Drive

¡Hola! Esta guía está pensada para que puedas conectar **BleepSync** con tu propia cuenta de **Google Drive** en 5 minutos, paso a paso y sin tecnicismos.

> 🔒 **¿Es seguro y privado?**
> **Sí, al 100%.** Todo se guarda en un archivo de Excel (Google Sheets) dentro de tu propia cuenta personal de Google Drive. Nadie más puede ver tus guardias ni tus notas clínicas; solo tú tienes el control de tu archivo.

---

## 📋 ¿Qué necesitas antes de empezar?
1. Tu ordenador (es más cómodo hacerlo en el ordenador por primera vez).
2. Tener tu sesión de Google / Gmail abierta en el navegador.

---

## 🚀 Paso 1: Crear tu hoja de guardias en Google Drive

1. Abre una pestaña nueva en tu navegador y entra en: 👉 **[sheets.new](https://sheets.new)** *(esto creará una hoja de cálculo nueva automáticamente)*.
2. Arriba a la izquierda, donde dice *«Hoja de cálculo sin título»*, cámbiale el nombre y escribe:  
   **`Guardias BleepSync`**
3. ¡Listo! Ya tienes el sitio donde se guardarán tus guardias.

---

## ⚙️ Paso 2: Abrir el editor de conexiones

1. En la barra de menús de tu hoja (arriba), haz clic en **Extensiones**.
2. En el menú que se despliega, haz clic en **Apps Script**.
3. Se abrirá una pantalla nueva con fondo blanco o gris y unas pocas líneas de texto.

---

## 📝 Paso 3: Pegar el código que conecta con la app

1. En esa pantalla verás algo como `function myFunction() { ... }`.
2. **Borra todo** lo que haya escrito en ese cuadro para dejarlo en blanco.
3. Copia todo el contenido del archivo [`gas/Code.gs`](gas/Code.gs) de este repositorio y **pégalo** en ese cuadro en blanco.
4. *(Opcional pero recomendado para máxima seguridad)*: En la línea 15 verás:  
   `const SECRET_API_KEY = '';`  
   Si quieres ponerle una contraseña secreta, escribe una palabra tuya entre las comillas (ejemplo: `const SECRET_API_KEY = 'Guardias2026';`).
5. Haz clic en el icono del **Disquete (Guardar)** 💾 que hay arriba en la barra de herramientas.

---

## 🌐 Paso 4: Activar la conexión (Implementar)

1. Arriba a la derecha verás un botón azul grande que dice **Implementar** (o *Deploy*). Haz clic en él.
2. Selecciona **Nueva implementación** (*New deployment*).
3. En la ventana que se abre, haz clic en la **rueda de ajustes ⚙️** (al lado de *"Seleccionar tipo"*) y elige **Aplicación web** (*Web app*).
4. Rellena solo estas 2 cosas:
   - **Ejecutar como**: Déjalo en tu correo (*Yo / Me*).
   - **Quién tiene acceso**: Elige **Cualquiera** (*Anyone*).  
     *(No te preocupes: esto solo significa que la app de tu móvil podrá comunicarse con la hoja sin pedirte iniciar sesión cada vez; la hoja sigue siendo 100% privada en tu Drive).*
5. Haz clic en el botón azul **Implementar**.
6. **Autorización de Google**: Google te pedirá permiso para que el script pueda escribir en tu hoja:
   - Elige tu cuenta de Google.
   - Si te sale un aviso de *"Google no ha verificado esta aplicación"*, no te asustes (es normal porque la acabas de crear tú misma): haz clic en el texto pequeño abajo que dice **Avanzado** (o *Configuración avanzada*) y luego abajo en **Ir a BleepSync (no seguro)**.
   - Haz clic en **Permitir**.
7. Te aparecerá una ventana con un enlace largo que dice **URL de la aplicación web** (termina en `/exec`).
8. Haz clic en **Copiar**.

---

## 📱 Paso 5: Pegar el enlace en BleepSync

1. Abre tu aplicación **BleepSync** (en tu móvil o navegador).
2. Toca el icono de la **Rueda de Ajustes (⚙️)** arriba a la derecha.
3. En la casilla **URL del Web App (Google Apps Script)**, pega el enlace que acabas de copiar.
4. Si en el Paso 3 pusiste una contraseña secreta, escríbela en la casilla **Clave de Seguridad**.
5. Pulsa el botón verde **Guardar Ajustes**.
6. Para comprobar que todo funciona:
   - Pulsa el botón azul **Descargar de Google Sheet**.
   - Si todo está bien, verás un mensaje verde de éxito.

---

## 🎉 ¡Enhorabuena, ya está todo listo!

- A partir de ahora, cada vez que registres una guardia se guardará en tu móvil al instante y se enviará a tu Google Drive.
- Si estás en el quirófano o en el sótano de urgencias sin cobertura de móvil o wifi, **BleepSync seguirá funcionando sin problemas**. En cuanto vuelvas a tener internet, se sincronizará sola.
