import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const releaseType = process.argv[2] ?? 'patch';
const validReleaseTypes = new Set(['patch', 'minor', 'major']);

if (!validReleaseTypes.has(releaseType)) {
  throw new Error('Use one of: patch, minor, major');
}

const root = resolve(import.meta.dirname, '..');
const versionFile = resolve(root, 'android', 'version.properties');
const packageFile = resolve(root, 'package.json');
const packageLockFile = resolve(root, 'package-lock.json');
const appVersionFile = resolve(root, 'src', 'game', 'appVersion.ts');
const current = readFileSync(versionFile, 'utf8');
const versionName = current.match(/^VERSION_NAME=(.+)$/m)?.[1]?.trim();
const versionCode = Number(current.match(/^VERSION_CODE=(\d+)$/m)?.[1]);

if (!versionName || !Number.isInteger(versionCode)) {
  throw new Error('android/version.properties is missing a valid version name or code');
}

let [major, minor, patch] = versionName.split('.').map(Number);
if ([major, minor, patch].some((value) => !Number.isInteger(value))) {
  throw new Error(`Invalid semantic version: ${versionName}`);
}

if (releaseType === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else if (releaseType === 'minor') {
  minor += 1;
  patch = 0;
} else {
  patch += 1;
}

const nextVersion = `${major}.${minor}.${patch}`;
const nextCode = versionCode + 1;
writeFileSync(versionFile, `VERSION_CODE=${nextCode}\nVERSION_NAME=${nextVersion}\n`);

const packageJson = JSON.parse(readFileSync(packageFile, 'utf8'));
packageJson.version = nextVersion;
writeFileSync(packageFile, `${JSON.stringify(packageJson, null, 2)}\n`);

const packageLock = JSON.parse(readFileSync(packageLockFile, 'utf8'));
packageLock.version = nextVersion;
if (packageLock.packages?.['']) packageLock.packages[''].version = nextVersion;
writeFileSync(packageLockFile, `${JSON.stringify(packageLock, null, 2)}\n`);

writeFileSync(
  appVersionFile,
  `export const APP_VERSION = '${nextVersion}';\nexport const APP_BUILD_NUMBER = ${nextCode};\n`
);

console.log(`Version bumped to ${nextVersion} (build ${nextCode})`);
