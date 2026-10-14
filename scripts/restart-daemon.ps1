$procs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*gsmtc-daemon.ps1*" }
foreach ($p in $procs) {
    Write-Host "Terminating old daemon PID: $($p.ProcessId)"
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}
Write-Host "Done restarting daemon."
