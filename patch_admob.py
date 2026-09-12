#!/usr/bin/env python3
"""
Inserta el App ID de AdMob en android/app/src/main/AndroidManifest.xml.
Google exige este meta-data en el manifest para poder mostrar anuncios.
Seguro de correr varias veces: si ya está parcheado, no hace nada.
"""
import os
import sys

MANIFEST = "android/app/src/main/AndroidManifest.xml"
MARKER = "<!-- DZESTA_ADMOB -->"

# TODO: si alguna vez cambias de cuenta de AdMob, reemplaza este App ID
ADMOB_APP_ID = "ca-app-pub-8050203537758537~6524140734"

ADMOB_BLOCK = f"""        {MARKER}
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="{ADMOB_APP_ID}" />
"""


def main():
    if not os.path.exists(MANIFEST):
        print(f"ERROR: no se encontró {MANIFEST}. ¿Ya corriste 'npx cap add android'?")
        sys.exit(1)

    with open(MANIFEST, "r") as f:
        content = f.read()

    if MARKER in content:
        print("AndroidManifest.xml ya tiene el App ID de AdMob. Nada que hacer.")
        return

    marker_tag = "<application"
    idx = content.find(marker_tag)
    if idx == -1:
        print("ERROR: no se encontró la etiqueta <application> en el manifest.")
        sys.exit(1)

    # Insertamos justo después de que cierra la etiqueta de apertura <application ...>
    close_idx = content.find(">", idx)
    if close_idx == -1:
        print("ERROR: no se pudo parsear la etiqueta <application> en el manifest.")
        sys.exit(1)

    insert_at = close_idx + 1
    content = content[:insert_at] + "\n" + ADMOB_BLOCK + content[insert_at:]

    with open(MANIFEST, "w") as f:
        f.write(content)

    print(f"AndroidManifest.xml parcheado con el App ID de AdMob ({ADMOB_APP_ID}).")


if __name__ == "__main__":
    main()
