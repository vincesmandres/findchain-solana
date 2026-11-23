param(
  [string]$Title = "FindChain",
  [string]$Message = "FindChain build status update."
)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$toast = New-Object System.Windows.Forms.NotifyIcon
$toast.Icon = [System.Drawing.SystemIcons]::Information
$toast.Visible = $true
$toast.BalloonTipTitle = $Title
$toast.BalloonTipText = $Message
$toast.ShowBalloonTip(8000)
Start-Sleep -Seconds 5
$toast.Dispose()
