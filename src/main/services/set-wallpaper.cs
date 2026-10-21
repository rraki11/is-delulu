using System;
using System.Runtime.InteropServices;

public class Program {
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);

    public static int Main(string[] args) {
        if (args == null || args.Length == 0) return 1;
        try {
            // 0x0014 = SPI_SETDESKWALLPAPER, 0x03 = SPIF_UPDATEINIFILE | SPIF_SENDCHANGE
            int result = SystemParametersInfo(0x0014, 0, args[0], 0x03);
            return result != 0 ? 0 : 2;
        } catch {
            return 3;
        }
    }
}
