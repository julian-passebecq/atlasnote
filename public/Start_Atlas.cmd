@echo off
cd /d "%~dp0"
echo Knowledge Atlas will open at http://127.0.0.1:4173
echo Keep this window open while reading. Press Ctrl+C to stop.
where node >nul 2>nul
if not errorlevel 1 (
  start "" http://127.0.0.1:4173
  node serve.mjs
  goto end
)
where py >nul 2>nul
if not errorlevel 1 (
  start "" http://127.0.0.1:4173
  py -m http.server 4173 --bind 127.0.0.1
  goto end
)
where python >nul 2>nul
if not errorlevel 1 (
  start "" http://127.0.0.1:4173
  python -m http.server 4173 --bind 127.0.0.1
  goto end
)
echo Install Node.js 22 or Python, then run this script again.
:end
pause
