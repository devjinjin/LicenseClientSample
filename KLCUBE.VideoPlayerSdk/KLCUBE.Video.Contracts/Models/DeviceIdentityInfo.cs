namespace KLCUBE.Video.Contracts.Models
{
    public class DeviceIdentityInfo
    {
        public string DeviceFingerprint { get; set; }
        public string MachineGuid { get; set; }
        public string MacAddress { get; set; }
        public string InternalIpAddress { get; set; }
        public string HostName { get; set; }
    }
}