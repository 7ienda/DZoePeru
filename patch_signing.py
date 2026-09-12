#!/usr/bin/env python3
"""
Inserta la configuración de firma (signingConfigs) en android/app/build.gradle
usando variables de entorno (que vienen de los Secrets de GitHub Actions).
Es seguro ejecutarlo varias veces: si ya está parcheado, no hace nada.
"""
import os
import re
import sys

BUILD_GRADLE = "android/app/build.gradle"
MARKER = "// DZESTA_SIGNING_CONFIG"

SIGNING_BLOCK = f"""
    {MARKER}
    signingConfigs {{
        release {{
            storeFile file(System.getenv("KEYSTORE_PATH") ?: "release.keystore")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }}
    }}
"""

def main():
    if not os.path.exists(BUILD_GRADLE):
        print(f"ERROR: no se encontró {BUILD_GRADLE}. ¿Ya corriste 'npx cap add android'?")
        sys.exit(1)

    with open(BUILD_GRADLE, "r") as f:
        content = f.read()

    if MARKER in content:
        print("El build.gradle ya está parcheado con la config de firma. Nada que hacer.")
        return

    # 1) Insertar signingConfigs justo después de la línea "android {"
    content = re.sub(
        r"(android\s*\{)",
        r"\1\n" + SIGNING_BLOCK,
        content,
        count=1,
    )

    # 2) Hacer que buildTypes.release use signingConfigs.release
    #    OJO: ya existe un bloque "release {" dentro de signingConfigs (el que
    #    acabamos de insertar arriba). Por eso buscamos SOLO a partir de la
    #    palabra "buildTypes", para no tocar por error ese primer bloque.
    buildtypes_idx = content.index("buildTypes")
    before = content[:buildtypes_idx]
    after = content[buildtypes_idx:]

    if "signingConfig signingConfigs.release" not in after:
        after = re.sub(
            r"release\s*\{",
            "release {\n            signingConfig signingConfigs.release",
            after,
            count=1,
        )

    content = before + after

    with open(BUILD_GRADLE, "w") as f:
        f.write(content)

    print("build.gradle parcheado correctamente con la configuración de firma.")


if __name__ == "__main__":
    main()
