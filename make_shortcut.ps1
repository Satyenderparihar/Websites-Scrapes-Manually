$desktop = [System.Environment]::GetFolderPath("Desktop")
$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut("$desktop\⚡ Manual Websites Agent.lnk")
$sc.TargetPath = "D:\Antigravity - Agent\🌐 Websites Scrapes Manually\⚡ Run Manual Websites Agent.bat"
$sc.WorkingDirectory = "D:\Antigravity - Agent\🌐 Websites Scrapes Manually"
$sc.Description = "1-Click Launch Autonomous Manual Websites Agent"
$sc.IconLocation = "$env:SystemRoot\System32\shell32.dll,13"
$sc.Save()
Write-Output "Shortcut created successfully"
