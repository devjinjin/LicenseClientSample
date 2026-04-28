using System;
using System.Threading;
using System.Threading.Tasks;
using KLCUBE.Video.Contracts.Models;
using KLCUBE.Video.Contracts.Enums;

namespace KLCUBE.Video.Contracts.Abstractions
{
    public interface ISecureVideoPlayer : IDisposable
    {
        bool IsInitialized { get; }
        bool IsActivated { get; }

        PlaybackState State { get; }

        event EventHandler<PlaybackState> PlaybackStateChanged;
        event EventHandler<string> ErrorOccurred;

        Task InitializeAsync(PlayerOptions options, CancellationToken cancellationToken = default);

        Task<ActivationResult> ActivateAsync(
            ActivationRequest request,
            CancellationToken cancellationToken = default);

        Task<LicenseCheckResult> ValidateLicenseAsync(
            CancellationToken cancellationToken = default);

        Task LoadContentAsync(
            ContentLoadOptions options,
            CancellationToken cancellationToken = default);

        Task PlayAsync(CancellationToken cancellationToken = default);

        Task PauseAsync(CancellationToken cancellationToken = default);

        Task StopAsync(CancellationToken cancellationToken = default);
    }
}