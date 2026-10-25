$desktopPath = [System.Environment]::GetFolderPath('Desktop')
$targetBat = "D:\Antigravity - Agent\🌐 Websites Scrapes Manually\⚡ Run Manual Websites Agent.bat"
$shortcutPath = Join-Path $desktopPath "⚡ Manual Websites Agent.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $targetBat
$Shortcut.WorkingDirectory = "D:\Antigravity - Agent\🌐 Websites Scrapes Manually"
$Shortcut.Description = "1-Click Launch Autonomous Manual Websites Agent & Curated Hub"
$Shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,13"
$Shortcut.Save()

Write-Output "✅ Desktop Shortcut successfully created: $shortcutPath -> $targetBat"
