@echo off
set DESKTOP=%USERPROFILE%\Desktop

mkdir "%DESKTOP%\Images" 2>nul
mkdir "%DESKTOP%\Documents" 2>nul
mkdir "%DESKTOP%\Videos" 2>nul
mkdir "%DESKTOP%\Music" 2>nul
mkdir "%DESKTOP%\Archives" 2>nul
mkdir "%DESKTOP%\Programs" 2>nul
mkdir "%DESKTOP%\Others" 2>nul

REM ----- IMAGES -----
move "%DESKTOP%\*.jpg" "%DESKTOP%\Images" 2>nul
move "%DESKTOP%\*.jpeg" "%DESKTOP%\Images" 2>nul
move "%DESKTOP%\*.png" "%DESKTOP%\Images" 2>nul
move "%DESKTOP%\*.gif" "%DESKTOP%\Images" 2>nul
move "%DESKTOP%\*.webp" "%DESKTOP%\Images" 2>nul
move "%DESKTOP%\*.bmp" "%DESKTOP%\Images" 2>nul

REM ----- DOCUMENTS -----
move "%DESKTOP%\*.pdf" "%DESKTOP%\Documents" 2>nul
move "%DESKTOP%\*.doc*" "%DESKTOP%\Documents" 2>nul
move "%DESKTOP%\*.xls*" "%DESKTOP%\Documents" 2>nul
move "%DESKTOP%\*.ppt*" "%DESKTOP%\Documents" 2>nul
move "%DESKTOP%\*.txt" "%DESKTOP%\Documents" 2>nul
move "%DESKTOP%\*.csv" "%DESKTOP%\Documents" 2>nul
move "%DESKTOP%\*.json" "%DESKTOP%\Documents" 2>nul
move "%DESKTOP%\*.xml" "%DESKTOP%\Documents" 2>nul

REM ----- VIDEOS -----
move "%DESKTOP%\*.mp4" "%DESKTOP%\Videos" 2>nul
move "%DESKTOP%\*.mkv" "%DESKTOP%\Videos" 2>nul
move "%DESKTOP%\*.avi" "%DESKTOP%\Videos" 2>nul
move "%DESKTOP%\*.mov" "%DESKTOP%\Videos" 2>nul

REM ----- MUSIC -----
move "%DESKTOP%\*.mp3" "%DESKTOP%\Music" 2>nul
move "%DESKTOP%\*.wav" "%DESKTOP%\Music" 2>nul
move "%DESKTOP%\*.aac" "%DESKTOP%\Music" 2>nul

REM ----- ARCHIVES -----
move "%DESKTOP%\*.zip" "%DESKTOP%\Archives" 2>nul
move "%DESKTOP%\*.rar" "%DESKTOP%\Archives" 2>nul
move "%DESKTOP%\*.7z" "%DESKTOP%\Archives" 2>nul
move "%DESKTOP%\*.tar" "%DESKTOP%\Archives" 2>nul

REM ----- PROGRAM FILES (EXE but NOT shortcuts) -----
move "%DESKTOP%\*.exe" "%DESKTOP%\Programs" 2>nul
move "%DESKTOP%\*.msi" "%DESKTOP%\Programs" 2>nul

REM ----- EVERYTHING ELSE (EXCEPT SHORTCUTS & FOLDERS) -----
for %%F in ("%DESKTOP%\*") do (
  if not "%%~xF"==".lnk" if not exist "%%F\" (
    move "%%F" "%DESKTOP%\Others" >nul 2>&1
  )
)

echo Desktop organised. Installed apps safe 😄✔️
pause
