namespace KLCUBE.Video.Contracts.Models
{
    public class LicenseCheckResult
    {
        public bool IsAllowed { get; set; }
        public string ResultCode { get; set; }
        public string Message { get; set; }
    }
}