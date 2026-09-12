#!/usr/bin/env python3
"""
Inserta un intent-filter en AndroidManifest.xml para que la app pueda recibir
el "regreso" del login de Google (esquema personalizado dzestapro://).
Seguro de correr varias veces: si ya está parcheado, no hace nada.
"""
import os
import sys

MANIFEST = "android/app/src/main/AndroidManifest.xml"
MARKER = "<!-- DZESTA_DEEPLINK -->"
SCHEME = "dzestapro"

DEEPLINK_BLOCK = f"""        {MARKER}
        <intent-filter>
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="{SCHEME}" />
        </intent-filter>
"""


def main():
    if not os.path.exists(MANIFEST):
        print(f"ERROR: no se encontró {MANIFEST}. ¿Ya corriste 'npx cap add android'?")
        sys.exit(1)

    with open(MANIFEST, "r") as f:
        content = f.read()

    if MARKER in content:
        print("AndroidManifest.xml ya tiene el deep link configurado. Nada que hacer.")
        return

    marker_tag = "</intent-filter>"
    idx = content.find(marker_tag)
    if idx == -1:
        print("ERROR: no se encontró </intent-filter> en el manifest, revisa el archivo manualmente.")
        sys.exit(1)

    insert_at = idx + len(marker_tag)
    content = content[:insert_at] + "\n" + DEEPLINK_BLOCK + content[insert_at:]

    with open(MANIFEST, "w") as f:
        f.write(content)

    print(f"AndroidManifest.xml parcheado con el esquema '{SCHEME}://'.")


if __name__ == "__main__":
    main()
