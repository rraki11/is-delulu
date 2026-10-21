$proc = Start-Process -FilePath "C:\Program Files\Rainmeter\Rainmeter.exe" -WorkingDirectory "C:\Program Files\Rainmeter" -PassThru
Write-Output "Started PID: $($proc.Id)"
Start-Sleep -Seconds 2
Write-Output "After 2s - HasExited: $($proc.HasExited), ExitCode: $($proc.ExitCode)"
