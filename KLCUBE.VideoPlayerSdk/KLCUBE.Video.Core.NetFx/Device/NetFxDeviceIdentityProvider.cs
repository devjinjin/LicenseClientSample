using KLCUBE.Video.Contracts.Abstractions;
using KLCUBE.Video.Contracts.Models;
using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Text;
using System.Threading.Tasks;

namespace KLCUBE.Video.Core.NetFx.Device
{
    public class NetFxDeviceIdentityProvider : IDeviceIdentityProvider
    {
        public DeviceIdentityInfo GetDeviceIdentity()
        {
            var machineGuid = GetMachineGuid();
            var macAddress = GetPrimaryMacAddress();
            var InternalIpAddress = GetLocalIpAddress();
            var hostName = Environment.MachineName;

            var fingerprintSource = string.Format(
                "{0}|{1}|{2}",
                machineGuid ?? string.Empty,
                macAddress ?? string.Empty,
                hostName ?? string.Empty);

            var fingerprint = DeviceFingerprintHelper.GenerateSha256(fingerprintSource);

            return new DeviceIdentityInfo
            {
                DeviceFingerprint = fingerprint,
                MachineGuid = machineGuid,
                MacAddress = macAddress,
                InternalIpAddress = InternalIpAddress,
                HostName = hostName
            };
        }

        private string GetMachineGuid()
        {
            try
            {
                using (var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Cryptography"))
                {
                    return key?.GetValue("MachineGuid")?.ToString();
                }
            }
            catch
            {
                return string.Empty;
            }
        }

        private string GetPrimaryMacAddress()
        {
            try
            {
                var nic = NetworkInterface.GetAllNetworkInterfaces()
                    .Where(x =>
                        x.OperationalStatus == OperationalStatus.Up &&
                        x.NetworkInterfaceType != NetworkInterfaceType.Loopback &&
                        x.GetPhysicalAddress() != null &&
                        x.GetPhysicalAddress().GetAddressBytes().Length > 0)
                    .OrderByDescending(x => x.Speed)
                    .FirstOrDefault();

                if (nic == null)
                {
                    return string.Empty;
                }

                return string.Join("-", nic.GetPhysicalAddress()
                    .GetAddressBytes()
                    .Select(b => b.ToString("X2")));
            }
            catch
            {
                return string.Empty;
            }
        }

        private string GetLocalIpAddress()
        {
            try
            {
                var host = Dns.GetHostEntry(Dns.GetHostName());

                var ip = host.AddressList
                    .FirstOrDefault(a => a.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork);

                return ip?.ToString() ?? string.Empty;
            }
            catch
            {
                return string.Empty;
            }
        }
    }
}
