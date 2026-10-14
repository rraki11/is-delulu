[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType = WindowsRuntime] | Out-Null

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1

function Await-Op($op, $type) {
    if ($null -eq $op) { return $null }
    try {
        $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($op))
        return $task.GetAwaiter().GetResult()
    } catch {
        return $null
    }
}

$mgr = Await-Op ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$sessions = $mgr.GetSessions()
Write-Host "Sessions count: $($sessions.Count)"
foreach ($s in $sessions) {
    $info = $s.GetPlaybackInfo()
    $props = Await-Op ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    Write-Host "Session: App=$($s.SourceAppUserModelId) Title=$($props.Title) Status=$($info.PlaybackStatus)"
    
    # Try Pause
    Write-Host "Calling TryPauseAsync on $($s.SourceAppUserModelId)..."
    $resPause = Await-Op ($s.TryPauseAsync()) ([System.Boolean])
    Write-Host "TryPauseAsync returned: $resPause"
    Start-Sleep -Milliseconds 300
    Write-Host "New status after TryPauseAsync: $($s.GetPlaybackInfo().PlaybackStatus)"

    # Try Toggle
    Write-Host "Calling TryTogglePlayPauseAsync on $($s.SourceAppUserModelId)..."
    $resToggle = Await-Op ($s.TryTogglePlayPauseAsync()) ([System.Boolean])
    Write-Host "TryTogglePlayPauseAsync returned: $resToggle"
    Start-Sleep -Milliseconds 300
    Write-Host "New status after TryTogglePlayPauseAsync: $($s.GetPlaybackInfo().PlaybackStatus)"
}
