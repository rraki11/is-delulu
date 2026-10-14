[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media, ContentType = WindowsRuntime] | Out-Null

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Diagnostics;
using System.Collections.Generic;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioEndpointVolume {
    int f(); int g(); int h(); int i();
    int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
    int j();
    int GetMasterVolumeLevelScalar(out float pfLevel);
    int k(); int l(); int m(); int n();
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid pguidEventContext);
    int GetMute(out bool pbMute);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDevice {
    int Activate(ref System.Guid id, int clsCtx, int activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object aev);
    int OpenPropertyStore(int stgmAccess, out IntPtr ppProperties);
    int GetId([MarshalAs(UnmanagedType.LPWStr)] out string ppstrId);
    int GetState(out int pdwState);
}

[Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDeviceCollection {
    int GetCount(out uint pcDevices);
    int Item(uint nDevice, out IMMDevice ppDevice);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDeviceEnumerator {
    int EnumAudioEndpoints(int dataFlow, int dwStateMask, out IMMDeviceCollection ppDevices);
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
public class MMDeviceEnumeratorComObject {}

[Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionManager2 {
    int f(); int g();
    [PreserveSig]
    int GetSessionEnumerator(out IAudioSessionEnumerator SessionEnum);
}

[Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionEnumerator {
    [PreserveSig]
    int GetCount(out int SessionCount);
    [PreserveSig]
    int GetSession(int SessionIndex, out IAudioSessionControl Session);
}

[Guid("F4B1A599-7266-4319-A8CA-E70ACB11E8CD"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionControl {
    [PreserveSig] int GetState(out int pRetVal);
    [PreserveSig] int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    [PreserveSig] int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string Value, System.Guid EventContext);
    [PreserveSig] int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    [PreserveSig] int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string Value, System.Guid EventContext);
    [PreserveSig] int GetGroupingParam(out System.Guid pRetVal);
    [PreserveSig] int SetGroupingParam(System.Guid Override, System.Guid EventContext);
    [PreserveSig] int RegisterAudioSessionNotification(IntPtr NewNotifications);
    [PreserveSig] int UnregisterAudioSessionNotification(IntPtr NewNotifications);
}

[Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionControl2 {
    [PreserveSig] int GetState(out int pRetVal);
    [PreserveSig] int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    [PreserveSig] int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string Value, System.Guid EventContext);
    [PreserveSig] int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    [PreserveSig] int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string Value, System.Guid EventContext);
    [PreserveSig] int GetGroupingParam(out System.Guid pRetVal);
    [PreserveSig] int SetGroupingParam(System.Guid Override, System.Guid EventContext);
    [PreserveSig] int RegisterAudioSessionNotification(IntPtr NewNotifications);
    [PreserveSig] int UnregisterAudioSessionNotification(IntPtr NewNotifications);
    [PreserveSig] int GetSessionIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    [PreserveSig] int GetSessionInstanceIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    [PreserveSig] int GetProcessId(out uint pRetVal);
    [PreserveSig] int IsSystemSoundsSession();
    [PreserveSig] int SetDuckingPreference([MarshalAs(UnmanagedType.Bool)] bool optOut);
}

[Guid("C02216F6-0388-4E45-AC51-76A3BE7D38F9"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioMeterInformation {
    [PreserveSig] int GetPeakValue(out float pfPeak);
}

[Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface ISimpleAudioVolume {
    [PreserveSig] int SetMasterVolume(float fLevel, System.Guid EventContext);
    [PreserveSig] int GetMasterVolume(out float pfLevel);
    [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid EventContext);
    [PreserveSig] int GetMute([MarshalAs(UnmanagedType.Bool)] out bool pbMute);
}

public class AudioProcessInfo {
    public int ProcessId;
    public string ProcessName;
    public string MainWindowTitle;
    public float PeakLevel;
    public int Volume;
    public bool IsMuted;
    public int State; // 0=Inactive, 1=Active, 2=Expired
}

public class CoreAudioNative {
    private static IAudioEndpointVolume GetMasterVol() {
        var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
        IMMDevice dev = null;
        Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out dev));
        object obj = null;
        var epvid = typeof(IAudioEndpointVolume).GUID;
        Marshal.ThrowExceptionForHR(dev.Activate(ref epvid, 23, 0, out obj));
        return obj as IAudioEndpointVolume;
    }

    public static float MasterVolume {
        get {
            try {
                float v = -1;
                Marshal.ThrowExceptionForHR(GetMasterVol().GetMasterVolumeLevelScalar(out v));
                return v;
            } catch { return 0.5f; }
        }
        set {
            try {
                Marshal.ThrowExceptionForHR(GetMasterVol().SetMasterVolumeLevelScalar(value, System.Guid.Empty));
            } catch {}
        }
    }

    public static bool MasterMute {
        get {
            try {
                bool m;
                Marshal.ThrowExceptionForHR(GetMasterVol().GetMute(out m));
                return m;
            } catch { return false; }
        }
        set {
            try {
                Marshal.ThrowExceptionForHR(GetMasterVol().SetMute(value, System.Guid.Empty));
            } catch {}
        }
    }

    public static List<AudioProcessInfo> GetProcessAudioSessions() {
        var map = new Dictionary<int, AudioProcessInfo>();
        try {
            var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
            IMMDeviceCollection coll = null;
            if (enumerator.EnumAudioEndpoints(0, 1, out coll) != 0 || coll == null) return new List<AudioProcessInfo>();
            uint devCount = 0;
            coll.GetCount(out devCount);

            var asmGuid = typeof(IAudioSessionManager2).GUID;

            for (uint d = 0; d < devCount; d++) {
                try {
                    IMMDevice dev = null;
                    if (coll.Item(d, out dev) != 0 || dev == null) continue;
                    object obj = null;
                    if (dev.Activate(ref asmGuid, 23, 0, out obj) != 0 || obj == null) continue;
                    var asm = obj as IAudioSessionManager2;
                    if (asm == null) continue;

                    IAudioSessionEnumerator sessionEnum = null;
                    if (asm.GetSessionEnumerator(out sessionEnum) != 0 || sessionEnum == null) continue;
                    int sCount = 0;
                    sessionEnum.GetCount(out sCount);

                    for (int s = 0; s < sCount; s++) {
                        try {
                            IAudioSessionControl c = null;
                            if (sessionEnum.GetSession(s, out c) != 0 || c == null) continue;
                            var c2 = c as IAudioSessionControl2;
                            if (c2 == null) continue;

                            uint pid = 0;
                            c2.GetProcessId(out pid);
                            if (pid == 0) continue;

                            int state = 0;
                            c.GetState(out state);

                            float peak = 0;
                            var meter = c as IAudioMeterInformation;
                            if (meter != null) {
                                try { meter.GetPeakValue(out peak); } catch {}
                            }

                            float vol = 1.0f;
                            bool mute = false;
                            var sav = c as ISimpleAudioVolume;
                            if (sav != null) {
                                try { sav.GetMasterVolume(out vol); } catch {}
                                try { sav.GetMute(out mute); } catch {}
                            }

                            int pIdInt = (int)pid;
                            if (!map.ContainsKey(pIdInt)) {
                                string pName = "";
                                string winTitle = "";
                                try {
                                    var proc = Process.GetProcessById(pIdInt);
                                    pName = proc.ProcessName;
                                    winTitle = proc.MainWindowTitle;
                                } catch {
                                    pName = "Process " + pid;
                                }

                                map[pIdInt] = new AudioProcessInfo {
                                    ProcessId = pIdInt,
                                    ProcessName = pName,
                                    MainWindowTitle = winTitle,
                                    PeakLevel = peak,
                                    Volume = (int)Math.Round(vol * 100),
                                    IsMuted = mute,
                                    State = state
                                };
                            } else {
                                // If already seen on another device endpoint, take highest peak or active state
                                if (peak > map[pIdInt].PeakLevel) {
                                    map[pIdInt].PeakLevel = peak;
                                }
                                if (state == 1) {
                                    map[pIdInt].State = 1;
                                }
                            }
                        } catch {}
                    }
                } catch {}
            }
        } catch {}
        return new List<AudioProcessInfo>(map.Values);
    }

    public static bool SetProcessVolume(int targetPid, float volumeLevel) {
        try {
            var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
            IMMDeviceCollection coll = null;
            if (enumerator.EnumAudioEndpoints(0, 1, out coll) != 0 || coll == null) return false;
            uint devCount = 0;
            coll.GetCount(out devCount);
            var asmGuid = typeof(IAudioSessionManager2).GUID;
            bool success = false;

            for (uint d = 0; d < devCount; d++) {
                try {
                    IMMDevice dev = null;
                    if (coll.Item(d, out dev) != 0 || dev == null) continue;
                    object obj = null;
                    if (dev.Activate(ref asmGuid, 23, 0, out obj) != 0 || obj == null) continue;
                    var asm = obj as IAudioSessionManager2;
                    if (asm == null) continue;
                    IAudioSessionEnumerator sessionEnum = null;
                    if (asm.GetSessionEnumerator(out sessionEnum) != 0 || sessionEnum == null) continue;
                    int sCount = 0;
                    sessionEnum.GetCount(out sCount);

                    for (int s = 0; s < sCount; s++) {
                        IAudioSessionControl c = null;
                        if (sessionEnum.GetSession(s, out c) != 0 || c == null) continue;
                        var c2 = c as IAudioSessionControl2;
                        if (c2 == null) continue;
                        uint pid = 0;
                        c2.GetProcessId(out pid);
                        if ((int)pid == targetPid) {
                            var sav = c as ISimpleAudioVolume;
                            if (sav != null) {
                                sav.SetMasterVolume(Math.Max(0.0f, Math.Min(1.0f, volumeLevel)), Guid.Empty);
                                success = true;
                            }
                        }
                    }
                } catch {}
            }
            return success;
        } catch { return false; }
    }

    public static bool SetProcessMute(int targetPid, bool mute) {
        try {
            var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
            IMMDeviceCollection coll = null;
            if (enumerator.EnumAudioEndpoints(0, 1, out coll) != 0 || coll == null) return false;
            uint devCount = 0;
            coll.GetCount(out devCount);
            var asmGuid = typeof(IAudioSessionManager2).GUID;
            bool success = false;

            for (uint d = 0; d < devCount; d++) {
                try {
                    IMMDevice dev = null;
                    if (coll.Item(d, out dev) != 0 || dev == null) continue;
                    object obj = null;
                    if (dev.Activate(ref asmGuid, 23, 0, out obj) != 0 || obj == null) continue;
                    var asm = obj as IAudioSessionManager2;
                    if (asm == null) continue;
                    IAudioSessionEnumerator sessionEnum = null;
                    if (asm.GetSessionEnumerator(out sessionEnum) != 0 || sessionEnum == null) continue;
                    int sCount = 0;
                    sessionEnum.GetCount(out sCount);

                    for (int s = 0; s < sCount; s++) {
                        IAudioSessionControl c = null;
                        if (sessionEnum.GetSession(s, out c) != 0 || c == null) continue;
                        var c2 = c as IAudioSessionControl2;
                        if (c2 == null) continue;
                        uint pid = 0;
                        c2.GetProcessId(out pid);
                        if ((int)pid == targetPid) {
                            var sav = c as ISimpleAudioVolume;
                            if (sav != null) {
                                sav.SetMute(mute, Guid.Empty);
                                success = true;
                            }
                        }
                    }
                } catch {}
            }
            return success;
        } catch { return false; }
    }
}
'@

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1

function Await-Op($op, $type) {
    if ($null -eq $op) { return $null }
    try {
        $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($op))
        return $task.GetAwaiter().GetResult()
    } catch { return $null }
}

$mgr = Await-Op ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

function Get-FriendlyAppName($id) {
    if ([string]::IsNullOrWhiteSpace($id)) { return "Media Player" }
    if ($id -match "Brave") { return "Brave" }
    if ($id -match "Chrome") { return "Chrome" }
    if ($id -match "Spotify") { return "Spotify" }
    if ($id -match "msedge") { return "Edge" }
    if ($id -match "Firefox") { return "Firefox" }
    if ($id -match "AppleMusic") { return "Apple Music" }
    if ($id -match "VLC") { return "VLC media player" }
    if ($id -match "foobar") { return "foobar2000" }
    # Strip path or extension if present
    $name = [System.IO.Path]::GetFileNameWithoutExtension($id)
    return $name
}

function Emit-FullState() {
    $sources = [System.Collections.Generic.List[hashtable]]::new()
    $sessions = [System.Collections.Generic.List[hashtable]]::new()
    $audioOutputs = [System.Collections.Generic.List[hashtable]]::new()
    $claimedPids = [System.Collections.Generic.HashSet[int]]::new()

    # 1. Query CoreAudio Sessions
    $procAudio = [CoreAudioNative]::GetProcessAudioSessions()
    foreach ($pa in $procAudio) {
        $audioOutputs.Add(@{
            processId = $pa.ProcessId
            name = $pa.ProcessName
            displayName = $pa.MainWindowTitle
            peakLevel = [Math]::Round($pa.PeakLevel, 3)
            volume = $pa.Volume
            isMuted = $pa.IsMuted
            isActive = ($pa.State -eq 1) -or ($pa.PeakLevel -gt 0.0001)
        })
    }

    # 2. Query Windows GSMTC Media Sessions
    if ($mgr) {
        $rawSessions = $mgr.GetSessions()
        $idx = 0
        foreach ($s in $rawSessions) {
            $idx++
            try {
                $appId = $s.SourceAppUserModelId
                if ([string]::IsNullOrWhiteSpace($appId)) { continue }

                $sessionId = $appId
                $existingCount = 0
                foreach ($existing in $sessions) {
                    if ($existing.appId -eq $appId) { $existingCount++ }
                }
                if ($existingCount -gt 0) {
                    $sessionId = "$appId-$($existingCount + 1)"
                }

                $info = $s.GetPlaybackInfo()
                $statusStr = if ($info) { $info.PlaybackStatus.ToString() } else { "Closed" }
                $isPlaying = ($statusStr -eq "Playing")

                $propsOp = $s.TryGetMediaPropertiesAsync()
                $props = Await-Op $propsOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
                $timeline = $s.GetTimelineProperties()

                $pos = 0
                $dur = 0
                if ($timeline) {
                    if ($timeline.EndTime) {
                        $dur = [Math]::Max(0, [Math]::Round($timeline.EndTime.TotalSeconds))
                    }
                    if ($timeline.Position) {
                        $basePos = $timeline.Position.TotalSeconds
                        if ($isPlaying -and $timeline.LastUpdatedTime) {
                            $elapsed = ([DateTimeOffset]::UtcNow - $timeline.LastUpdatedTime).TotalSeconds
                            if ($elapsed -gt 0) { $basePos += $elapsed }
                        }
                        if ($dur -gt 0) {
                            $pos = [Math]::Max(0, [Math]::Min($dur, [Math]::Round($basePos)))
                        } else {
                            $pos = [Math]::Max(0, [Math]::Round($basePos))
                        }
                    }
                }

                $appName = Get-FriendlyAppName $appId
                $title = if ($props -and $props.Title -and $props.Title.Trim().Length -gt 0) { $props.Title } else { "Active Media" }
                $artist = if ($props -and $props.Artist -and $props.Artist.Trim().Length -gt 0) { $props.Artist } else { $appName }
                $album = if ($props -and $props.AlbumTitle) { $props.AlbumTitle } else { "" }

                $ctrl = if ($info) { $info.Controls } else { $null }
                $canPlay = $true
                $canPause = $true
                $canNext = if ($ctrl) { [bool]$ctrl.IsNextEnabled } else { $true }
                $canPrev = if ($ctrl) { [bool]$ctrl.IsPreviousEnabled } else { $true }
                $canToggle = $true
                $canSeek = ($dur -gt 0)

                # Match with audio session for PID, per-app volume and peak level
                $matchedPid = $null
                $appVol = 100
                $appMuted = $false
                $peak = 0.0

                foreach ($pa in $procAudio) {
                    $pNameLower = $pa.ProcessName.ToLower()
                    $appIdLower = $appId.ToLower()
                    $isMatch = $false

                    if ($appIdLower -like "*$pNameLower*" -or $pNameLower -like "*$appIdLower*") {
                        $isMatch = $true
                    } elseif ($appIdLower -match "spotify" -and $pNameLower -match "spotify") {
                        $isMatch = $true
                    } elseif ($appIdLower -match "brave" -and $pNameLower -match "brave") {
                        $isMatch = $true
                    } elseif ($appIdLower -match "chrome" -and $pNameLower -match "chrome") {
                        $isMatch = $true
                    } elseif ($appIdLower -match "vlc" -and $pNameLower -match "vlc") {
                        $isMatch = $true
                    }

                    if ($isMatch) {
                        $matchedPid = $pa.ProcessId
                        $appVol = $pa.Volume
                        $appMuted = $pa.IsMuted
                        $peak = [Math]::Round($pa.PeakLevel, 3)
                        $claimedPids.Add($pa.ProcessId) | Out-Null
                        break
                    }
                }

                $sessionObj = @{
                    sessionId = $sessionId
                    appId = $appId
                    app = $appName
                    title = $title
                    artist = $artist
                    album = $album
                    status = $statusStr
                    isPlaying = $isPlaying
                    positionSec = $pos
                    durationSec = $dur
                    canPlay = $canPlay
                    canPause = $canPause
                    canNext = $canNext
                    canPrev = $canPrev
                    canToggle = $canToggle
                    canSeek = $canSeek
                    appVolume = $appVol
                    isAppMuted = $appMuted
                    processId = $matchedPid
                    lastUpdated = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                }
                $sessions.Add($sessionObj)

                # Add to unified sources list
                $sources.Add(@{
                    id = $sessionId
                    sourceType = "media-session"
                    appId = $appId
                    appName = $appName
                    title = $title
                    artist = $artist
                    album = $album
                    status = $statusStr
                    isPlaying = $isPlaying
                    isAudioActive = ($isPlaying -or $peak -gt 0.001)
                    peakLevel = $peak
                    positionSec = $pos
                    durationSec = $dur
                    canPlay = $canPlay
                    canPause = $canPause
                    canNext = $canNext
                    canPrev = $canPrev
                    canToggle = $canToggle
                    canSeek = $canSeek
                    canVolume = ($null -ne $matchedPid)
                    appVolume = $appVol
                    isAppMuted = $appMuted
                    processId = $matchedPid
                    lastUpdated = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                })
            } catch {}
        }
    }

    # 3. Add Non-GSMTC Audio Sessions as Audio-Only Sources
    $knownMediaPlayers = @("vlc", "wmplayer", "mpv", "foobar2000", "potplayer", "aimp", "musicbee", "itunes", "kmplayer", "gomp", "audacity")
    $ignoreSystemProcs = @("audiodg", "shellexperiencehost", "idle", "system", "vadredirecthelper", "fxsound", "lghub_agent")

    foreach ($pa in $procAudio) {
        $pNameLower = $pa.ProcessName.ToLower()
        if ($claimedPids.Contains($pa.ProcessId)) { continue }
        if ($ignoreSystemProcs -contains $pNameLower) { continue }

        $isKnownPlayer = $knownMediaPlayers -contains $pNameLower
        $isProducingSound = ($pa.PeakLevel -gt 0.0001) -or ($pa.State -eq 1)

        # Include if producing sound or is a recognized media player
        if ($isProducingSound -or $isKnownPlayer) {
            $appName = Get-FriendlyAppName $pa.ProcessName
            $title = if (-not [string]::IsNullOrWhiteSpace($pa.MainWindowTitle)) {
                $t = $pa.MainWindowTitle
                if ($t.EndsWith(" - VLC media player")) {
                    $t = $t.Substring(0, $t.Length - 19)
                }
                $t
            } else {
                "$appName Audio Stream"
            }

            $status = if ($pa.PeakLevel -gt 0.001) { "Audible" } elseif ($pa.State -eq 1) { "Audio Active" } else { "Idle Audio" }

            $sources.Add(@{
                id = "audio:$($pa.ProcessId)"
                sourceType = "audio-session"
                appId = $pa.ProcessName
                appName = $appName
                title = $title
                artist = "Audio Session (No GSMTC)"
                album = ""
                status = $status
                isPlaying = $isProducingSound
                isAudioActive = $isProducingSound
                peakLevel = [Math]::Round($pa.PeakLevel, 3)
                positionSec = 0
                durationSec = 0
                canPlay = $false
                canPause = $false
                canNext = $false
                canPrev = $false
                canToggle = $false
                canSeek = $false
                canVolume = $true
                appVolume = $pa.Volume
                isAppMuted = $pa.IsMuted
                processId = $pa.ProcessId
                lastUpdated = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
            })
        }
    }

    $masterVol = [Math]::Round([CoreAudioNative]::MasterVolume * 100)
    $masterMute = [CoreAudioNative]::MasterMute

    $res = @{
        type = "media"
        hasSession = ($sources.Count -gt 0)
        sources = @($sources)
        sessions = @($sessions)
        audioOutputs = @($audioOutputs)
        volume = $masterVol
        isMuted = $masterMute
    }

    return ($res | ConvertTo-Json -Depth 5)
}

$output = Emit-FullState
Write-Host $output
