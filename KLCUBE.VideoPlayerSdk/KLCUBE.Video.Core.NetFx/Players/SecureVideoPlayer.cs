using KLCUBE.Video.Contracts.Abstractions;
using KLCUBE.Video.Contracts.Enums;
using KLCUBE.Video.Contracts.Models;
using KLCUBE.Video.Core.NetFx.Device;
using KLCUBE.Video.Core.NetFx.License;
using KLCUBE.Video.Core.Shared.Services;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace KLCUBE.Video.Core.NetFx.Players
{
    public class SecureVideoPlayer : ISecureVideoPlayer
    {
        private readonly LicenseValidationService _licenseValidationService;
        private readonly IDeviceIdentityProvider _deviceIdentityProvider;
        private ILicenseService _licenseService;

        //private PlayerOptions _options;
        private bool _disposed;
        private string _currentToken;
        public SecureVideoPlayer()
        {
            _licenseValidationService = new LicenseValidationService();
            _deviceIdentityProvider = new NetFxDeviceIdentityProvider();

            State = PlaybackState.None;
        }

        public bool IsInitialized { get; private set; }

        public bool IsActivated { get; private set; }

        public PlaybackState State { get; private set; }

        public event EventHandler<PlaybackState> PlaybackStateChanged;
        public event EventHandler<string> ErrorOccurred;



        public async Task InitializeAsync(PlayerOptions options, CancellationToken cancellationToken = default)
        {
            await Task.Run(() =>
            {
                var result = _licenseValidationService.ValidateBasicPlayerOptions(options);

                if (!result.IsAllowed)
                {
                    RaiseError(result.Message);
                    throw new InvalidOperationException(result.Message);
                }

                //_options = options;
                _licenseService = new HttpLicenseService(options.LicenseServerUrl);
                IsInitialized = true;
                ChangeState(PlaybackState.Initialized);
            }, cancellationToken);
        }



        public async Task<ActivationResult> ActivateAsync(ActivationRequest request, CancellationToken cancellationToken = default)
        {
            if (_licenseService == null)
            {
                return new ActivationResult
                {
                    IsSuccess = false,
                    ResultCode = "LICENSE_SERVICE_NOT_READY",
                    Message = "LicenseService가 초기화되지 않았습니다."
                };
            }

            if (request == null)
            {
                return new ActivationResult
                {
                    IsSuccess = false,
                    ResultCode = "INVALID_REQUEST",
                    Message = "활성화 요청 정보가 없습니다."
                };
            }

            var device = _deviceIdentityProvider.GetDeviceIdentity();

            var result = await _licenseService.ActivateAsync(request, device);


            if (!result.IsSuccess)
            {
                RaiseError(result.Message);
                return result;
            }

            IsActivated = true;
            _currentToken = result.Token;

            return result;
        }

        public async Task<LicenseCheckResult> ValidateLicenseAsync(CancellationToken cancellationToken = default)
        {
            if (!IsInitialized)
            {
                return new LicenseCheckResult
                {
                    IsAllowed = false,
                    ResultCode = "NOT_INITIALIZED",
                    Message = "플레이어가 초기화되지 않았습니다."
                };
            }

            if (_licenseService == null)
            {
                return new LicenseCheckResult
                {
                    IsAllowed = false,
                    ResultCode = "LICENSE_SERVICE_NOT_READY",
                    Message = "LicenseService가 초기화되지 않았습니다."
                };
            }

            if (!IsActivated)
            {
                return new LicenseCheckResult
                {
                    IsAllowed = false,
                    ResultCode = "NOT_ACTIVATED",
                    Message = "플레이어가 활성화되지 않았습니다."
                };
            }

            var device = _deviceIdentityProvider.GetDeviceIdentity();
            var token = _currentToken;

            if (string.IsNullOrWhiteSpace(token))
            {
                return new LicenseCheckResult
                {
                    IsAllowed = false,
                    ResultCode = "TOKEN_EMPTY",
                    Message = "저장된 토큰이 없습니다."
                };
            }

            return await _licenseService.ValidateAsync(token, device);
        }

        public async Task LoadContentAsync(ContentLoadOptions options, CancellationToken cancellationToken = default)
        {
            await Task.Run(() =>
            {
                if (!IsInitialized)
                {
                    throw new InvalidOperationException("플레이어가 초기화되지 않았습니다.");
                }

                if (!IsActivated)
                {
                    throw new InvalidOperationException("플레이어가 활성화되지 않았습니다.");
                }

                if (options == null || string.IsNullOrWhiteSpace(options.ContentId))
                {
                    throw new InvalidOperationException("콘텐츠 정보가 올바르지 않습니다.");
                }

                // TODO: 실제 콘텐츠 로딩 로직 추가 예정
                ChangeState(PlaybackState.Ready);
            }, cancellationToken);
        }

        public async Task PlayAsync(CancellationToken cancellationToken = default)
        {
            await Task.Run(() =>
            {
                if (State != PlaybackState.Ready &&
                    State != PlaybackState.Paused &&
                    State != PlaybackState.Stopped)
                {
                    throw new InvalidOperationException("재생 가능한 상태가 아닙니다.");
                }

                // TODO: 실제 재생 엔진 호출 예정
                ChangeState(PlaybackState.Playing);
            }, cancellationToken);
        }

        public async Task PauseAsync(CancellationToken cancellationToken = default)
        {
            await Task.Run(() =>
            {
                if (State != PlaybackState.Playing)
                {
                    throw new InvalidOperationException("일시정지 가능한 상태가 아닙니다.");
                }

                ChangeState(PlaybackState.Paused);
            }, cancellationToken);
        }

        public async Task StopAsync(CancellationToken cancellationToken = default)
        {
            await Task.Run(() =>
            {
                if (State != PlaybackState.Playing &&
                    State != PlaybackState.Paused)
                {
                    throw new InvalidOperationException("정지 가능한 상태가 아닙니다.");
                }

                ChangeState(PlaybackState.Stopped);
            }, cancellationToken);
        }

        public void Dispose()
        {
            if (_disposed)
            {
                return;
            }

            _disposed = true;
        }

        private void ChangeState(PlaybackState newState)
        {
            State = newState;
            PlaybackStateChanged?.Invoke(this, newState);
        }

        private void RaiseError(string message)
        {
            ChangeState(PlaybackState.Error);
            ErrorOccurred?.Invoke(this, message);
        }

     
    }
}