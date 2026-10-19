# is-delulu Battery Monitor Daemon
# Lightweight, non-blocking Win32 battery status stream via kernel32!GetSystemPowerStatus,
# WinRT Windows.System.Power.PowerManager, and powrprof!PowerRegisterForEffectivePowerModeNotifications
# for Windows 10 & 11 Energy Saver state changes.
# Zero process-spawning overhead, runs continuously in background.

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Try loading WinRT PowerManager for modern Windows 10/11 notification events
try {
    [Windows.System.Power.PowerManager, Windows.System.Power, ContentType = WindowsRuntime] | Out-Null
} catch {}

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Collections.Concurrent;
using System.Threading;

public struct SYSTEM_POWER_STATUS {
    public byte ACLineStatus;
    public byte BatteryFlag;
    public byte BatteryLifePercent;
    public byte SystemStatusFlag;
    public int BatteryLifeTime;
    public int BatteryFullLifeTime;
}

public class Win32Power {
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool GetSystemPowerStatus(out SYSTEM_POWER_STATUS lpSystemPowerStatus);
}

public static class StdinListener {
    private static ConcurrentQueue<string> queue = new ConcurrentQueue<string>();
    private static Thread thread;
    public static AutoResetEvent WakeEvent = new AutoResetEvent(false);

