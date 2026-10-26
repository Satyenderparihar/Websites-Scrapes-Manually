@echo off
chcp 65001 >nul
title Sync Repo & Clean README Links
echo ========================================================
echo   🔄 Git Pull, Broken Link Cleanup & Auto-Sync Runner
echo ========================================================
echo.

cd /d "D:\Antigravity - Agent\🌐 Websites Scrapes Manually"

echo [1/3] Pulling latest changes from GitHub...
git pull --rebase origin main

echo.
echo [2/3] Checking & Cleaning dead links in READMEs...
python sync_all_readmes.py

echo.
echo [3/3] Checking git status and pushing updates...
git add .
git diff --staged --quiet
if errorlevel 1 (
    git commit -m "chore: auto-sync READMEs and clean deleted file links"
    git push origin main
    echo.
    echo ✅ Repository and READMEs are 100%% synced and pushed to GitHub!
) else (
    echo.
    echo ✅ Everything is already up-to-date. No changes needed.
)

echo.
echo ========================================================
echo   ✨ Completed Successfully!
echo ========================================================
pause
