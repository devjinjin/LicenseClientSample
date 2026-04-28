using KLCUBE.Video.Contracts.Models;

namespace KLCUBE.Video.Core.Shared.Models
{
    public class PlayerInitializationContext
    {
        public PlayerOptions Options { get; set; }
        public bool IsValidated { get; set; }
        public string ValidationMessage { get; set; }
    }
}