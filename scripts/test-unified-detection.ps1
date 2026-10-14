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

[Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionManager2 {
    int f(); int g();
    [PreserveSig]
    int GetSessionEnumerator(out IAudioSessionEnumerator SessionEnum);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDevice {
    int Activate(ref System.Guid id, int clsCtx, int activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object aev);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDeviceEnumerator {
    int f(); 
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
public class MMDeviceEnumeratorComObject {}

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
    [PreserveSig]
    int GetPeakValue(out float pfPeak);
}

[Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface ISimpleAudioVolume {
    [PreserveSig] int SetMasterVolume(float fLevel, System.Guid EventContext);
    [PreserveSig] int GetMasterVolume(out float pfLevel);
    [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid EventContext);
    [PreserveSig] int GetMute([MarshalAs(UnmanagedType.Bool)] out bool pbMute);
}

public class AudioProcessSession {
    public int ProcessId;
    public string Name;
    public string DisplayName;
    public float PeakLevel;
    public int Volume;
    public bool IsMuted;
    public bool IsActive;
}

public class CoreAudioHelper {
    public static List<AudioProcessSession> GetAudioSessions() {
        var list = new List<AudioProcessSession>();
        try {
            var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
            IMMDevice dev = null;
            if (enumerator.GetDefaultAudioEndpoint(0, 1, out dev) != 0 || dev == null) return list;

            var asmGuid = typeof(IAudioSessionManager2).GUID;
            object obj = null;
            if (dev.Activate(ref asmGuid, 23, 0, out obj) != 0 || obj == null) return list;

            var asm = obj as IAudioSessionManager2;
            if (asm == null) return list;

            IAudioSessionEnumerator sessionEnum = null;
            if (asm.GetSessionEnumerator(out sessionEnum) != 0 || sessionEnum == null) return list;

            int count = 0;
            sessionEnum.GetCount(out count);

            for (int i = 0; i < count; i++) {
                try {
                    IAudioSessionControl c = null;
                    if (sessionEnum.GetSession(i, out c) != 0 || c == null) continue;

                    var c2 = c as IAudioSessionControl2;
                    uint pid = 0;
                    if (c2 != null) {
                        c2.GetProcessId(out pid);
                    }
                    if (pid == 0) continue;

                    string pName = "";
                    string disp = "";
                    try {
                        var proc = Process.GetProcessById((int)pid);
                        pName = proc.ProcessName;
                        disp = proc.MainWindowTitle;
                    } catch {
                        pName = "Process " + pid;
                    }

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

                    int state = 0;
                    c.GetState(out state);

                    list.Add(new AudioProcessSession {
                        ProcessId = (int)pid,
                        Name = pName,
                        DisplayName = disp,
                        PeakLevel = peak,
                        Volume = (int)Math.Round(vol * 100),
                        IsMuted = mute,
                        IsActive = (state == 1) || (peak > 0.0001f)
                    });
                } catch {}
            }
        } catch {}
        return list;
    }

    public static bool SetProcessVolume(int pid, float volume) {
        try {
            var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
            IMMDevice dev = null;
            if (enumerator.GetDefaultAudioEndpoint(0, 1, out dev) != 0 || dev == null) return false;

            var asmGuid = typeof(IAudioSessionManager2).GUID;
            object obj = null;
            if (dev.Activate(ref asmGuid, 23, 0, out obj) != 0 || obj == null) return false;

            var asm = obj as IAudioSessionManager2;
            if (asm == null) return false;

            IAudioSessionEnumerator sessionEnum = null;
            if (asm.GetSessionEnumerator(out sessionEnum) != 0 || sessionEnum == null) return false;

            int count = 0;
            sessionEnum.GetCount(out count);

            for (int i = 0; i < count; i++) {
                IAudioSessionControl c = null;
                if (sessionEnum.GetSession(i, out c) != 0 || c == null) continue;
                var c2 = c as IAudioSessionControl2;
                if (c2 == null) continue;
                uint sessionPid = 0;
                c2.GetProcessId(out sessionPid);
                if ((int)sessionPid == pid) {
                    var sav = c as ISimpleAudioVolume;
                    if (sav != null) {
                        sav.SetMasterVolume(Math.Max(0.0f, Math.Min(1.0f, volume)), Guid.Empty);
                        return true;
                    }
                }
            }
        } catch {}
        return false;
    }

    public static bool SetProcessMute(int pid, bool mute) {
        try {
            var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
            IMMDevice dev = null;
            if (enumerator.GetDefaultAudioEndpoint(0, 1, out dev) != 0 || dev == null) return false;

            var asmGuid = typeof(IAudioSessionManager2).GUID;
            object obj = null;
            if (dev.Activate(ref asmGuid, 23, 0, out obj) != 0 || obj == null) return false;

            var asm = obj as IAudioSessionManager2;
            if (asm == null) return false;

            IAudioSessionEnumerator sessionEnum = null;
            if (asm.GetSessionEnumerator(out sessionEnum) != 0 || sessionEnum == null) return false;

            int count = 0;
            sessionEnum.GetCount(out count);

            for (int i = 0; i < count; i++) {
                IAudioSessionControl c = null;
                if (sessionEnum.GetSession(i, out c) != 0 || c == null) continue;
                var c2 = c as IAudioSessionControl2;
                if (c2 == null) continue;
                uint sessionPid = 0;
                c2.GetProcessId(out sessionPid);
                if ((int)sessionPid == pid) {
                    var sav = c as ISimpleAudioVolume;
                    if (sav != null) {
                        sav.SetMute(mute, Guid.Empty);
                        return true;
                    }
                }
            }
        } catch {}
        return false;
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
    } catch {
        return $null
    }
}

$mgr = Await-Op ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

$audioSessions = [CoreAudioHelper]::GetAudioSessions()
Write-Host "CoreAudio Sessions Count: $($audioSessions.Count)"
foreach ($a in $audioSessions) {
    Write-Host "  PID: $($a.ProcessId) | Name: $($a.Name) | Vol: $($a.Volume)% | Muted: $($a.IsMuted) | Peak: $($a.PeakLevel)"
}

if ($mgr) {
    $rawSessions = $mgr.GetSessions()
    Write-Host "`nGSMTC Sessions Count: $($rawSessions.Count)"
    foreach ($s in $rawSessions) {
        $props = Await-Op ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
        $info = $s.GetPlaybackInfo()
        Write-Host "  AppId: $($s.SourceAppUserModelId) | Title: $($props.Title) | Status: $($info.PlaybackStatus)"
    }
}
