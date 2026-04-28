namespace KLCUBE.Video.Core.NetFx.License.Dtos
{
    public class ActivateLicenseResponseDto
    {
        public bool Success { get; set; }
        public string ResultCode { get; set; }
        public string Message { get; set; }
        public ActivateLicenseResponseDataDto Data { get; set; }
    }

    public class ActivateLicenseResponseDataDto
    {
        public string Token { get; set; }
        public string TokenId { get; set; }
        public string ExpiresAt { get; set; }
    }
}