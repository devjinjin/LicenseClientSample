using KLCUBE.Video.Contracts.Models;

namespace KLCUBE.Video.Contracts.Abstractions
{
    public interface IDeviceIdentityProvider
    {
        DeviceIdentityInfo GetDeviceIdentity();
    }
}