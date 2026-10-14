Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Diagnostics;
using System.Collections.Generic;

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

public class AllAudioEndpointsTester {
    public static void Run() {
        var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
        IMMDeviceCollection coll = null;
        enumerator.EnumAudioEndpoints(0, 1, out coll);
        uint count = 0;
        coll.GetCount(out count);
        Console.WriteLine("Active Audio Endpoints Count: " + count);

        for (uint d = 0; d < count; d++) {
            IMMDevice dev = null;
            coll.Item(d, out dev);
            string devId = "";
            dev.GetId(out devId);
            Console.WriteLine("\nEndpoint #" + d + ": " + devId);

            var asmGuid = typeof(IAudioSessionManager2).GUID;
            object obj = null;
            if (dev.Activate(ref asmGuid, 23, 0, out obj) != 0 || obj == null) continue;
            var asm = obj as IAudioSessionManager2;
            if (asm == null) continue;

            IAudioSessionEnumerator sessionEnum = null;
            if (asm.GetSessionEnumerator(out sessionEnum) != 0 || sessionEnum == null) continue;
            int sCount = 0;
            sessionEnum.GetCount(out sCount);
            Console.WriteLine("  Audio sessions in this endpoint: " + sCount);

            for (int s = 0; s < sCount; s++) {
                IAudioSessionControl c = null;
                sessionEnum.GetSession(s, out c);
                var c2 = c as IAudioSessionControl2;
                uint pid = 0;
                if (c2 != null) c2.GetProcessId(out pid);
                string pName = "";
                try { pName = Process.GetProcessById((int)pid).ProcessName; } catch {}
                float peak = 0;
                var meter = c as IAudioMeterInformation;
                if (meter != null) meter.GetPeakValue(out peak);

                float vol = 0;
                bool mute = false;
                var sav = c as ISimpleAudioVolume;
                if (sav != null) {
                    sav.GetMasterVolume(out vol);
                    sav.GetMute(out mute);
                }

                int state = 0;
                c.GetState(out state);

                Console.WriteLine("    -> PID: " + pid + " (" + pName + ") | State: " + state + " | Peak: " + peak + " | Vol: " + (int)(vol*100) + "% | Mute: " + mute);
            }
        }
    }
}
'@

[AllAudioEndpointsTester]::Run()
