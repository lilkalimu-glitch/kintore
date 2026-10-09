// Bereitet den Web-Teil für die Android-App vor (läuft im GitHub-Build nach "npm install"):
// kopiert Capacitor und die Plugins nach www/vendor und schreibt die Versionsnummer.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const PLUGINS = {
  Haptics: '@capacitor/haptics',
  LocalNotifications: '@capacitor/local-notifications',
  Filesystem: '@capacitor/filesystem',
  Share: '@capacitor/share',
  StatusBar: '@capacitor/status-bar',
  App: '@capacitor/app',
};

const core = 'node_modules/@capacitor/core/dist/capacitor.js';
if (existsSync(core)) {
  writeFileSync('www/vendor/capacitor.js', readFileSync(core, 'utf8'));
  console.log('Capacitor-Kern kopiert');
} else {
  console.warn('WARNUNG: Capacitor-Kern nicht gefunden – native Funktionen fehlen.');
}

let bundle = '/* Automatisch erzeugt von scripts/prepare-web.mjs */\n';
bundle += 'var synapse = typeof synapse !== "undefined" ? synapse : { exposeSynapse: function () {} };\n';
bundle += 'window.KPlugins = window.KPlugins || {};\n';
for (const [name, pkg] of Object.entries(PLUGINS)) {
  const file = `node_modules/${pkg}/dist/plugin.js`;
  if (!existsSync(file)) { console.warn('WARNUNG: fehlt', file); continue; }
  const src = readFileSync(file, 'utf8').replace(/\/\/# sourceMappingURL=.*$/m, '');
  const m = src.match(/var\s+([A-Za-z0-9_$]+)\s*=\s*\(function/);
  if (!m) { console.warn('WARNUNG: Format unbekannt', file); continue; }
  bundle += `\n/* ${pkg} */\ntry {\n${src}\n} catch (e) { console.warn('Plugin ${name} nicht geladen', e); }\n`;
  bundle += `try { if (typeof ${m[1]} !== 'undefined' && ${m[1]}.${name}) window.KPlugins.${name} = ${m[1]}.${name}; } catch (e) {}\n`;
  console.log(`Plugin ${name} eingebunden (${m[1]})`);
}
writeFileSync('www/vendor/plugins.js', bundle);

const run = process.env.GITHUB_RUN_NUMBER;
const major = process.env.APP_MAJOR || '1';
if (run) {
  writeFileSync('www/js/version.js', `// Automatisch beim Bauen gesetzt.\nexport const VERSION = '${major}.${run}';\n`);
  console.log(`Version ${major}.${run}`);
}
