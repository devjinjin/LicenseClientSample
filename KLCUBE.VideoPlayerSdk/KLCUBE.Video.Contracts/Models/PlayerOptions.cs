namespace KLCUBE.Video.Contracts.Models
{
    public class PlayerOptions
    {
        public string CustomerCode { get; set; }
        public string ProductCode { get; set; }
        public string LicenseServerUrl { get; set; }
        public string LocalCachePath { get; set; }
        public string AppVersion { get; set; }
    }
}