[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media, ContentType = WindowsRuntime] | Out-Null

# 1. Native Windows Master Volume & CoreAudio Session Enumeration
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

public static class StdinListener {
    private static System.Collections.Concurrent.ConcurrentQueue<string> queue = new System.Collections.Concurrent.ConcurrentQueue<string>();
    private static System.Threading.Thread thread;

    public static void Start() {
        thread = new System.Threading.Thread(() => {
            try {
                string line;
                while ((line = Console.ReadLine()) != null) {
                    string trimmed = line.Trim();
                    if (!string.IsNullOrEmpty(trimmed)) {
                        queue.Enqueue(trimmed);
                    }
                }
            } catch {}
        });
        thread.IsBackground = true;
        thread.Start();
    }

    public static string Dequeue() {
        string res;
        if (queue.TryDequeue(out res)) {
            return res;
        }
        return null;
    }
}
'@

# 2. Async WinRT helper
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1

function Wait-Op($op, $type) {
    if ($null -eq $op) { return $null }
    try {
        $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($op))
        return $task.GetAwaiter().GetResult()
    } catch {
        return $null
    }
}

$mgr = $null
try {
    $mgr = Wait-Op ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
} catch {}

# 3. Start C# StdinListener for background command reading
[StdinListener]::Start()

$needsImmediateEmit = $false

if ($null -ne $mgr) {
    try {
        $mgr.add_CurrentSessionChanged({
            $script:needsImmediateEmit = $true
        }) | Out-Null
        $mgr.add_SessionsChanged({
            $script:needsImmediateEmit = $true
        }) | Out-Null
    } catch {}
}

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
    return [System.IO.Path]::GetFileNameWithoutExtension($id)
}