    public static void Start() {
        thread = new Thread(() => {
            try {
                string line;
                while ((line = Console.ReadLine()) != null) {
                    string trimmed = line.Trim();
                    if (!string.IsNullOrEmpty(trimmed)) {
                        queue.Enqueue(trimmed);
                        WakeEvent.Set();
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

public enum EFFECTIVE_POWER_MODE {
    EffectivePowerModeBatterySaver = 0,
    EffectivePowerModeEnergySaverHighSavings = 0,
    EffectivePowerModeBetterBattery = 1,
    EffectivePowerModeEnergySaverStandard = 1,
    EffectivePowerModeBalanced = 2,
    EffectivePowerModeHighPerformance = 3,
    EffectivePowerModeMaxPerformance = 4,
    EffectivePowerModeGameMode = 5,
    EffectivePowerModeMixedReality = 6
}

public delegate void EffectivePowerModeCallback(EFFECTIVE_POWER_MODE Mode, IntPtr Context);

public class PowerModeWatcher {
    [DllImport("powrprof.dll", SetLastError = true)]
    public static extern uint PowerRegisterForEffectivePowerModeNotifications(
        uint Version,
        EffectivePowerModeCallback Callback,
        IntPtr Context,
        out IntPtr RegistrationHandle
    );

    [DllImport("powrprof.dll", SetLastError = true)]
    public static extern uint PowerUnregisterFromEffectivePowerModeNotifications(IntPtr RegistrationHandle);

    private static IntPtr _handle = IntPtr.Zero;
    private static EffectivePowerModeCallback _callback;
    public static volatile int CurrentMode = -1;
    public static volatile bool IsEnergySaver = false;

    public static void Start() {
        try {
            _callback = new EffectivePowerModeCallback((mode, context) => {
                CurrentMode = (int)mode;
                // In Windows SDK, Mode == 0 corresponds to EffectivePowerModeBatterySaver / EffectivePowerModeEnergySaverHighSavings
                bool active = (mode == EFFECTIVE_POWER_MODE.EffectivePowerModeBatterySaver);
                IsEnergySaver = active;
                StdinListener.WakeEvent.Set();
            });

            // Register for Version 1 (EFFECTIVE_POWER_MODE_V1 = 1)
            uint hr = PowerRegisterForEffectivePowerModeNotifications(1, _callback, IntPtr.Zero, out _handle);
            if (hr != 0) {
                // Fallback to Version 2
                PowerRegisterForEffectivePowerModeNotifications(2, _callback, IntPtr.Zero, out _handle);
            }
        } catch {}
    }

    public static void Stop() {
        if (_handle != IntPtr.Zero) {
            try {
                PowerUnregisterFromEffectivePowerModeNotifications(_handle);
            } catch {}
            _handle = IntPtr.Zero;
        }
    }
}
'@

[StdinListener]::Start()
[PowerModeWatcher]::Start()

# Register WinRT PowerManager event hooks to instantly wake the daemon
try {
    $script:rtHandler = [System.EventHandler[System.Object]]{
        param($s, $e)
        [StdinListener]::WakeEvent.Set()
    }
    [Windows.System.Power.PowerManager]::add_EnergySaverStatusChanged($script:rtHandler) | Out-Null
    [Windows.System.Power.PowerManager]::add_BatteryStatusChanged($script:rtHandler) | Out-Null
    [Windows.System.Power.PowerManager]::add_PowerSupplyStatusChanged($script:rtHandler) | Out-Null
} catch {}

function Get-EnergySaverThreshold() {
    try {
        $key = "HKLM:\SYSTEM\CurrentControlSet\Control\Power\User\PowerSchemes\*\de830923-a562-41af-a086-e3a2c6bad2da\e69653ca-cf7f-4f05-aa73-cb833fa90ad4"
        $val = Get-ItemPropertyValue -Path $key -Name "DCSettingIndex" -ErrorAction SilentlyContinue
        if ($val -ne $null) {
            return [int]$val
        }
    } catch {}
    return $null
}

$lastLine = -1
$lastPct = -1
$lastCharging = $null
$lastFullyCharged = $null
$lastEnergySaver = $null
$lastThreshold = -1
$lastMins = -1

function Emit-BatteryStatus([bool]$force = $false) {
    $status = New-Object SYSTEM_POWER_STATUS
    if ([Win32Power]::GetSystemPowerStatus([ref]$status)) {
        # ACLineStatus: 0 = Offline (battery), 1 = Online (AC), 255 = Unknown
        $ac = $status.ACLineStatus -eq 1
        $pct = if ($status.BatteryLifePercent -le 100) { [int]$status.BatteryLifePercent } else { $null }

        $threshold = Get-EnergySaverThreshold

        # Authoritative Windows 11 & Windows 10 Energy Saver detection:
        # 1. WinRT PowerManager.EnergySaverStatus == On (2)
        $isWinRtOn = $false
        try {
            $rtStatus = [Windows.System.Power.PowerManager]::EnergySaverStatus
            $isWinRtOn = ($rtStatus -eq [Windows.System.Power.EnergySaverStatus]::On)
        } catch {}

        # 2. Native Win32 GetSystemPowerStatus SystemStatusFlag (1 = Battery/Energy Saver ON, 0 = OFF)
        $isStatusFlagOn = ($status.SystemStatusFlag -eq 1)

        # 3. Registry override state: HKLM:\SYSTEM\CurrentControlSet\Control\Power\EnergySaverState (1 = ON, 2 = OFF)
        $regState = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power" -Name "EnergySaverState" -ErrorAction SilentlyContinue).EnergySaverState
        $isRegOn = ($regState -eq 1)

        # 4. Native PowerRegisterForEffectivePowerModeNotifications (Mode == 0: BatterySaver / EnergySaverHighSavings)
        $isNativeWatcher = [PowerModeWatcher]::IsEnergySaver

        # Energy Saver is active if ANY authoritative Windows power system reports it ON.
        # Note: We do NOT use automatic threshold calculation ($pct <= $threshold) to fabricate
        # Energy Saver state. We detect actual Windows state transitions.
        $energySaver = $isWinRtOn -or $isStatusFlagOn -or $isRegOn -or $isNativeWatcher

        # BatteryFlag: 8 = Charging, 128 = No system battery
        $isNoBattery = ($status.BatteryFlag -band 128) -ne 0
        if ($isNoBattery) {
            $pct = $null
            $charging = $false
            $fullyCharged = $false
        } else {
            # Charging status detected independently of battery percentage.
            # When connected to external power ($ac) or active charging bit is set, charging is true.
            $charging = $ac -or (($status.BatteryFlag -band 8) -ne 0)
            $fullyCharged = ($pct -ne $null -and $pct -ge 100) -or ($ac -and $pct -ne $null -and $pct -ge 99)
        }
        $secs = $status.BatteryLifeTime
        $mins = if (-not $ac -and -not $charging -and $secs -gt 0 -and $secs -lt 71582788) { [math]::Round($secs / 60) } else { $null }

        $changed = $force -or `
            ($status.ACLineStatus -ne $script:lastLine) -or `
            ($pct -ne $script:lastPct) -or `
            ($charging -ne $script:lastCharging) -or `
            ($fullyCharged -ne $script:lastFullyCharged) -or `
            ($energySaver -ne $script:lastEnergySaver) -or `
            ($threshold -ne $script:lastThreshold) -or `
            ($mins -ne $script:lastMins)

        if ($changed) {
            # Diagnostic stderr output on Energy Saver state transition
            if ($energySaver -ne $script:lastEnergySaver -and $script:lastEnergySaver -ne $null) {
                [Console]::Error.WriteLine("[battery-daemon] EnergySaver transition: $($script:lastEnergySaver) -> $energySaver (WinRT=$isWinRtOn, StatusFlag=$isStatusFlagOn, Reg=$isRegOn, Watcher=$isNativeWatcher, Mode=$([PowerModeWatcher]::CurrentMode), AC=$ac, Pct=$pct, Thresh=$threshold)")
            }

            $script:lastLine = $status.ACLineStatus
            $script:lastPct = $pct
            $script:lastCharging = $charging
            $script:lastFullyCharged = $fullyCharged
            $script:lastEnergySaver = $energySaver
            $script:lastThreshold = $threshold
            $script:lastMins = $mins

            $json = [PSCustomObject]@{
                type = "battery"
                percent = $pct
                isCharging = $charging
                isFullyCharged = $fullyCharged
                isOnAC = $ac
                isEnergySaver = $energySaver
                energySaverThreshold = $threshold
                minutesRemaining = $mins
            } | ConvertTo-Json -Compress

            [Console]::Out.WriteLine($json)
            [Console]::Out.Flush()
        }
    }
}

# Initial emit immediately
Emit-BatteryStatus -force $true

# Continuous loop monitoring Win32 power status and stdin queries
while ($true) {
    $shouldExit = $false
    while ($null -ne ($cmd = [StdinListener]::Dequeue())) {
        if ($cmd -eq "quit" -or $cmd -eq "exit") {
            $shouldExit = $true
            break
        }
        if ($cmd -eq "query" -or $cmd -eq "refresh") {
            Emit-BatteryStatus -force $true
        }
    }

    if ($shouldExit) {
        break
    }

    Emit-BatteryStatus -force $false
    # Wake up immediately when stdin query, WinRT event, or effective power mode change occurs, or poll every 500ms
    [StdinListener]::WakeEvent.WaitOne(500) | Out-Null
}

[PowerModeWatcher]::Stop()
