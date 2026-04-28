namespace KLCUBE.Video.Core.NetFx.License.Dtos
{
    public class ActivateLicenseRequestDto
    {
        public string CustomerCode { get; set; }
        public string ProductCode { get; set; }
        public string HostName { get; set; }

        public string DeviceFingerprint { get; set; }
        public string MachineGuid { get; set; }
        public string MacAddress { get; set; }
        public string InternalIpAddress { get; set; }
    }
}