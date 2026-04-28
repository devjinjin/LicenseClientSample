namespace KLCUBE.Video.Core.NetFx.License.Dtos
{
    public class ValidateLicenseResponseDto
    {
        public bool Success { get; set; }
        public string ResultCode { get; set; }
        public string Message { get; set; }
        public ValidateLicenseResponseDataDto Data { get; set; }
    }

    public class ValidateLicenseResponseDataDto
    {
        public bool IsAllowed { get; set; }
    }

    public class ValidateLicenseRequestDto
    {
        public string Token { get; set; }
        public string DeviceFingerprint { get; set; }
        public string MachineGuid { get; set; }
        public string MacAddress { get; set; }
        public string InternalIpAddress { get; set; }
    }
}