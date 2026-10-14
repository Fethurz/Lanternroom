#!/usr/bin/env python3
"""Builds "Install Lanternroom.cmd": one small file the owner double-clicks on Windows.

It runs embedded PowerShell that downloads Electron from GitHub, checks its SHA-256,
unpacks it to %LOCALAPPDATA%\\Lanternroom, writes main.js / package.json / icon.ico,
adds desktop + Start menu shortcuts and starts the program. Running it again repairs/updates.
Dry-run env vars: LR_DEST (install folder), LR_ZIP (use a local Electron zip),
LR_NOSHORTCUTS, LR_NOSTART.

Usage: python3 desktop/mkinstaller.py [out.cmd]
"""
import base64, io, os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
ELECTRON = "42.3.0"
ZIP_NAME = f"electron-v{ELECTRON}-win32-x64.zip"
ZIP_URL = f"https://github.com/electron/electron/releases/download/v{ELECTRON}/{ZIP_NAME}"
ZIP_SHA = "01889ff05a2852b86f34e274f0fd7dc41f31ccc500a8d4e07d43f4984b8cec9a"  # from the release's SHASUMS256.txt

def ico_bytes():
    img = Image.open(os.path.join(REPO, "icons", "icon-512.png")).convert("RGBA")
    buf = io.BytesIO()
    img.save(buf, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    return buf.getvalue()

def b64(b):
    s = base64.b64encode(b).decode()
    return "\n".join(s[i:i + 100] for i in range(0, len(s), 100))

MAIN = open(os.path.join(HERE, "main.js"), "rb").read()
PKG = b'{"name":"lanternroom","productName":"Lanternroom","version":"1.0.0","main":"main.js"}'

PS = r'''
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
function Say($t) { Write-Host "  $t" -ForegroundColor Yellow }
try {
  Write-Host ""
  Write-Host "  Installing Lanternroom..." -ForegroundColor Cyan
  Write-Host ""
  $dest = if ($env:LR_DEST) { $env:LR_DEST } else { Join-Path $env:LOCALAPPDATA 'Lanternroom' }
  $bin = Join-Path $dest 'bin'
  New-Item -ItemType Directory -Force -Path $dest | Out-Null

  Get-Process -Name 'Lanternroom' -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith($bin) } | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 600

  if ($env:LR_ZIP) { $zip = $env:LR_ZIP } else {
    $zip = Join-Path ([IO.Path]::GetTempPath()) '__ZIPNAME__'
    $ok = (Test-Path $zip) -and ((Get-FileHash $zip -Algorithm SHA256).Hash -eq '__ZIPSHA__')
    if (-not $ok) {
      Say 'Downloading the program window (about 140 MB, this can take a minute)...'
      Invoke-WebRequest -Uri '__ZIPURL__' -OutFile $zip -UseBasicParsing
    }
  }
  Say 'Checking the download is genuine...'
  if ((Get-FileHash $zip -Algorithm SHA256).Hash -ne '__ZIPSHA__') { Remove-Item $zip -Force -ErrorAction SilentlyContinue; throw 'The download was damaged. Please run this installer again.' }

  Say 'Unpacking...'
  if (Test-Path $bin) { Remove-Item $bin -Recurse -Force }
  Expand-Archive -Path $zip -DestinationPath $bin -Force
  Rename-Item (Join-Path $bin 'electron.exe') 'Lanternroom.exe'
  $res = Join-Path $bin 'resources'
  Remove-Item (Join-Path $res 'default_app.asar') -Force -ErrorAction SilentlyContinue
  $app = Join-Path $res 'app'
  New-Item -ItemType Directory -Force -Path $app | Out-Null
  [IO.File]::WriteAllBytes((Join-Path $app 'main.js'), [Convert]::FromBase64String((@'
__MAIN__
'@ -replace '\s','')))
  [IO.File]::WriteAllBytes((Join-Path $app 'package.json'), [Convert]::FromBase64String('__PKG__'))
  $icoBytes = [Convert]::FromBase64String((@'
__ICO__
'@ -replace '\s',''))
  [IO.File]::WriteAllBytes((Join-Path $app 'icon.ico'), $icoBytes)
  $ico = Join-Path $dest 'icon.ico'
  [IO.File]::WriteAllBytes($ico, $icoBytes)
  $exe = Join-Path $bin 'Lanternroom.exe'

  if (-not $env:LR_NOSHORTCUTS) {
    Say 'Adding shortcuts to your desktop and Start menu...'
    $sh = New-Object -ComObject WScript.Shell
    $places = @([Environment]::GetFolderPath('Desktop'), (Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs'))
    foreach ($p in $places) {
      $l = $sh.CreateShortcut((Join-Path $p 'Lanternroom.lnk'))
      $l.TargetPath = $exe; $l.WorkingDirectory = $bin; $l.IconLocation = "$ico,0"; $l.Description = 'Lanternroom'
      $l.Save()
    }
  }
  Write-Host ""
  Write-Host "  All done! Lanternroom is installed." -ForegroundColor Green
  if (-not $env:LR_NOSTART) { Start-Process $exe; Start-Sleep -Seconds 2 }
  exit 0
} catch {
  Write-Host ""
  Write-Host ("  Something went wrong: " + $_.Exception.Message) -ForegroundColor Red
  exit 1
}
'''

def build(out):
    ps = (PS.replace("__ZIPNAME__", ZIP_NAME).replace("__ZIPURL__", ZIP_URL).replace("__ZIPSHA__", ZIP_SHA.upper())
            .replace("__MAIN__", b64(MAIN)).replace("__PKG__", base64.b64encode(PKG).decode()).replace("__ICO__", b64(ico_bytes())))
    head = ("@echo off\r\n"
            "title Lanternroom installer\r\n"
            "set \"LR_SELF=%~f0\"\r\n"
            "powershell -NoProfile -ExecutionPolicy Bypass -Command \"$s=[IO.File]::ReadAllText($env:LR_SELF); $m='#'+'PSBEGIN'; iex $s.Substring($s.LastIndexOf($m)+$m.Length)\"\r\n"
            "if errorlevel 1 (echo. & pause)\r\n"
            "exit /b\r\n")
    body = head + "#PSBEGIN\r\n" + ps.replace("\r\n", "\n").replace("\n", "\r\n")
    with open(out, "wb") as f:
        f.write(body.encode("utf-8"))
    print(out, len(body), "bytes")

if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "Install Lanternroom.cmd")
