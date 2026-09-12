#!/usr/bin/env python3
"""
Sube automáticamente el versionCode en android/app/build.gradle en cada build,
usando el número de ejecución de GitHub Actions (GITHUB_RUN_NUMBER), que
siempre sube: 1, 2, 3, 4... Así nunca se repite un versionCode al subir a
Play Console.

Si corres esto localmente (sin GITHUB_RUN_NUMBER), usa el timestamp actual
como versionCode para evitar choques.

Seguro de correr varias veces (aunque normalmente solo se corre una vez por build).
"""
import os
import re
import sys
import time

APP_BUILD_GRADLE = "android/app/build.gradle"


def get_new_version_code():
    run_number = os.environ.get("GITHUB_RUN_NUMBER")
    if run_number:
        return int(run_number)
    # Fallback local: usa minutos desde epoch, siempre creciente
    return int(time.time() // 60)


def main():
    if not os.path.exists(APP_BUILD_GRADLE):
        print(f"ERROR: no se encontró {APP_BUILD_GRADLE}. ¿Ya corriste 'npx cap add android'?")
        sys.exit(1)

    new_code = get_new_version_code()

    with open(APP_BUILD_GRADLE, "r") as f:
        content = f.read()

    pattern = re.compile(r"(versionCode\s+)\d+")
    if not pattern.search(content):
        print("ERROR: no se encontró 'versionCode' en build.gradle.")
        sys.exit(1)

    content = pattern.sub(rf"\g<1>{new_code}", content, count=1)

    # También actualizamos versionName para que sea fácil de identificar (ej. 1.0.42)
    name_pattern = re.compile(r'(versionName\s+")([^"]*)(")')
    match = name_pattern.search(content)
    if match:
        base_name = match.group(2).split(".")[0:2]  # conserva major.minor, ej "1.0"
        base_name = ".".join(base_name) if len(base_name) >= 2 else match.group(2)
        new_name = f"{base_name}.{new_code}"
        content = name_pattern.sub(rf'\g<1>{new_name}\g<3>', content, count=1)
        print(f"versionName actualizado a {new_name}.")

    with open(APP_BUILD_GRADLE, "w") as f:
        f.write(content)

    print(f"versionCode actualizado a {new_code}.")


if __name__ == "__main__":
    main()
