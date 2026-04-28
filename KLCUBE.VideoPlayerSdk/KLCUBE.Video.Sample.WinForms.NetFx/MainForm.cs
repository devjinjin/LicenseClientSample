using KLCUBE.Video.Contracts.Abstractions;
using KLCUBE.Video.Contracts.Enums;
using KLCUBE.Video.Contracts.Models;
using KLCUBE.Video.Core.NetFx.Device;
using KLCUBE.Video.Core.NetFx.Players;
using System;
using System.Windows.Forms;

namespace KLCUBE.Video.Sample.WinForms.NetFx
{
    public partial class MainForm : Form
    {
        private ISecureVideoPlayer _player;

        public MainForm()
        {
            InitializeComponent();
            InitializePlayer();
        }

        private void InitializePlayer()
        {
            _player = new SecureVideoPlayer();
            _player.PlaybackStateChanged += Player_PlaybackStateChanged;
            _player.ErrorOccurred += Player_ErrorOccurred;

            UpdateState(PlaybackState.None);
            WriteLog("플레이어 인스턴스 생성 완료");
        }

        private void Player_PlaybackStateChanged(object sender, PlaybackState e)
        {
            if (InvokeRequired)
            {
                Invoke(new Action(() => UpdateState(e)));
                return;
            }

            UpdateState(e);
            WriteLog($"상태 변경: {e}");
        }

        private void Player_ErrorOccurred(object sender, string e)
        {
            if (InvokeRequired)
            {
                Invoke(new Action(() => WriteLog($"오류: {e}")));
                return;
            }

            WriteLog($"오류: {e}");
        }

        private void UpdateState(PlaybackState state)
        {
            lblStateValue.Text = state.ToString();
        }

        private void WriteLog(string message)
        {
            txtLog.AppendText($"[{DateTime.Now:HH:mm:ss}] {message}{Environment.NewLine}");
        }

        private async void btnInitialize_Click(object sender, EventArgs e)
        {
            try
            {
                await _player.InitializeAsync(new PlayerOptions
                {
                    CustomerCode = "BANK001",
                    ProductCode = "VIDEO-PLAYER",
                    LicenseServerUrl = "https://localhost:32771",
                    LocalCachePath = @"C:\KLCUBE\VideoCache",
                    AppVersion = "1.0.0"
                });

                WriteLog("Initialize 완료");
            }
            catch (Exception ex)
            {
                WriteLog($"Initialize 실패: {ex.Message}");
            }
        }

        private async void btnActivate_Click(object sender, EventArgs e)
        {
            try
            {
                var result = await _player.ActivateAsync(new ActivationRequest
                {
                    CustomerCode = "BANK001",
                    ProductCode = "VIDEO-PLAYER",
                    HostName = Environment.MachineName
                });

                WriteLog($"Activate 결과: Success={result.IsSuccess}, Message={result.Message}, Token={result.Token}");
            }
            catch (Exception ex)
            {
                WriteLog($"Activate 실패: {ex.Message}");
            }
        }

        private async void btnLoad_Click(object sender, EventArgs e)
        {
            try
            {
                await _player.LoadContentAsync(new ContentLoadOptions
                {
                    ContentId = "CONTENT-001",
                    FilePath = @"D:\Sample\video.enc"
                });

                WriteLog("Load 완료");
            }
            catch (Exception ex)
            {
                WriteLog($"Load 실패: {ex.Message}");
            }
        }

        private async void btnPlay_Click(object sender, EventArgs e)
        {
            try
            {
                await _player.PlayAsync();
                WriteLog("Play 호출 완료");
            }
            catch (Exception ex)
            {
                WriteLog($"Play 실패: {ex.Message}");
            }
        }

        private async void btnPause_Click(object sender, EventArgs e)
        {
            try
            {
                await _player.PauseAsync();
                WriteLog("Pause 호출 완료");
            }
            catch (Exception ex)
            {
                WriteLog($"Pause 실패: {ex.Message}");
            }
        }

        private async void btnStop_Click(object sender, EventArgs e)
        {
            try
            {
                await _player.StopAsync();
                WriteLog("Stop 호출 완료");
            }
            catch (Exception ex)
            {
                WriteLog($"Stop 실패: {ex.Message}");
            }
        }

        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            _player?.Dispose();
            base.OnFormClosed(e);
        }

        private void btnDeviceInfo_Click(object sender, EventArgs e)
        {
            try
            {
                IDeviceIdentityProvider provider = new NetFxDeviceIdentityProvider();
                var device = provider.GetDeviceIdentity();

                WriteLog("=== Device Identity ===");
                WriteLog("HostName: " + device.HostName);
                WriteLog("MachineGuid: " + device.MachineGuid);
                WriteLog("MacAddress: " + device.MacAddress);
                WriteLog("InternalpAddress: " + device.InternalIpAddress);
                WriteLog("DeviceFingerprint: " + device.DeviceFingerprint);
            }
            catch (Exception ex)
            {
                WriteLog("DeviceInfo 실패: " + ex.Message);
            }
        }
    }
}
