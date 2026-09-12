#!/usr/bin/env python3
"""
Sube el proyecto a API 35 (requisito actual de Google Play) y actualiza las
herramientas necesarias para poder compilar con esa versión:
  - android/variables.gradle          -> compileSdkVersion / targetSdkVersion
  - android/build.gradle              -> Android Gradle Plugin (AGP)
  - android/gradle/wrapper/gradle-wrapper.properties -> versión de Gradle

Capacitor 6 trae por defecto API 34 + AGP 8.2.1, que solo compila hasta
API 34. Se necesita AGP 8.6+ (usamos 8.7.2) y Gradle 8.9 como mínimo.
Seguro de correr varias veces.
"""
import os
import re
import sys

VARIABLES_GRADLE = "android/variables.gradle"
ROOT_BUILD_GRADLE = "android/build.gradle"
WRAPPER_PROPS = "android/gradle/wrapper/gradle-wrapper.properties"

TARGET_SDK = 35
AGP_VERSION = "8.7.2"
GRADLE_VERSION = "8.9"


def bump_sdk_versions():
    if not os.path.exists(VARIABLES_GRADLE):
        print(f"ERROR: no se encontró {VARIABLES_GRADLE}. ¿Ya corriste 'npx cap add android'?")
        sys.exit(1)

    with open(VARIABLES_GRADLE, "r") as f:
        content = f.read()

    original = content
    for key in ("compileSdkVersion", "targetSdkVersion"):
        pattern = re.compile(rf"({key}\s*=\s*)\d+")
        if pattern.search(content):
            content = pattern.sub(rf"\g<1>{TARGET_SDK}", content)
        else:
            print(f"AVISO: no se encontró '{key}' en variables.gradle, se omite.")

    if content != original:
        with open(VARIABLES_GRADLE, "w") as f:
            f.write(content)
        print(f"variables.gradle actualizado a API {TARGET_SDK}.")
    else:
        print("variables.gradle ya estaba en la versión correcta. Nada que hacer.")


def bump_agp():
    if not os.path.exists(ROOT_BUILD_GRADLE):
        print(f"AVISO: no se encontró {ROOT_BUILD_GRADLE}, se omite el paso de AGP.")
        return

    with open(ROOT_BUILD_GRADLE, "r") as f:
        content = f.read()

    new_content = re.sub(
        r"(com\.android\.tools\.build:gradle:)[\d.]+",
        rf"\g<1>{AGP_VERSION}",
        content,
    )

    if new_content != content:
        with open(ROOT_BUILD_GRADLE, "w") as f:
            f.write(new_content)
        print(f"Android Gradle Plugin actualizado a {AGP_VERSION}.")
    else:
        print("Android Gradle Plugin ya estaba en la versión correcta (o no se encontró la línea).")


def bump_gradle_wrapper():
    if not os.path.exists(WRAPPER_PROPS):
        print(f"AVISO: no se encontró {WRAPPER_PROPS}, se omite el paso de Gradle wrapper.")
        return

    with open(WRAPPER_PROPS, "r") as f:
        content = f.read()

    new_content = re.sub(
        r"distributionUrl=.*gradle-[\d.]+-(all|bin)\.zip",
        f"distributionUrl=https\\://services.gradle.org/distributions/gradle-{GRADLE_VERSION}-all.zip",
        content,
    )

    if new_content != content:
        with open(WRAPPER_PROPS, "w") as f:
            f.write(new_content)
        print(f"Gradle wrapper actualizado a {GRADLE_VERSION}.")
    else:
        print("Gradle wrapper ya estaba en la versión correcta (o no se encontró la línea).")


def main():
    bump_sdk_versions()
    bump_agp()
    bump_gradle_wrapper()


if __name__ == "__main__":
    main()

