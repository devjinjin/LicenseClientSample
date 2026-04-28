using System.Security.Cryptography;
using System.Text;

namespace KLCUBE.Video.Core.NetFx.Device
{
    public static class DeviceFingerprintHelper
    {
        public static string GenerateSha256(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                return string.Empty;
            }

            using (var sha = SHA256.Create())
            {
                var bytes = Encoding.UTF8.GetBytes(raw);
                var hash = sha.ComputeHash(bytes);

                var sb = new StringBuilder();
                foreach (var b in hash)
                {
                    sb.Append(b.ToString("x2"));
                }

                return sb.ToString();
            }
        }
    }
}