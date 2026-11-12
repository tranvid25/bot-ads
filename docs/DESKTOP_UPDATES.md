# Tự cập nhật BotAds máy tính (từ 1.1.1)

## Khách hàng sử dụng

- Khách đang dùng 1.0.0 hoặc 1.1.0 cài đè bộ cài 1.1.1 một lần sau khi đóng app. Bản cũ chưa có updater nên không thể tự tải tính năng mới.
- Từ 1.1.1, bản phát hành chính thức kiểm tra sau khi mở app 15 giây và mỗi 6 giờ. Có thể bấm **Kiểm tra cập nhật** để kiểm tra ngay.
- Có bản mới thì app tải nền; hiển thị tiến độ và phiên bản. Chỉ cài khi khách bấm **Cài cập nhật & mở lại**; không tự đóng app hoặc cài khi khách thoát thông thường.
- App từ chối cài khi có trình duyệt đang chạy, lượt đang xử lý, kết quả chưa đồng bộ hoặc request nhận việc còn đang chạy. Đợi hoàn tất/đồng bộ rồi bấm lại; không buộc dừng bài giữa chừng.
- Việc cập nhật không xóa thư mục dữ liệu và không đổi app ID. Liên kết và session vẫn được đọc từ kho hiện tại; cần nghiệm thu nâng cấp trên bản đã cài thật trước khi triển khai rộng.
- Mất mạng hoặc release chưa sẵn sàng chỉ hiện lỗi ở phần cập nhật, không chặn nhận lịch. Có nút thử lại; phiên bản hiện tại tiếp tục chạy.

## Các luồng phát hành riêng

Nguồn cập nhật được cố định khi build, không lấy từ website khách ghép máy hoặc IPC của renderer:

```text
https://github.com/tranvid25/bot-ads/releases/latest/download/
```

| Gói                    | Manifest                           |
| ---------------------- | ---------------------------------- |
| Windows x64 Lite       | `stable-win32-x64-lite.yml`        |
| Windows x64 Full       | `stable-win32-x64-full.yml`        |
| Mac Apple Silicon Lite | `stable-darwin-arm64-lite-mac.yml` |
| Mac Apple Silicon Full | `stable-darwin-arm64-full-mac.yml` |
| Mac Intel Lite         | `stable-darwin-x64-lite-mac.yml`   |
| Mac Intel Full         | `stable-darwin-x64-full-mac.yml`   |

Lite không tự chuyển sang Full; CPU và OS có manifest riêng. Không bật downgrade hoặc prerelease. Bản Mac thử ký ad-hoc không bật cập nhật; bản Mac signed/notarized mới có manifest và feed. Mac update dùng ZIP có chữ ký; DMG dùng để cài ban đầu.

Windows hiện theo cấu hình chứng chỉ cũ: bộ cài chưa ký Authenticode. Updater kiểm tra SHA-512 trong manifest qua HTTPS; checksum không thay thế xác thực nhà phát hành bằng chữ ký. Khi có chứng chỉ Windows cần bật ký và kiểm thử xác minh publisher trước khi công bố bản có chữ ký.

## Chủ BotAds phát hành bản mới

1. Tăng version bằng `npm version <version> --no-git-tag-version`, commit cả package.json và package-lock.json. Không tái sử dụng version cho nội dung khác. Các nhánh thử dùng version prerelease không được phát hành vào feed stable.
2. Build bằng **Actions → Build BotAds for Windows**; với Mac dùng **Build BotAds for macOS**, `signed = true`. Các workflow chỉ tạo artifact, không tự publish release.
3. Build script kiểm tra ASAR, đúng luồng Lite/Full và SHA-512 của từng artifact so với manifest. CI còn chạy thử GUI và trình duyệt của package. Trên Windows có kiểm tra updater thật tải bộ cài qua máy chủ loopback và từ chối checksum sai; bài này không cài ứng dụng.
4. Tải artifact của từng gói. Tạo GitHub Release dạng **draft** cho tag tương ứng, ví dụ `v1.1.1`; upload các `.exe`, `.dmg`, `.zip`, `.blockmap`, `.sha256` và toàn bộ `stable-*.yml` ở bảng trên. Không upload thư mục win-unpacked, dữ liệu người dùng hoặc Secrets.
5. Hoàn tất tất cả file trước khi publish release và đặt làm **Latest**; không dùng prerelease. Khách không cần token GitHub; repo/release và assets phải tải công khai được.
6. Feed dùng release Latest chung. Mỗi lần phát hành phải chứa đủ các gói/manifest đang hỗ trợ. Nếu chưa phát hành Mac thì không công bố hỗ trợ cập nhật Mac; nếu tạm giữ Mac ở bản cũ thì cần mang cả manifest và artifact Mac cũ sang release mới để khách Mac vẫn kiểm tra được.
7. Cập nhật `DOWNLOAD_URL` của Worker để khách cài lần đầu nhận bộ cài mới. Biến này độc lập với feed tự cập nhật và vẫn cần cấu hình khi đổi release.

Từ 1.1.1 lên bản cao hơn cần thử trên máy thử đã cài thật: ghép máy, lưu session, nâng cấp khi rảnh, xác nhận app tự mở lại và dữ liệu vẫn nguyên; thử mất mạng và chặn cài trong lúc đăng. Không xác nhận nghiệm thu cập nhật chỉ bằng unit test hoặc mở win-unpacked. Hiện chưa có thử nghiệm nâng cấp qua release công khai.

## Lệnh local trên Windows

```powershell
npm run desktop:build:lite
npm run desktop:build
```

Kết quả ở `release/lite/` và `release/`. Mac xem [MACOS_RELEASE.md](MACOS_RELEASE.md).

## Tham khảo

[electron-builder auto update](https://www.electron.build/v26/docs/features/auto-update/), [Electron autoUpdater](https://www.electronjs.org/docs/latest/api/auto-updater).
