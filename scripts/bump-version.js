#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const APP_JSON_PATH      = path.join(__dirname, '..', 'app.json');
const PACKAGE_JSON_PATH  = path.join(__dirname, '..', 'package.json');
const CONSTANTS_JS_PATH  = path.join(__dirname, '..', 'src', 'constants', 'index.js');

// Accept bump type from argument: patch (default), minor, major
const BUMP_TYPE = process.argv[2] || 'patch';

if (!['major', 'minor', 'patch'].includes(BUMP_TYPE)) {
  console.error(`❌  Tipo de bump inválido: "${BUMP_TYPE}". Usa: major | minor | patch`);
  process.exit(1);
}

function bumpSemver(version, type) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Versión inválida: ${version}`);
  }
  const [major, minor, patch] = parts;
  switch (type) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
  }
}

const appJson     = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));

const oldVersion      = appJson.expo.version;
const oldVersionCode  = appJson.expo.android.versionCode;
const oldBuildNumber  = appJson.expo.ios.buildNumber;

const newVersion      = bumpSemver(oldVersion, BUMP_TYPE);
const newVersionCode  = oldVersionCode + 1;
const newBuildNumber  = String(Number(oldBuildNumber) + 1);

// Apply changes
appJson.expo.version                  = newVersion;
appJson.expo.android.versionCode      = newVersionCode;
appJson.expo.ios.buildNumber          = newBuildNumber;
packageJson.version                   = newVersion;

fs.writeFileSync(APP_JSON_PATH,     JSON.stringify(appJson, null, 2) + '\n');
fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n');

const constantsJs    = fs.readFileSync(CONSTANTS_JS_PATH, 'utf8');
const updatedConstantsJs = constantsJs.replace(
  /export const APP_VERSION\s*=\s*'[^']*';/,
  `export const APP_VERSION        = '${newVersion}';`
);
fs.writeFileSync(CONSTANTS_JS_PATH, updatedConstantsJs);

const border = '─'.repeat(44);
console.log(`\n${border}`);
console.log(`  🔖  Version bump (${BUMP_TYPE})`);
console.log(`${border}`);
console.log(`  version      ${oldVersion.padEnd(10)} →  ${newVersion}`);
console.log(`  versionCode  ${String(oldVersionCode).padEnd(10)} →  ${newVersionCode}`);
console.log(`  buildNumber  ${oldBuildNumber.padEnd(10)} →  ${newBuildNumber}`);
console.log(`${border}\n`);
