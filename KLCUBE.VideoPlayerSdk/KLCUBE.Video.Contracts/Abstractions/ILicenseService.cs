using System.Threading.Tasks;
using KLCUBE.Video.Contracts.Models;

namespace KLCUBE.Video.Contracts.Abstractions
{
    public interface ILicenseService
    {
        Task<ActivationResult> ActivateAsync(ActivationRequest request, DeviceIdentityInfo device);

        Task<LicenseCheckResult> ValidateAsync(string token, DeviceIdentityInfo device);
    }
}