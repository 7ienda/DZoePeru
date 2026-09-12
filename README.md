# DZesta Pro — De HTML a APK/AAB para Play Store (100% gratis)

Este proyecto convierte tu `DZesta_Pro.html` en una app Android real usando
**Capacitor**, y la compila automáticamente en la nube con **GitHub Actions**
(no necesitas instalar Android Studio ni tener una PC potente).

---

## 📁 Qué contiene esta carpeta

```
DZesta-Pro-App/
├── www/index.html          ← tu app (copia de DZesta_Pro.html)
├── package.json             ← dependencias de Capacitor
├── capacitor.config.json    ← configuración de la app (nombre, id, etc.)
├── scripts/patch_signing.py ← agrega la firma digital automáticamente
├── .github/workflows/build.yml ← el robot que compila el APK/AAB
└── .gitignore
```

---

## 🚀 Paso 1: Crear el repositorio en GitHub

1. Entra a https://github.com y crea un repositorio nuevo (puede ser privado).
2. Sube TODO el contenido de esta carpeta a la raíz del repo. Puedes hacerlo:
   - Arrastrando los archivos desde la web de GitHub ("Add file → Upload files"), o
   - Por terminal:
     ```bash
     cd DZesta-Pro-App
     git init
     git add .
     git commit -m "Primera versión de DZesta Pro"
     git branch -M main
     git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
     git push -u origin main
     ```

> ⚠️ Todavía **no** lo subas a Actions — primero necesitas crear tu firma (keystore), si no el build fallará.

---

## 🔑 Paso 2: Crear tu keystore (firma digital de la app)

Google exige que toda app se firme con una clave privada única. Sin esto, nunca
podrás actualizar tu app en el futuro, así que **guarda este archivo y sus
contraseñas para siempre** (en un lugar seguro, no en el repo).

En tu PC necesitas tener Java instalado (trae el comando `keytool`). Corre:

```bash
keytool -genkey -v -keystore release.keystore -alias dzesta -keyalg RSA -keysize 2048 -validity 10000
```

Te va a pedir:
- Una contraseña para el keystore (guárdala)
- Una contraseña para la clave (puede ser la misma)
- Tu nombre, organización, país, etc. (puedes poner datos genéricos)

Esto genera un archivo `release.keystore`. **No lo subas a GitHub.**

### Convertirlo a Base64 (para guardarlo como secreto)

- En Mac/Linux:
  ```bash
  base64 -i release.keystore | tr -d '\n' > keystore_base64.txt
  ```
- En Windows (PowerShell):
  ```powershell
  [Convert]::ToBase64String([IO.File]::ReadAllBytes("release.keystore")) | Out-File keystore_base64.txt
  ```

---

## 🔒 Paso 3: Agregar los Secrets en GitHub

En tu repo: **Settings → Secrets and variables → Actions → New repository secret**

Crea estos 4 secrets:

| Nombre | Valor |
|---|---|
| `KEYSTORE_BASE64` | El contenido completo de `keystore_base64.txt` |
| `KEYSTORE_PASSWORD` | La contraseña del keystore que pusiste arriba |
| `KEY_ALIAS` | `dzesta` (o el alias que hayas usado) |
| `KEY_PASSWORD` | La contraseña de la clave |

---

## ⚙️ Paso 4: Correr el build

1. Ve a la pestaña **Actions** de tu repo.
2. Selecciona el workflow **"Build Android APK & AAB"**.
3. Click en **"Run workflow"** (botón a la derecha) → Run workflow.
4. Espera unos minutos (~5-8 min). Cuando termine en verde ✅, entra al run
   y baja hasta **Artifacts**: ahí vas a ver `dzesta-pro-apk` y `dzesta-pro-aab`.
5. Descarga el **AAB** — ese es el archivo que subes a Play Store (Google ya
   no acepta APK como formato principal, solo AAB).

El APK te sirve para instalar la app directamente en tu celular y probarla
antes de publicar.

---

## 🏪 Paso 5: Subir a Google Play Store

1. Crea tu cuenta de desarrollador en https://play.google.com/console
   (pago único de **$25 USD**, obligatorio y cobrado por Google — no hay forma
   gratuita de evitarlo, es la única parte paga de todo el proceso).
2. **Crear app** → completa nombre, idioma, tipo (app o juego), gratis/paga.
3. Ve a **Producción → Crear nueva versión** (o primero usa **Testing interno**
   para probar antes de publicar de verdad, muy recomendable).
4. Sube el archivo `.aab` que descargaste.
5. Completa la ficha de la tienda: descripción, capturas de pantalla, ícono
   (512x512px), imagen destacada, política de privacidad (obligatoria, puedes
   generar una gratis en sitios como https://app-privacy-policy-generator.firebaseapp.com/),
   clasificación de contenido, categoría.
6. Envía a revisión. Google tarda entre unas horas y unos días en aprobar.

---

## 🎨 Nota: ícono y splash screen

Ahora mismo la app usa el ícono por defecto de Capacitor. Para poner el tuyo:

1. Prepara una imagen `icon.png` de 1024x1024px.
2. Instala la herramienta de recursos:
   ```bash
   npm install @capacitor/assets --save-dev
   npx capacitor-assets generate --iconBackgroundColor '#fdf2f8' --iconBackgroundColorDark '#111827'
   ```
   (colócala en la raíz como `resources/icon.png` y `resources/splash.png` antes de correr el comando — revisa la doc de `@capacitor/assets` si quieres personalizar más).
3. Vuelve a correr `npx cap sync android` y luego el workflow.

---

## ☁️ ¿Y Supabase?

Sí, es totalmente compatible. Como tu app hoy guarda todo en `localStorage`
(solo en el dispositivo), Supabase te serviría para:

- Login de usuarios (email o Google)
- Sincronizar tu lista de compras/presupuesto entre dispositivos
- Backup en la nube (tier gratis: hasta 500MB de base de datos y 50,000
  usuarios activos al mes, más que suficiente para empezar)

Para integrarlo:

1. Crea un proyecto gratis en https://supabase.com
2. En tu `www/index.html`, agrega antes de tu `<script>` actual:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   ```
3. Inicializa el cliente con tu URL y anon key (las encuentras en
   Supabase → Settings → API):
   ```js
   const supabase = window.supabase.createClient('TU_URL', 'TU_ANON_KEY');
   ```
4. Reemplaza gradualmente tus llamadas a `localStorage.setItem/getItem` por
   llamadas a `supabase.from('tabla').insert(...)` / `.select(...)`.

Esto lo puedes hacer después de tu primera publicación — no es necesario para
subir la primera versión de la app.

---

## 🔁 Resumen del flujo completo

```
Editas www/index.html  →  git push  →  GitHub Actions compila y firma
   →  descargas el .aab  →  lo subes a Play Console  →  publicado 🎉
```

Cada vez que quieras actualizar la app, solo edita `www/index.html`, sube el
cambio con `git push`, vuelve a correr el workflow y sube el nuevo `.aab` a
Play Console como una nueva versión (recuerda subir el `versionCode` en
`android/app/build.gradle` en cada actualización, o Google la rechazará).
