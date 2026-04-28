using System;
using KLCUBE.Video.Contracts.Models;

namespace KLCUBE.Video.Core.Shared.Services
{
    public class LicenseValidationService
    {
        public LicenseCheckResult ValidateBasicPlayerOptions(PlayerOptions options)
        {
            if (options == null)
            {
                return new LicenseCheckResult
                {
                    IsAllowed = false,
                    Message = "PlayerOptions가 null입니다."
                };
            }

            if (string.IsNullOrWhiteSpace(options.CustomerCode))
            {
                return new LicenseCheckResult
                {
                    IsAllowed = false,
                    Message = "CustomerCode가 비어 있습니다."
                };
            }

            if (string.IsNullOrWhiteSpace(options.ProductCode))
            {
                return new LicenseCheckResult
                {
                    IsAllowed = false,
                    Message = "ProductCode가 비어 있습니다."
                };
            }

            return new LicenseCheckResult
            {
                IsAllowed = true,
                Message = "기본 검증 성공"
            };
        }
    }
}