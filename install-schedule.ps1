param([switch]$Remove)
$ErrorActionPreference = 'Stop'
$taskName = 'BotAds-Automation'
if ($Remove) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Output 'Đã gỡ lịch BotAds.'
    exit
}
$botRoot = $PSScriptRoot
$botConfig = Get-Content -LiteralPath (Join-Path $botRoot 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$botTime = if ($botConfig.schedule.time) { $botConfig.schedule.time } else { '09:00' }
$nodePath = (Get-Command node -ErrorAction Stop).Source
$scriptPath = Join-Path $botRoot 'scheduler.js'
$action = New-ScheduledTaskAction -Execute $nodePath -Argument ('"' + $scriptPath + '" --once') -WorkingDirectory $botRoot
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2)
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Output "Đã tạo lịch kiểm tra mỗi 5 phút; bot tự chọn $botTime và ngày chạy theo config.timezone. Cần đăng nhập Windows."
