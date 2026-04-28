namespace KLCUBE.Video.Contracts.Models
{
    public class ActivationResult
    {
        public bool IsSuccess { get; set; }
        public string ResultCode { get; set; }
        public string Message { get; set; }
        public string Token { get; set; }
        public string TokenId { get; set; }
        public string ExpiresAt { get; set; }
    }
}