# 4. Multi-Session Discovery & State Retrieval
function Send-State() {
    try {
        $sources = [System.Collections.Generic.List[hashtable]]::new()
        $sessionList = [System.Collections.Generic.List[hashtable]]::new()
        $audioOutputs = [System.Collections.Generic.List[hashtable]]::new()
        $claimedPids = [System.Collections.Generic.HashSet[int]]::new()

        # Step A: Enumerate Core Audio Sessions across active endpoints
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

        # Step B: Enumerate Windows GSMTC Media Sessions
        if ($null -ne $mgr) {
            $rawSessions = $mgr.GetSessions()
            $sessionIndex = 0

            foreach ($s in $rawSessions) {
                $sessionIndex++
                try {
                    $appId = $s.SourceAppUserModelId
                    if ([string]::IsNullOrWhiteSpace($appId)) { continue }

                    # Stable unique session identifier
                    $sessionId = $appId
                    $existingCount = 0
                    foreach ($existing in $sessionList) {
                        if ($existing.appId -eq $appId) { $existingCount++ }
                    }
                    if ($existingCount -gt 0) {
                        $sessionId = "$appId-$($existingCount + 1)"
                    }

                    $info = $s.GetPlaybackInfo()
                    $statusStr = if ($info) { $info.PlaybackStatus.ToString() } else { "Closed" }
                    $isPlaying = ($statusStr -eq "Playing")

                    $propsOp = $s.TryGetMediaPropertiesAsync()
                    $props = Wait-Op $propsOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
                    $timeline = $s.GetTimelineProperties()

                    # Accurate real-time timeline position
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
                                if ($elapsed -gt 0) {
                                    $basePos += $elapsed
                                }
                            }
                            if ($dur -gt 0) {
                                $pos = [Math]::Max(0, [Math]::Min($dur, [Math]::Round($basePos)))
                            } else {
                                $pos = [Math]::Max(0, [Math]::Round($basePos))
                            }
                        }
                    }

                    $appName = Get-FriendlyAppName $appId
                    $title = if ($props -and $props.Title -and $props.Title.Trim().Length -gt 0) { $props.Title } else { "Active Playback" }
                    $artist = if ($props -and $props.Artist -and $props.Artist.Trim().Length -gt 0) { $props.Artist } else { $appName }
                    $album = if ($props -and $props.AlbumTitle) { $props.AlbumTitle } else { "" }

                    $ctrl = if ($info) { $info.Controls } else { $null }
                    $canPlay = $true
                    $canPause = $true
                    $canNext = if ($ctrl) { [bool]$ctrl.IsNextEnabled } else { $true }
                    $canPrev = if ($ctrl) { [bool]$ctrl.IsPreviousEnabled } else { $true }
                    $canToggle = $true
                    $canSeek = ($dur -gt 0)

                    # Match with audio session for per-app volume and audio peak
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

                    $sessionItem = @{
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
                    $sessionList.Add($sessionItem)

                    # Add to unified simultaneous sources list
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

        # Step C: Detect applications beyond GSMTC (Windows Core Audio Sessions)
        $knownMediaPlayers = @("vlc", "wmplayer", "mpv", "foobar2000", "potplayer", "aimp", "musicbee", "itunes", "kmplayer", "gomp", "audacity")
        $ignoreSystemProcs = @("audiodg", "shellexperiencehost", "idle", "system", "vadredirecthelper", "fxsound", "lghub_agent")

        foreach ($pa in $procAudio) {
            $pNameLower = $pa.ProcessName.ToLower()
            if ($claimedPids.Contains($pa.ProcessId)) { continue }
            if ($ignoreSystemProcs -contains $pNameLower) { continue }

            $isKnownPlayer = $knownMediaPlayers -contains $pNameLower
            $isProducingSound = ($pa.PeakLevel -gt 0.0001) -or ($pa.State -eq 1)

            if ($isProducingSound -or $isKnownPlayer) {
                $appName = Get-FriendlyAppName $pa.ProcessName
                $cleanTitle = if (-not [string]::IsNullOrWhiteSpace($pa.MainWindowTitle)) {
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
                    title = $cleanTitle
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

        # Read Windows Master System Volume
        $volPercent = [Math]::Max(0, [Math]::Min(100, [Math]::Round([CoreAudioNative]::MasterVolume * 100)))
        $isMuted = [CoreAudioNative]::MasterMute

        # Primary session for backward compatibility
        $primary = $null
        foreach ($sItem in $sessionList) {
            if ($sItem.isPlaying) {
                $primary = $sItem
                break
            }
        }
        if ($null -eq $primary -and $sessionList.Count -gt 0) {
            $primary = $sessionList[0]
        }

        $obj = @{
            type = "media"
            hasSession = ($sources.Count -gt 0)
            sources = @($sources)
            sessions = @($sessionList)
            activeSessionId = if ($primary) { $primary.sessionId } else { "" }
            audioOutputs = @($audioOutputs)
            volume = $volPercent
            isMuted = $isMuted
            # Legacy single session compatibility fields
            sessionId = if ($primary) { $primary.sessionId } else { "" }
            isPlaying = if ($primary) { $primary.isPlaying } else { $false }
            title = if ($primary) { $primary.title } else { "No media active" }
            artist = if ($primary) { $primary.artist } else { "Desktop Audio Idle" }
            album = if ($primary) { $primary.album } else { "" }
            app = if ($primary) { $primary.app } else { "" }
            status = if ($primary) { $primary.status } else { "Closed" }
            positionSec = if ($primary) { $primary.positionSec } else { 0 }
            durationSec = if ($primary) { $primary.durationSec } else { 0 }
            canPlay = if ($primary) { $primary.canPlay } else { $false }
            canPause = if ($primary) { $primary.canPause } else { $false }
            canNext = if ($primary) { $primary.canNext } else { $false }
            canPrev = if ($primary) { $primary.canPrev } else { $false }
            canToggle = if ($primary) { $primary.canToggle } else { $false }
            canSeek = if ($primary) { $primary.canSeek } else { $false }
        }

        [Console]::WriteLine(($obj | ConvertTo-Json -Compress -Depth 5))
    } catch {}
}

# Initial emit
Send-State

$lastCheck = [DateTime]::UtcNow

# 5. Main event / command processing loop
while ($true) {
    $handledCmd = $false

    while ($null -ne ($cmdRaw = [StdinListener]::Dequeue())) {
        try {
            $action = $cmdRaw
            $val = $null
            $targetSessionId = $null
            $targetProcessId = $null

            if ($cmdRaw.StartsWith("{")) {
                try {
                    $json = $cmdRaw | ConvertFrom-Json
                    $action = $json.action
                    $val = $json.value
                    $targetSessionId = $json.sessionId
                    if ($null -ne $json.processId) {
                        $targetProcessId = [int]$json.processId
                    }
                } catch {}
            } elseif ($cmdRaw -match "^volume\s+(\d+)$") {
                $action = "volume"
                $val = [int]$matches[1]
            } elseif ($cmdRaw -match "^mute\s+(true|false|toggle)$") {
                $action = "mute"
                $val = $matches[1]
            }

            if ($action -eq "volume" -and $null -ne $val) {
                $newVol = [Math]::Max([float]0.0, [Math]::Min([float]1.0, [float]($val / 100.0)))
                [CoreAudioNative]::MasterVolume = $newVol
                $handledCmd = $true
            } elseif ($action -eq "mute") {
                if ($val -eq "true" -or $val -eq $true) {
                    [CoreAudioNative]::MasterMute = $true
                } elseif ($val -eq "false" -or $val -eq $false) {
                    [CoreAudioNative]::MasterMute = $false
                } else {
                    [CoreAudioNative]::MasterMute = !([CoreAudioNative]::MasterMute)
                }
                $handledCmd = $true
            } elseif ($action -eq "app-volume" -and $null -ne $targetProcessId -and $null -ne $val) {
                $newVol = [Math]::Max([float]0.0, [Math]::Min([float]1.0, [float]($val / 100.0)))
                [CoreAudioNative]::SetProcessVolume($targetProcessId, $newVol) | Out-Null
                $handledCmd = $true
            } elseif ($action -eq "app-mute" -and $null -ne $targetProcessId) {
                $muteBool = if ($val -eq "true" -or $val -eq $true) { $true } elseif ($val -eq "false" -or $val -eq $false) { $false } else { $true }
                [CoreAudioNative]::SetProcessMute($targetProcessId, $muteBool) | Out-Null
                $handledCmd = $true
            } else {
                # Find the EXACT matching session for $targetSessionId
                $allSessions = if ($mgr) { $mgr.GetSessions() } else { @() }
                $targetSession = $null

                if ($targetSessionId) {
                    foreach ($s in $allSessions) {
                        $appId = $s.SourceAppUserModelId
                        if ($appId -eq $targetSessionId -or $targetSessionId.StartsWith($appId)) {
                            $targetSession = $s
                            break
                        }
                    }
                }

                if ($null -eq $targetSession -and $mgr) {
                    $targetSession = $mgr.GetCurrentSession()
                }

                if ($null -ne $targetSession) {
                    $info = $targetSession.GetPlaybackInfo()
                    $controls = if ($info) { $info.Controls } else { $null }
                    $timeline = $targetSession.GetTimelineProperties()
                    $pos = if ($timeline -and $timeline.Position) { $timeline.Position.TotalSeconds } else { 0 }
                    $dur = if ($timeline -and $timeline.EndTime) { $timeline.EndTime.TotalSeconds } else { 0 }
                    $isCurrentlyPlaying = if ($info) { $info.PlaybackStatus.ToString() -eq "Playing" } else { $false }

                    if ($action -eq "toggle") {
                        if ($isCurrentlyPlaying) {
                            $op = $targetSession.TryPauseAsync()
                            $res = Wait-Op $op ([System.Boolean])
                            if (-not $res) {
                                Wait-Op ($targetSession.TryTogglePlayPauseAsync()) ([System.Boolean]) | Out-Null
                            }
                        } else {
                            $op = $targetSession.TryPlayAsync()
                            $res = Wait-Op $op ([System.Boolean])
                            if (-not $res) {
                                Wait-Op ($targetSession.TryTogglePlayPauseAsync()) ([System.Boolean]) | Out-Null
                            }
                        }
                        $handledCmd = $true
                    } elseif ($action -eq "pause") {
                        $op = $targetSession.TryPauseAsync()
                        $res = Wait-Op $op ([System.Boolean])
                        if (-not $res) {
                            Wait-Op ($targetSession.TryTogglePlayPauseAsync()) ([System.Boolean]) | Out-Null
                        }
                        $handledCmd = $true
                    } elseif ($action -eq "play") {
                        $op = $targetSession.TryPlayAsync()
                        $res = Wait-Op $op ([System.Boolean])
                        if (-not $res) {
                            Wait-Op ($targetSession.TryTogglePlayPauseAsync()) ([System.Boolean]) | Out-Null
                        }
                        $handledCmd = $true
                    } elseif ($action -eq "next" -or $action -eq "forward") {
                        $skipped = $false
                        if ($controls -and $controls.IsNextEnabled) {
                            try {
                                $op = $targetSession.TrySkipNextAsync()
                                $skipped = [bool](Wait-Op $op ([System.Boolean]))
                            } catch {}
                        }
                        if (-not $skipped) {
                            $targetPos = $pos + 10
                            if ($dur -gt 0 -and $targetPos -gt $dur) { $targetPos = $dur }
                            $ticks = [long]($targetPos * 10000000)
                            try {
                                $op = $targetSession.TryChangePlaybackPositionAsync($ticks)
                                Wait-Op $op ([System.Boolean]) | Out-Null
                            } catch {}
                        }
                        $handledCmd = $true
                    } elseif ($action -eq "prev" -or $action -eq "backward") {
                        $skipped = $false
                        if ($controls -and $controls.IsPreviousEnabled) {
                            try {
                                $op = $targetSession.TrySkipPreviousAsync()
                                $skipped = [bool](Wait-Op $op ([System.Boolean]))
                            } catch {}
                        }
                        if (-not $skipped) {
                            $targetPos = [Math]::Max(0, $pos - 10)
                            $ticks = [long]($targetPos * 10000000)
                            try {
                                $op = $targetSession.TryChangePlaybackPositionAsync($ticks)
                                Wait-Op $op ([System.Boolean]) | Out-Null
                            } catch {}
                        }
                        $handledCmd = $true
                    } elseif ($action -eq "seek" -and $null -ne $val) {
                        $targetPos = [Math]::Max(0, [float]$val)
                        if ($dur -gt 0 -and $targetPos -gt $dur) { $targetPos = $dur }
                        $ticks = [long]($targetPos * 10000000)
                        try {
                            $op = $targetSession.TryChangePlaybackPositionAsync($ticks)
                            Wait-Op $op ([System.Boolean]) | Out-Null
                        } catch {}
                        $handledCmd = $true
                    }
                }
            }
        } catch {}
    }

    if ($handledCmd) {
        [System.Threading.Thread]::Sleep(80)
        Send-State
        $lastCheck = [DateTime]::UtcNow
        $needsImmediateEmit = $false
    } elseif ($needsImmediateEmit) {
        Send-State
        $lastCheck = [DateTime]::UtcNow
        $needsImmediateEmit = $false
    }

    # Emit status update: 600ms periodic for smooth real-time progress and meters
    $interval = 600
    if (([DateTime]::UtcNow - $lastCheck).TotalMilliseconds -ge $interval) {
        $lastCheck = [DateTime]::UtcNow
        Send-State
    }

    [System.Threading.Thread]::Sleep(40)
}
