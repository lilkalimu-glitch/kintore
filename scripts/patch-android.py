"""Passt das von Capacitor erzeugte Android-Projekt an KINTORE an.

Läuft im GitHub-Build nach "npx cap add android" und "npx cap sync android":
App-Icon, Startbild, dunkle System-Leisten, Berechtigungen und Versionsnummer.
Nur Python-Standardbibliothek, damit es auf jedem Build-Rechner läuft.
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "android", "app")
RES = os.path.join(APP, "src", "main", "res")
MANIFEST = os.path.join(APP, "src", "main", "AndroidManifest.xml")
GRADLE = os.path.join(APP, "build.gradle")
OWN_RES = os.path.join(ROOT, "android-res")

BG = "#0B1020"
ICON_BG = "#0D1324"


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


def copy_resources():
    for dirpath, _, files in os.walk(OWN_RES):
        rel = os.path.relpath(dirpath, OWN_RES)
        for f in files:
            dest = os.path.join(RES, rel, f)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.copyfile(os.path.join(dirpath, f), dest)
    print("Eigene Icons und Bilder kopiert")


def adaptive_icon():
    xml = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <background android:drawable="@color/kintore_icon_bg"/>\n'
        '    <foreground android:drawable="@mipmap/kintore_icon_fg"/>\n'
        '    <monochrome android:drawable="@mipmap/kintore_icon_mono"/>\n'
        '</adaptive-icon>\n'
    )
    for name in ("ic_launcher.xml", "ic_launcher_round.xml"):
        write(os.path.join(RES, "mipmap-anydpi-v26", name), xml)
    write(
        os.path.join(RES, "values", "kintore_colors.xml"),
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        f'    <color name="kintore_bg">{BG}</color>\n'
        f'    <color name="kintore_icon_bg">{ICON_BG}</color>\n'
        '</resources>\n',
    )
    print("Adaptives Icon gesetzt")


def splash():
    removed = 0
    for dirpath, _, files in os.walk(RES):
        for f in files:
            if f in ("splash.png", "splash.9.png", "splash.xml") and os.path.basename(dirpath).startswith("drawable"):
                os.remove(os.path.join(dirpath, f))
                removed += 1
    write(
        os.path.join(RES, "drawable", "splash.xml"),
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <item android:drawable="@color/kintore_bg"/>\n'
        '    <item android:gravity="center" android:drawable="@drawable/kintore_splash_logo"/>\n'
        '</layer-list>\n',
    )
    print(f"Startbild ersetzt ({removed} alte Dateien entfernt)")


def add_items(text, style_name, items):
    pattern = re.compile(r'(<style\s+name="' + re.escape(style_name) + r'"[^>]*>)(.*?)(</style>)', re.S)
    m = pattern.search(text)
    if not m:
        return text
    body = m.group(2)
    for name, value, extra in items:
        if f'name="{name}"' in body:
            body = re.sub(r'<item\s+name="' + re.escape(name) + r'"[^>]*>.*?</item>', f'<item name="{name}"{extra}>{value}</item>', body, flags=re.S)
        else:
            body = body.rstrip() + f'\n        <item name="{name}"{extra}>{value}</item>\n    '
    return text[: m.start()] + m.group(1) + body + m.group(3) + text[m.end():]


def styles():
    paths = [os.path.join(RES, d, "styles.xml") for d in sorted(os.listdir(RES)) if d.startswith("values") and os.path.exists(os.path.join(RES, d, "styles.xml"))]
    if not paths:
        print("WARNUNG: styles.xml fehlt")
        return
    for path in paths:
        patch_styles(path)


def patch_styles(path):
    text = read(path)
    if "xmlns:tools" not in text:
        text = text.replace("<resources>", '<resources xmlns:tools="http://schemas.android.com/tools">', 1)
    opt_out = ("android:windowOptOutEdgeToEdgeEnforcement", "true", ' tools:targetApi="35"')
    bars = [
        ("android:statusBarColor", "@color/kintore_bg", ""),
        ("android:navigationBarColor", "@color/kintore_bg", ""),
        ("android:windowLightStatusBar", "false", ' tools:targetApi="23"'),
        ("android:windowLightNavigationBar", "false", ' tools:targetApi="27"'),
    ]
    text = add_items(text, "AppTheme.NoActionBar", [opt_out, *bars, ("android:windowBackground", "@color/kintore_bg", "")])
    launch = [opt_out, *bars]
    if "Theme.SplashScreen" in text:
        launch.append(("windowSplashScreenBackground", "@color/kintore_bg", ""))
    text = add_items(text, "AppTheme.NoActionBarLaunch", launch)
    write(path, text)
    print("Dunkle System-Leisten gesetzt in", os.path.relpath(path, RES))


def manifest():
    text = read(MANIFEST)
    perms = [
        "android.permission.VIBRATE",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.USE_EXACT_ALARM",
    ]
    lines = "".join(f'    <uses-permission android:name="{p}" />\n' for p in perms if p not in text)
    if lines:
        text = text.replace("<application", lines + "\n    <application", 1)
    text = re.sub(r"<activity(?![^>]*screenOrientation)", '<activity\n            android:screenOrientation="portrait"', text, count=1)
    text = re.sub(r"<activity(?![^>]*windowSoftInputMode)", '<activity\n            android:windowSoftInputMode="adjustResize"', text, count=1)
    write(MANIFEST, text)
    print("Manifest ergänzt")


def version():
    run = int(os.environ.get("GITHUB_RUN_NUMBER", "1"))
    major = os.environ.get("APP_MAJOR", "1")
    code = int(os.environ.get("CODE_OFFSET", "0")) + run
    text = read(GRADLE)
    text, n1 = re.subn(r"versionCode\s+\d+", f"versionCode {code}", text)
    text, n2 = re.subn(r'versionName\s+"[^"]*"', f'versionName "{major}.{run}"', text)
    if "checkReleaseBuilds" not in text:
        text += "\nandroid {\n    lint {\n        checkReleaseBuilds false\n        abortOnError false\n    }\n}\n"
    write(GRADLE, text)
    print(f"Version {major}.{run} (versionCode {code}); Treffer {n1}/{n2}")


def main_activity():
    java_root = os.path.join(APP, "src", "main", "java")
    for dirpath, _, files in os.walk(java_root):
        if "MainActivity.java" in files:
            path = os.path.join(dirpath, "MainActivity.java")
            text = read(path)
            pkg = re.search(r"^package\s+[\w.]+;", text, re.M)
            if not pkg:
                print("WARNUNG: Paketname in MainActivity nicht gefunden")
                return
            write(path, pkg.group(0) + """

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            // Layout nicht durch die System-Schriftgröße sprengen lassen.
            getBridge().getWebView().getSettings().setTextZoom(100);
        } catch (Exception ignored) {
        }
    }
}
""")
            print("MainActivity angepasst")
            return
    print("WARNUNG: MainActivity.java nicht gefunden")


def main():
    if not os.path.isdir(RES):
        sys.exit("android/ fehlt – vorher 'npx cap add android' ausführen")
    copy_resources()
    adaptive_icon()
    splash()
    styles()
    manifest()
    main_activity()
    version()


if __name__ == "__main__":
    main()
