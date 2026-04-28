using KLCUBE.Video.Contracts.Abstractions;
using KLCUBE.Video.Contracts.Models;
using System.Threading.Tasks;

namespace KLCUBE.Video.Core.NetFx.License
{
    public class DummyLicenseService : ILicenseService
    {
        public Task<ActivationResult> ActivateAsync(ActivationRequest request, DeviceIdentityInfo device)
        {
            var result = new ActivationResult
            {
                IsSuccess = true,
                Message = "Dummy Activation Success",
                Token = "DUMMY-TOKEN-" + device.DeviceFingerprint.Substring(0, 8)
            };

            return Task.FromResult(result);
        }

        public Task<bool> ValidateAsync(string token, DeviceIdentityInfo device)
        {
            if (string.IsNullOrWhiteSpace(token))
                return Task.FromResult(false);

            return Task.FromResult(token.StartsWith("DUMMY-TOKEN"));
        }

        Task<LicenseCheckResult> ILicenseService.ValidateAsync(string token, DeviceIdentityInfo device)
        {
            throw new System.NotImplementedException();
        }
    }
}
