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

# Grund beim Start und Farbe der Leisten, bis die App ihr Design setzt (Dunkel, seit 2.10).
BG = "#0E0F13"
# Grund im Design Hell. Startbild für Hell und Automatisch (seit 2.11), siehe KintoreLaunchLight und -Auto.
BG_LIGHT = "#F3F4F6"
ICON_BG = "#F571A6"


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
        f'    <color name="kintore_bg_light">{BG_LIGHT}</color>\n'
        f'    <color name="kintore_bg_auto">{BG_LIGHT}</color>\n'
        '</resources>\n',
    )
    # Automatisch: im Dunkelmodus des Handys dunkel.
    write(
        os.path.join(RES, "values-night", "kintore_colors.xml"),
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        f'    <color name="kintore_bg_auto">{BG}</color>\n'
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
    for name, color, logo in (("splash_light.xml", "kintore_bg_light", "kintore_splash_logo_light"),):
        write(
            os.path.join(RES, "drawable", name),
            '<?xml version="1.0" encoding="utf-8"?>\n'
            '<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n'
            f'    <item android:drawable="@color/{color}"/>\n'
            f'    <item android:gravity="center" android:drawable="@drawable/{logo}"/>\n'
            '</layer-list>\n',
        )
    # Automatisch: dunkles Startbild im Dunkelmodus des Handys.
    write(
        os.path.join(RES, "drawable", "splash_auto.xml"),
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <item android:drawable="@color/kintore_bg_auto"/>\n'
        '    <item android:gravity="center" android:drawable="@drawable/kintore_splash_logo_light"/>\n'
        '</layer-list>\n',
    )
    write(
        os.path.join(RES, "drawable-night", "splash_auto.xml"),
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <item android:drawable="@color/kintore_bg_auto"/>\n'
        '    <item android:gravity="center" android:drawable="@drawable/kintore_splash_logo"/>\n'
        '</layer-list>\n',
    )
    print(f"Startbild ersetzt ({removed} alte Dateien entfernt)")


def launch_themes():
    """Startbild für Hell und Automatisch (seit 2.11). Ab Android 13 wählt KintoreBarsPlugin.start eins davon
    über setSplashScreenTheme fürs nächste Öffnen. Davor bleibt das dunkle Startbild."""
    def theme(name, color, splash, light):
        flag = "true" if light else "false"
        return (
            f'    <style name="{name}" parent="AppTheme.NoActionBarLaunch">\n'
            f'        <item name="windowSplashScreenBackground">@color/{color}</item>\n'
            f'        <item name="android:background">@drawable/{splash}</item>\n'
            f'        <item name="android:statusBarColor">@color/{color}</item>\n'
            f'        <item name="android:navigationBarColor">@color/{color}</item>\n'
            f'        <item name="android:windowLightStatusBar" tools:targetApi="23">{flag}</item>\n'
            f'        <item name="android:windowLightNavigationBar" tools:targetApi="27">{flag}</item>\n'
            '    </style>\n'
        )
    write(
        os.path.join(RES, "values", "kintore_themes.xml"),
        '<?xml version="1.0" encoding="utf-8"?>\n<resources xmlns:tools="http://schemas.android.com/tools">\n'
        + theme("KintoreLaunchLight", "kintore_bg_light", "splash_light", True)
        + theme("KintoreLaunchAuto", "kintore_bg_auto", "splash_auto", True)
        + '</resources>\n',
    )
    # Automatisch im Dunkelmodus: helle Symbole in den Leisten.
    write(
        os.path.join(RES, "values-night", "kintore_themes.xml"),
        '<?xml version="1.0" encoding="utf-8"?>\n<resources xmlns:tools="http://schemas.android.com/tools">\n'
        + theme("KintoreLaunchAuto", "kintore_bg_auto", "splash_auto", False)
        + '</resources>\n',
    )
    print("Startbilder für Hell und Automatisch angelegt")


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


BARS_PLUGIN = """

import android.content.Context;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Färbt Status- und Navigationsleiste passend zum Design der App (Dunkel, Hell, Neon).
// light: heller Grund, dann dunkle Symbole in den Leisten.
// Seit 2.11 dazu: Startbild fürs nächste Öffnen (start) und Hell oder Dunkel vom Handy (system, Ereignis "system").
@CapacitorPlugin(name = "KintoreBars")
public class KintoreBarsPlugin extends Plugin {
    static final String PREFS = "kintore";
    static final String DARK_BG = "#0E0F13";
    static final String LIGHT_BG = "#F3F4F6";

    static boolean nightMode(Context c) {
        return (c.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
    }

    // Grund und Leisten beim Start, bevor die Web-Seite steht (MainActivity).
    static void applyStart(android.app.Activity activity) {
        android.content.SharedPreferences p = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String color = p.getString("start_color", null);
        if (color == null) return;
        boolean light = p.getBoolean("start_light", false);
        if (p.getBoolean("start_auto", false)) {
            light = !nightMode(activity);
            color = light ? LIGHT_BG : DARK_BG;
        }
        int c = Color.parseColor(color);
        Window window = activity.getWindow();
        window.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(c));
        window.setStatusBarColor(c);
        window.setNavigationBarColor(c);
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(window, window.getDecorView());
        bars.setAppearanceLightStatusBars(light);
        bars.setAppearanceLightNavigationBars(light);
    }

    @PluginMethod
    public void start(final PluginCall call) {
        final String color = call.getString("color", DARK_BG);
        final Boolean lightValue = call.getBoolean("light", false);
        final Boolean autoValue = call.getBoolean("auto", false);
        final boolean light = lightValue != null && lightValue;
        final boolean auto = autoValue != null && autoValue;
        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                        .putString("start_color", color).putBoolean("start_light", light).putBoolean("start_auto", auto).apply();
                    if (Build.VERSION.SDK_INT >= 33) {
                        String name = auto ? "KintoreLaunchAuto" : light ? "KintoreLaunchLight" : "AppTheme_NoActionBarLaunch";
                        int id = getContext().getResources().getIdentifier(name, "style", getContext().getPackageName());
                        if (id != 0) getActivity().getSplashScreen().setSplashScreenTheme(id);
                    }
                    call.resolve();
                } catch (Exception e) {
                    call.reject("Startbild konnte nicht gesetzt werden", e);
                }
            }
        });
    }

    @PluginMethod
    public void system(PluginCall call) {
        JSObject r = new JSObject();
        r.put("dark", nightMode(getContext()));
        call.resolve(r);
    }

    @Override
    protected void handleOnConfigurationChanged(Configuration newConfig) {
        super.handleOnConfigurationChanged(newConfig);
        JSObject r = new JSObject();
        r.put("dark", (newConfig.uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES);
        notifyListeners("system", r);
    }

    @PluginMethod
    public void set(final PluginCall call) {
        final String color = call.getString("color", "#0E0F13");
        final Boolean lightValue = call.getBoolean("light", false);
        final boolean light = lightValue != null && lightValue;
        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    Window window = getActivity().getWindow();
                    int c = Color.parseColor(color);
                    window.setStatusBarColor(c);
                    window.setNavigationBarColor(c);
                    WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(window, window.getDecorView());
                    bars.setAppearanceLightStatusBars(light);
                    bars.setAppearanceLightNavigationBars(light);
                    call.resolve();
                } catch (Exception e) {
                    call.reject("Leisten konnten nicht gefärbt werden", e);
                }
            }
        });
    }
}
"""


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
            write(os.path.join(dirpath, "KintoreBarsPlugin.java"), pkg.group(0) + BARS_PLUGIN)
            write(path, pkg.group(0) + """

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Eigenes Plugin: Leisten oben und unten passend zum Design der App färben (www/js/native.js).
        registerPlugin(KintoreBarsPlugin.class);
        super.onCreate(savedInstanceState);
        try {
            // Grund und Leisten im zuletzt gewählten Design, damit Hell beim Öffnen nicht dunkel aufblitzt (seit 2.11).
            KintoreBarsPlugin.applyStart(this);
            String bg = getSharedPreferences(KintoreBarsPlugin.PREFS, MODE_PRIVATE).getString("start_color", null);
            if (bg != null) {
                if (getSharedPreferences(KintoreBarsPlugin.PREFS, MODE_PRIVATE).getBoolean("start_auto", false)) {
                    bg = KintoreBarsPlugin.nightMode(this) ? KintoreBarsPlugin.DARK_BG : KintoreBarsPlugin.LIGHT_BG;
                }
                getBridge().getWebView().setBackgroundColor(android.graphics.Color.parseColor(bg));
            }
        } catch (Exception ignored) {
        }
        try {
            // Größere Schrift aus den Android-Einstellungen gilt auch in der App (Barrierefreiheit),
            // höchstens 130 %, damit das Layout hält. Kleinere Schrift als vorgesehen gibt es nicht.
            float scale = getResources().getConfiguration().fontScale;
            int zoom = Math.round(Math.min(Math.max(scale, 1f), 1.3f) * 100);
            getBridge().getWebView().getSettings().setTextZoom(zoom);
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
        sys.exit("android/ fehlt, vorher 'npx cap add android' ausführen")
    copy_resources()
    adaptive_icon()
    splash()
    styles()
    launch_themes()
    manifest()
    main_activity()
    version()


if __name__ == "__main__":
    main()
