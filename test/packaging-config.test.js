'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const packageJson = require('../package.json');

test('installer v1.2.1 giữ chế độ assisted của v1.2.0 và không đóng gói marker Input runtime', () => {
  assert.equal(packageJson.version, '1.2.1');
  assert.equal(packageJson.build.nsis.oneClick, false);
  assert.equal(packageJson.build.nsis.perMachine, false);
  assert.equal(packageJson.build.nsis.allowElevation, true);
  assert.equal(packageJson.build.nsis.allowToChangeInstallationDirectory, false);
  assert.equal(packageJson.build.nsis.include, 'build/installer.nsh');
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

  const inputPayload = packageJson.build.extraFiles.find((entry) =>
    path.normalize(entry.to) === path.normalize('Input'),
  );
  assert.ok(inputPayload);
  assert.ok(inputPayload.filter.includes('!**/.png-bundle-input-marker'));
  assert.ok(inputPayload.filter.includes('!**/.png-bundle-input-marker.tmp-*'));
});
