!macro customInit
  ; Ignore stale registry records instead of forcing an install mode whose app is gone.
  ${If} $perUserInstallationFolder != ""
  ${AndIfNot} ${FileExists} "$perUserInstallationFolder\${APP_EXECUTABLE_FILENAME}"
      DeleteRegValue HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
      StrCpy $perUserInstallationFolder ""
      StrCpy $hasPerUserInstallation "0"
  ${EndIf}
  ${If} $perMachineInstallationFolder != ""
  ${AndIfNot} ${FileExists} "$perMachineInstallationFolder\${APP_EXECUTABLE_FILENAME}"
      StrCpy $perMachineInstallationFolder ""
      StrCpy $hasPerMachineInstallation "0"
  ${EndIf}

  ; Two live installations are ambiguous for a silent updater; require manual cleanup.
  ${If} $perUserInstallationFolder != ""
  ${AndIf} $perMachineInstallationFolder != ""
    ${IfNot} ${Silent}
      MessageBox MB_ICONSTOP|MB_OK "Both per-user and All Users installations of PNG Bundle Mockup were found. Uninstall the duplicate copy, then run this installer again."
    ${EndIf}
    Abort "Ambiguous existing install mode."
  ${EndIf}

  ; A fresh /allusers install would put mutable Input under Program Files.
  ${GetParameters} $R0
  ${GetOptions} $R0 "/allusers" $R1
  ${IfNot} ${Errors}
  ${AndIf} $perMachineInstallationFolder == ""
    ${IfNot} ${Silent}
      MessageBox MB_ICONSTOP|MB_OK "Fresh All Users installation is not supported because the Input folder must remain writable. Install for the current user instead."
    ${EndIf}
    Abort "Fresh All Users install is not supported."
  ${EndIf}

  ; Reset mode/path after stale-record cleanup, including silent installs that skip the page.
  ${If} $perUserInstallationFolder != ""
    !insertmacro setInstallModePerUser
  ${ElseIf} $perMachineInstallationFolder != ""
    !insertmacro setInstallModePerAllUsers
  ${Else}
    !insertmacro setInstallModePerUser
  ${EndIf}

  ; Preflight the ACL command before the old per-machine version is uninstalled.
  ${If} $perMachineInstallationFolder != ""
  ${AndIf} ${UAC_IsAdmin}
    System::Call 'kernel32::GetCurrentProcessId()i.r7'
    StrCpy $R6 "$perMachineInstallationFolder\.png-bundle-input-acl-probe-$7"
    ClearErrors
    CreateDirectory "$R6"
    ${If} ${Errors}
      ${IfNot} ${Silent}
        MessageBox MB_ICONSTOP|MB_OK "Windows could not create a write-access probe in the existing installation folder. The existing installation was not changed."
      ${EndIf}
      Abort "Cannot create Input ACL preflight directory."
    ${EndIf}
    nsExec::ExecToStack '"$SYSDIR\icacls.exe" "$R6" /grant "*S-1-5-32-545:(OI)(CI)M" /T /C /Q'
    Pop $R8
    Pop $R9
    RMDir /r "$R6"
    ${If} $R8 != "0"
      ${IfNot} ${Silent}
        MessageBox MB_ICONSTOP|MB_OK "Windows could not prepare write access for the shared Input folder. The existing installation was not changed."
      ${EndIf}
      Abort "Input ACL preflight failed with exit code $R8."
    ${EndIf}
  ${EndIf}
!macroend

!macro customInstallMode
  !ifndef BUILD_UNINSTALLER
    ${If} $perUserInstallationFolder != ""
      StrCpy $isForceCurrentInstall "1"
    ${ElseIf} $perMachineInstallationFolder != ""
      StrCpy $isForceMachineInstall "1"
    ${Else}
      ; Fresh installs are per-user so the mutable Input directory stays writable.
      StrCpy $isForceCurrentInstall "1"
    ${EndIf}
  !endif
!macroend

; Keep the installation root readable without deleting Electron runtime files.
; Use an exact allowlist so a custom install directory can never hide unrelated user files.
!macro hideTechnicalInstallFile FILE_NAME
  ${If} ${FileExists} "$INSTDIR\${FILE_NAME}"
    ClearErrors
    SetFileAttributes "$INSTDIR\${FILE_NAME}" HIDDEN|ARCHIVE
    ${If} ${Errors}
      DetailPrint "Could not hide technical install file: ${FILE_NAME}"
      ClearErrors
    ${EndIf}
  ${EndIf}
