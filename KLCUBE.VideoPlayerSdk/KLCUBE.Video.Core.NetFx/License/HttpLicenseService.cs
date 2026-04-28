using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using KLCUBE.Video.Contracts.Abstractions;
using KLCUBE.Video.Contracts.Models;
using KLCUBE.Video.Core.NetFx.License.Dtos;
using Newtonsoft.Json;

namespace KLCUBE.Video.Core.NetFx.License
{
    public class HttpLicenseService : ILicenseService
    {
        private readonly string _baseUrl;

        public HttpLicenseService(string baseUrl)
        {
            _baseUrl = baseUrl?.TrimEnd('/');
        }

        public async Task<ActivationResult> ActivateAsync(ActivationRequest request, DeviceIdentityInfo device)
        {
            try
            {
                using (var client = new HttpClient())
                {
                    var url = _baseUrl + "/api/licenses/activate";

                    var dto = new ActivateLicenseRequestDto
                    {
                        CustomerCode = request.CustomerCode,
                        ProductCode = request.ProductCode,
                        HostName = request.HostName,
                        DeviceFingerprint = device.DeviceFingerprint,
                        MachineGuid = device.MachineGuid,
                        MacAddress = device.MacAddress,
                        InternalIpAddress = device.InternalIpAddress
                    };

                    var json = JsonConvert.SerializeObject(dto);
                    var content = new StringContent(json, Encoding.UTF8, "application/json");

                    var response = await client.PostAsync(url, content);
                    var responseJson = await response.Content.ReadAsStringAsync();

                    if (!response.IsSuccessStatusCode)
                    {
                        return new ActivationResult
                        {
                            IsSuccess = false,
                            ResultCode = "HTTP_ERROR",
                            Message = "서버 호출 실패: " + response.StatusCode
                        };
                    }

                    var result = JsonConvert.DeserializeObject<ActivateLicenseResponseDto>(responseJson);

                    return new ActivationResult
                    {
                        IsSuccess = result != null && result.Success,
                        ResultCode = result?.ResultCode,
                        Message = result?.Message,
                        Token = result?.Data?.Token,
                        TokenId = result?.Data?.TokenId,
                        ExpiresAt = result?.Data?.ExpiresAt
                    };
                }
            }
            catch (Exception ex)
            {
                return new ActivationResult
                {
                    IsSuccess = false,
                    ResultCode = "EXCEPTION",
                    Message = ex.Message
                };
            }
        }

        public async Task<LicenseCheckResult> ValidateAsync(string token, DeviceIdentityInfo device)
        {
            try
            {
                using (var client = new HttpClient())
                {
                    var url = _baseUrl + "/api/licenses/validate";

                    var dto = new ValidateLicenseRequestDto
                    {
                        Token = token,
                        DeviceFingerprint = device.DeviceFingerprint,
                        MachineGuid = device.MachineGuid,
                        MacAddress = device.MacAddress,
                        InternalIpAddress = device.InternalIpAddress
                    };

                    var json = JsonConvert.SerializeObject(dto);
                    var content = new StringContent(json, Encoding.UTF8, "application/json");

                    var response = await client.PostAsync(url, content);
                    var responseJson = await response.Content.ReadAsStringAsync();

                    if (!response.IsSuccessStatusCode)
                    {
                        return new LicenseCheckResult
                        {
                            IsAllowed = false,
                            ResultCode = "HTTP_ERROR",
                            Message = "서버 호출 실패: " + response.StatusCode
                        };
                    }

                    var result = JsonConvert.DeserializeObject<ValidateLicenseResponseDto>(responseJson);

                    return new LicenseCheckResult
                    {
                        IsAllowed = result != null && result.Success && result.Data != null && result.Data.IsAllowed,
                        ResultCode = result?.ResultCode,
                        Message = result?.Message
                    };
                }
            }
            catch (Exception ex)
            {
                return new LicenseCheckResult
                {
                    IsAllowed = false,
                    ResultCode = "EXCEPTION",
                    Message = ex.Message
                };
            }
        }
    }
}