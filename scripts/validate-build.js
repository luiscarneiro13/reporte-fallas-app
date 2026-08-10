#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const net = require('net');

const PROD_BACKEND_HOST = 'tryironflow.com';
const PROD_BACKEND_PORT = 443;
const PROD_BACKEND_URL  = 'https://tryironflow.com';
const TIMEOUT_MS = 5000;

function checkTcpConnection(host, port) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(TIMEOUT_MS);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); reject(new Error('timeout')); });
    socket.on('error', (err) => { socket.destroy(); reject(err); });
    socket.connect(port, host);
  });
}

async function checkProductionBackend() {
  const border = '═'.repeat(62);
  process.stdout.write(`  Verificando backend de producción (${PROD_BACKEND_URL})...`);
  try {
    await checkTcpConnection(PROD_BACKEND_HOST, PROD_BACKEND_PORT);
    console.log(' ✅');
    return true;
  } catch {
    console.log(' ❌\n');
    console.error(
      `${border}\n` +
      `  ❌  BACKEND DE PRODUCCIÓN NO DISPONIBLE\n` +
      `${border}\n\n` +
      `  El build requiere que el backend esté activo en:\n\n` +
      `      ${PROD_BACKEND_URL}\n\n` +
      `  Verifica la conectividad antes de compilar la app.\n\n` +
      `${border}\n`
    );
    return false;
  }
}

const APP_JSON_PATH = path.join(__dirname, '..', 'app.json');
const GRADLE_PROPERTIES_PATH = path.join(__dirname, '..', 'gradle.properties');
const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');

const REQUIRED_APP_JSON_FIELDS = [
  'expo.name',
  'expo.slug',
  'expo.version',
  'expo.ios.bundleIdentifier',
  'expo.ios.buildNumber',
  'expo.android.package',
  'expo.android.versionCode',
  'expo.extra.eas.projectId',
];

const REQUIRED_ASSETS = [
  'assets/icon.png',
  'assets/splash-icon.png',
  'assets/adaptive-icon.png',
  'assets/favicon.png',
];

const REQUIRED_DEPENDENCIES = [
  '@react-native-async-storage/async-storage',
  '@react-navigation/native',
  '@tanstack/react-query',
  'axios',
  'zustand',
];

let errors = [];
let warnings = [];

function logError(message) {
  console.error(`❌ ${message}`);
  errors.push(message);
}

function logWarning(message) {
  console.warn(`⚠️  ${message}`);
  warnings.push(message);
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function validateAppJson() {
  console.log('\n📋 Validating app.json...');
  
  if (!fs.existsSync(APP_JSON_PATH)) {
    logError('app.json not found');
    return false;
  }

  const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

  REQUIRED_APP_JSON_FIELDS.forEach(field => {
    const keys = field.split('.');
    let value = appJson;
    for (const key of keys) {
      value = value?.[key];
    }
    
    if (value === undefined || value === null || value === '') {
      logError(`Missing or empty field: ${field}`);
    } else {
      logSuccess(`Field present: ${field}`);
    }
  });

  // Validate package name format
  const androidPackage = appJson.expo?.android?.package;
  const iosBundleId = appJson.expo?.ios?.bundleIdentifier;
  
  if (androidPackage && !androidPackage.match(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/)) {
    logError(`Invalid Android package name format: ${androidPackage}`);
  }
  
  if (iosBundleId && !iosBundleId.match(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/)) {
    logError(`Invalid iOS bundle identifier format: ${iosBundleId}`);
  }

  // Check if newArchEnabled is true
  if (appJson.expo?.newArchEnabled !== true) {
    logError('newArchEnabled must be true in app.json');
  } else {
    logSuccess('newArchEnabled is true');
  }

  return errors.length === 0;
}

function validateGradleProperties() {
  console.log('\n📋 Validating gradle.properties...');
  
  if (!fs.existsSync(GRADLE_PROPERTIES_PATH)) {
    logError('gradle.properties not found');
    return false;
  }

  const content = fs.readFileSync(GRADLE_PROPERTIES_PATH, 'utf8');
  
  if (!content.includes('newArchEnabled=true')) {
    logError('newArchEnabled=true not found in gradle.properties');
  } else {
    logSuccess('newArchEnabled=true found in gradle.properties');
  }

  return errors.length === 0;
}

function validateAssets() {
  console.log('\n📋 Validating assets...');
  
  REQUIRED_ASSETS.forEach(asset => {
    const assetPath = path.join(__dirname, '..', asset);
    if (!fs.existsSync(assetPath)) {
      logError(`Missing asset: ${asset}`);
    } else {
      logSuccess(`Asset found: ${asset}`);
    }
  });

  return errors.length === 0;
}

function validateDependencies() {
  console.log('\n📋 Validating dependencies...');
  
  if (!fs.existsSync(PACKAGE_JSON_PATH)) {
    logError('package.json not found');
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

  REQUIRED_DEPENDENCIES.forEach(dep => {
    if (!dependencies[dep]) {
      logError(`Missing dependency: ${dep}`);
    } else {
      logSuccess(`Dependency found: ${dep}`);
    }
  });

  return errors.length === 0;
}

function validateVersionIncrement() {
  console.log('\n📋 Checking version increment...');
  
  const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  
  const appVersion = appJson.expo?.version;
  const packageVersion = packageJson.version;
  
  if (appVersion !== packageVersion) {
    logWarning(`Version mismatch: app.json (${appVersion}) != package.json (${packageVersion})`);
  } else {
    logSuccess(`Versions match: ${appVersion}`);
  }

  return true;
}

function main() {
  console.log('🔍 Validating build configuration...\n');
  
  validateAppJson();
  validateGradleProperties();
  validateAssets();
  validateDependencies();
  validateVersionIncrement();

  console.log('\n' + '='.repeat(50));
  
  if (errors.length > 0) {
    console.log(`\n❌ Validation failed with ${errors.length} error(s)`);
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log(`\n⚠️  Validation passed with ${warnings.length} warning(s)`);
    process.exit(0);
  } else {
    console.log('\n✅ All validations passed!');
    process.exit(0);
  }
}

async function run() {
  console.log('🌐 Checking production backend connectivity...\n');
  const backendOk = await checkProductionBackend();
  if (!backendOk) {
    process.exit(1);
  }
  main();
}

run();