!macroend

!macro hideTechnicalInstallDirectory DIRECTORY_NAME
  ${If} ${FileExists} "$INSTDIR\${DIRECTORY_NAME}\*.*"
    ClearErrors
    SetFileAttributes "$INSTDIR\${DIRECTORY_NAME}" HIDDEN
    ${If} ${Errors}
      DetailPrint "Could not hide technical install directory: ${DIRECTORY_NAME}"
      ClearErrors
    ${EndIf}
  ${EndIf}
!macroend

!macro customInstall
  ${If} $installMode == "all"
    DetailPrint "Granting local users modify access to the shared Input directory..."
    nsExec::ExecToStack '"$SYSDIR\icacls.exe" "$INSTDIR\Input" /grant "*S-1-5-32-545:(OI)(CI)M" /T /C /Q'
    Pop $R8
    Pop $R9
    ${If} $R8 != "0"
      DetailPrint "Unable to make Input writable. icacls exit=$R8 output=$R9"
      ${IfNot} ${Silent}
        MessageBox MB_ICONSTOP|MB_OK "PNG Bundle Mockup could not make the Input folder writable. Installation was stopped to avoid creating an unusable app."
      ${EndIf}
      Abort "Unable to grant write access to Input."
    ${EndIf}
  ${EndIf}

  DetailPrint "Hiding Electron runtime files from the installation root..."
  !insertmacro hideTechnicalInstallDirectory "locales"
  !insertmacro hideTechnicalInstallDirectory "resources"
  !insertmacro hideTechnicalInstallFile "chrome_100_percent.pak"
  !insertmacro hideTechnicalInstallFile "chrome_200_percent.pak"
  !insertmacro hideTechnicalInstallFile "d3dcompiler_47.dll"
  !insertmacro hideTechnicalInstallFile "dxcompiler.dll"
  !insertmacro hideTechnicalInstallFile "dxil.dll"
  !insertmacro hideTechnicalInstallFile "ffmpeg.dll"
  !insertmacro hideTechnicalInstallFile "icudtl.dat"
  !insertmacro hideTechnicalInstallFile "libEGL.dll"
  !insertmacro hideTechnicalInstallFile "libGLESv2.dll"
  !insertmacro hideTechnicalInstallFile "LICENSE.electron.txt"
  !insertmacro hideTechnicalInstallFile "LICENSES.chromium.html"
  !insertmacro hideTechnicalInstallFile "resources.pak"
  !insertmacro hideTechnicalInstallFile "snapshot_blob.bin"
  !insertmacro hideTechnicalInstallFile "v8_context_snapshot.bin"
  !insertmacro hideTechnicalInstallFile "vk_swiftshader.dll"
  !insertmacro hideTechnicalInstallFile "vk_swiftshader_icd.json"
  !insertmacro hideTechnicalInstallFile "vulkan-1.dll"
  !insertmacro hideTechnicalInstallFile "uninstallerIcon.ico"
!macroend

!macro customUnInstall
  IfFileExists "$INSTDIR\Input" 0 inputSyncDone
  IfFileExists "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0 inputSyncMissingExecutable

  DetailPrint "Synchronizing PNG Bundle Mockup Input assets before uninstall/update..."
  ExecWait '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --sync-input-backup' $R9
  IntCmp $R9 0 inputSyncDone inputSyncFailed inputSyncFailed

  inputSyncMissingExecutable:
    DetailPrint "Cannot preserve Input assets because the application executable is missing."
    ${IfNot} ${Silent}
      MessageBox MB_ICONSTOP|MB_OK "Cannot safely preserve the Input folder because PNG Bundle Mockup.exe is missing. Reinstall or back up Input manually before uninstalling."
    ${EndIf}
    Abort "Input backup executable is missing."

  inputSyncFailed:
    DetailPrint "Input asset synchronization failed with exit code $R9."
    ${IfNot} ${Silent}
      MessageBox MB_ICONSTOP|MB_OK "PNG Bundle Mockup could not back up the Input folder. The uninstall/update was stopped to protect your files."
    ${EndIf}
    Abort "Input backup failed with exit code $R9."

  inputSyncDone:
!macroend
