'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const packageJson = require('../package.json');
const electronPackageJson = require('electron/package.json');

test('installer chọn thư mục, ẩn runtime và uninstall sạch nhưng giữ Input/Print Area', () => {
  assert.match(packageJson.version, /^\d+\.\d+\.\d+$/);
  assert.equal(packageJson.build.nsis.oneClick, false);
  assert.equal(packageJson.build.nsis.perMachine, false);
  assert.equal(packageJson.build.nsis.allowElevation, true);
  assert.equal(packageJson.build.nsis.allowToChangeInstallationDirectory, true);
  assert.equal(packageJson.build.nsis.deleteAppDataOnUninstall, true);
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
  assert.match(installerInclude, /IfFileExists "\$INSTDIR\\Print Area" inputSyncStart inputSyncDone/);
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
  assert.ok(!hiddenFiles.includes('Print Area'));
  assert.ok(!hiddenFiles.includes('${APP_EXECUTABLE_FILENAME}'));
  assert.ok(!hiddenFiles.includes('${UNINSTALL_FILENAME}'));
  assert.doesNotMatch(installerInclude, /hideTechnicalInstallFile "[^"*?]*[*?]/);

  assert.match(installerInclude, /!macro customRemoveFiles/);
  assert.match(installerInclude, /Call un\.atomicRMDir/);
  assert.match(installerInclude, /Call un\.restoreFiles/);
  assert.match(
    installerInclude,
    /\$\{IfNot\} \$\{isUpdated\}[\s\S]*?RMDir \/r "\$LOCALAPPDATA\\\$\{APP_PACKAGE_NAME\}-updater"/,
  );
  assert.match(installerInclude, /Delete "\$INSTDIR\\Input\\\.png-bundle-input-marker"/);
  assert.doesNotMatch(installerInclude, /RMDir \/r "\$INSTDIR\\Input(?:\\|\")/);
  assert.doesNotMatch(installerInclude, /RMDir \/r "\$INSTDIR\\Print Area(?:\\|\")/);
  assert.doesNotMatch(installerInclude, /RMDir \/r \$INSTDIR(?:\s|$)/m);

  const removedFiles = [...installerInclude.matchAll(
    /!insertmacro removeInstalledFile "([^"]+)"/g,
  )].map((match) => match[1]);
  assert.deepEqual(removedFiles, [
    ...hiddenFiles,
    '${APP_EXECUTABLE_FILENAME}',
    '${UNINSTALL_FILENAME}',
  ]);

  const removedDirectories = [...installerInclude.matchAll(
    /!insertmacro removeInstalledDirectory "([^"]+)"/g,
  )].map((match) => match[1]);
  assert.deepEqual(removedDirectories, hiddenDirectories);

  assert.equal(electronPackageJson.version, '43.2.0');

  const inputPayload = packageJson.build.extraFiles.find((entry) =>
    path.normalize(entry.to) === path.normalize('Input'),
  );
  assert.ok(inputPayload);
  assert.deepEqual(inputPayload.filter, ['README.txt', 'Toystory HLW1.pdf']);
  assert.ok(inputPayload.filter.every((item) => !item.includes('*')));

  const printAreaPayload = packageJson.build.extraFiles.find((entry) =>
    path.normalize(entry.to) === path.normalize('Print Area'),
  );
  assert.ok(printAreaPayload);
  assert.deepEqual(printAreaPayload.filter, ['README.txt']);
  assert.ok(printAreaPayload.filter.every((item) => !item.includes('*')));
});
