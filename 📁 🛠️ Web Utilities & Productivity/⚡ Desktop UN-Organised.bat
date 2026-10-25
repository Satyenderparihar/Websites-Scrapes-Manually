@echo off
set DESKTOP=%USERPROFILE%\Desktop

REM ---------- FILES WAPAS DESKTOP ----------
for %%F in (Images Documents Videos Music Archives Programs Others) do (
    if exist "%DESKTOP%\%%F" (
        move "%DESKTOP%\%%F\*" "%DESKTOP%\" >nul 2>&1
    )
)

REM ---------- EMPTY FOLDERS DELETE ----------
for /f "delims=" %%D in ('dir "%DESKTOP%" /ad /b') do (
    rd "%DESKTOP%\%%D" 2>nul
)

echo UN-ORGANISED DONE + Empty folders deleted 🙂
pause
