@echo off
set DESKTOP=%USERPROFILE%\Desktop

for /f "delims=" %%D in ('dir "%DESKTOP%" /ad /b') do (
    rd "%DESKTOP%\%%D" 2>nul
)

echo Empty folders deleted successfully 🙂
pause
