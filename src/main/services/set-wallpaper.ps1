param(
    [Parameter(Mandatory=$true)]
    [string]$ImagePath
)

if (-not (Test-Path $ImagePath)) {
    Write-Error "File not found: $ImagePath"
    exit 1
}

$code = @'
using System;
using System.Runtime.InteropServices;

public class DesktopWallpaper {
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
'@

if (-not ([System.Management.Automation.PSTypeName]'DesktopWallpaper').Type) {
    Add-Type -TypeDefinition $code
}

# 0x0014 = SPI_SETDESKWALLPAPER
# 0x01 | 0x02 = SPIF_UPDATEINIFILE | SPIF_SENDCHANGE
$result = [DesktopWallpaper]::SystemParametersInfo(0x0014, 0, $ImagePath, 0x03)
if ($result -eq 0) {
    Write-Error "SystemParametersInfo failed to apply wallpaper: $ImagePath"
    exit 1
}
Write-Output "Result: $result"
