Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Diagnostics;

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

[Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionManager2 {
    int f(); int g();
    [PreserveSig] int GetSessionEnumerator(out IAudioSessionEnumerator SessionEnum);
}

[Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionEnumerator {
    [PreserveSig] int GetCount(out int SessionCount);
    [PreserveSig] int GetSession(int SessionIndex, out IAudioSessionControl Session);
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

[Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface ISimpleAudioVolume {
    [PreserveSig] int SetMasterVolume(float fLevel, System.Guid EventContext);
    [PreserveSig] int GetMasterVolume(out float pfLevel);
    [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid EventContext);
    [PreserveSig] int GetMute([MarshalAs(UnmanagedType.Bool)] out bool pbMute);
}

public class TestVol {
    public static bool SetVolume(int pid, float vol) {
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
                    int res = sav.SetMasterVolume(vol, Guid.Empty);
                    return res == 0;
                }
            }
        }
        return false;
    }
}
'@

$spotify = Get-Process spotify -ErrorAction SilentlyContinue | Select-Object -First 1
if ($spotify) {
    Write-Host "Found Spotify PID: $($spotify.Id)"
    $res = [TestVol]::SetVolume($spotify.Id, 0.85)
    Write-Host "SetVolume returned: $res"
} else {
    Write-Host "Spotify process not found"
}
