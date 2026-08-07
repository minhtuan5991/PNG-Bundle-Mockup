'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const packageJson = require('../package.json');
const electronPackageJson = require('electron/package.json');

test('installer assisted cho chọn thư mục, ẩn đúng runtime và không đóng gói marker Input', () => {
  assert.match(packageJson.version, /^\d+\.\d+\.\d+$/);
  assert.equal(packageJson.build.nsis.oneClick, false);
  assert.equal(packageJson.build.nsis.perMachine, false);
  assert.equal(packageJson.build.nsis.allowElevation, true);
  assert.equal(packageJson.build.nsis.allowToChangeInstallationDirectory, true);
  assert.equal(packageJson.build.nsis.include, 'build/installer.nsh');

  const assistedInstallerTemplate = fs.readFileSync(
    path.resolve(
      __dirname,
      '..',
      'node_modules',
      'app-builder-lib',
      'templates',
      'nsis',
      'assistedInstaller.nsh',
    ),
    'utf8',
  );
  assert.match(
    assistedInstallerTemplate,
    /!ifdef allowToChangeInstallationDirectory[\s\S]*?!insertmacro skipPageIfUpdated[\s\S]*?!insertmacro MUI_PAGE_DIRECTORY/,
  );
  assert.match(
    assistedInstallerTemplate,
    /StrCpy \$INSTDIR "\$INSTDIR\\\$\{APP_FILENAME\}"/,
  );

  const installerInclude = fs.readFileSync(
    path.resolve(__dirname, '..', packageJson.build.nsis.include),
    'utf8',
  );
  assert.match(installerInclude, /--sync-input-backup/);
  assert.match(installerInclude, /Abort/);
  assert.match(installerInclude, /customInstallMode/);
  assert.match(installerInclude, /perMachineInstallationFolder/);
  assert.match(installerInclude, /isForceCurrentInstall/);
  assert.match(installerInclude, /customInit/);
  assert.match(installerInclude, /Fresh All Users install is not supported/);
  assert.match(installerInclude, /icacls\.exe/);
  assert.match(installerInclude, /S-1-5-32-545/);
  assert.match(installerInclude, /!macro hideTechnicalInstallFile FILE_NAME/);
  assert.match(installerInclude, /!macro hideTechnicalInstallDirectory DIRECTORY_NAME/);
  assert.match(installerInclude, /SetFileAttributes "\$INSTDIR\\\$\{FILE_NAME\}" HIDDEN\|ARCHIVE/);
  assert.match(installerInclude, /SetFileAttributes "\$INSTDIR\\\$\{DIRECTORY_NAME\}" HIDDEN/);

  const hiddenFiles = [...installerInclude.matchAll(
    /!insertmacro hideTechnicalInstallFile "([^"]+)"/g,
  )].map((match) => match[1]);
  assert.deepEqual(hiddenFiles, [
    'chrome_100_percent.pak',
    'chrome_200_percent.pak',
    'd3dcompiler_47.dll',
    'dxcompiler.dll',
    'dxil.dll',
    'ffmpeg.dll',
    'icudtl.dat',
    'libEGL.dll',
    'libGLESv2.dll',
    'LICENSE.electron.txt',
    'LICENSES.chromium.html',
    'resources.pak',
    'snapshot_blob.bin',
    'v8_context_snapshot.bin',
    'vk_swiftshader.dll',
    'vk_swiftshader_icd.json',
    'vulkan-1.dll',
    'uninstallerIcon.ico',
  ]);

  const hiddenDirectories = [...installerInclude.matchAll(
    /!insertmacro hideTechnicalInstallDirectory "([^"]+)"/g,
  )].map((match) => match[1]);
  assert.deepEqual(hiddenDirectories, ['locales', 'resources']);
  assert.ok(!hiddenFiles.includes('Input'));
  assert.ok(!hiddenFiles.includes('${APP_EXECUTABLE_FILENAME}'));
  assert.ok(!hiddenFiles.includes('${UNINSTALL_FILENAME}'));
  assert.doesNotMatch(installerInclude, /hideTechnicalInstallFile "[^"*?]*[*?]/);

  assert.equal(electronPackageJson.version, '43.2.0');

  const inputPayload = packageJson.build.extraFiles.find((entry) =>
    path.normalize(entry.to) === path.normalize('Input'),
  );
  assert.ok(inputPayload);
  assert.ok(inputPayload.filter.includes('!**/.png-bundle-input-marker'));
  assert.ok(inputPayload.filter.includes('!**/.png-bundle-input-marker.tmp-*'));
});
