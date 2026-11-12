# Phát hành BotAds cho MacBook

Đã chuẩn bị workflow native macOS cho cả Apple Silicon (M1/M2/M3/M4 và đời mới hơn, arm64) và Intel (x64). Mỗi kiến trúc có Lite và Full, xuất `.dmg`, `.zip`, SHA-256 và `package-size.json`. Chưa có DMG đã build/nghiệm thu trong workspace Windows này.

## Cấu hình signing một lần

Trong GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret                        | Giá trị                                                                                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MAC_CSC_LINK`                | Nội dung base64 của file `.p12` chứa chứng chỉ **Developer ID Application** và private key. Xuất từ Keychain Access trên Mac; không dùng chứng chỉ Apple Development hay Developer ID Installer. |
| `MAC_CSC_KEY_PASSWORD`        | Mật khẩu đã đặt khi xuất `.p12`.                                                                                                                                                                 |
| `APPLE_ID`                    | Apple ID thuộc Apple Developer team.                                                                                                                                                             |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password tạo tại tài khoản Apple, dùng cho notarization. Không phải mật khẩu đăng nhập Apple ID.                                                                                    |
| `APPLE_TEAM_ID`               | Team ID trong Apple Developer → Membership details.                                                                                                                                              |

Không commit `.p12`, private key, base64 hay mật khẩu. Các secret này thuộc GitHub Actions; không put vào Cloudflare Worker. Workflow ánh xạ hai secret `MAC_CSC_*` thành biến chuẩn `CSC_LINK` / `CSC_KEY_PASSWORD` của electron-builder.

## Build trên GitHub từ Windows

1. Push các thay đổi của tính năng lên repo. Workflow phải có trên nhánh mặc định để xuất hiện trong mục Actions.
2. Mở **Actions → Build BotAds for macOS → Run workflow**, chọn đúng nhánh, giữ **signed = true**.
3. Bốn job chạy trên `macos-15` (Apple Silicon) và `macos-15-intel` (Intel). Thiếu secrets thì bản signed thất bại; không tự hạ xuống bản thử.
4. Chỉ nhận artifact khi job xanh. Mỗi artifact chứa DMG, ZIP, checksum và dung lượng đo thực tế. Artifact Actions được giữ 14 ngày; đây chưa phải đường dẫn phát hành công khai lâu dài.
5. Tải đúng CPU về Mac thật, mở DMG và kéo BotAds vào Applications. Mở app, ghép máy và nghiệm thu đăng nhập/đăng bài bằng tài khoản thử trước khi phát hành cho khách.
6. Sau khi nghiệm thu, tải bộ cài đã ký lên release công khai cùng manifest `stable-*.yml` và blockmap theo [hướng dẫn tự cập nhật](DESKTOP_UPDATES.md). Workflow này không tự publish release hoặc đổi link tải production.

Workflow kiểm tra CPU của executable, chữ ký đệ quy, notarization staple và Gatekeeper; so sánh ASAR với source, chạy app và thao tác trình duyệt trên trang cục bộ. Những bước này chưa thay thế kiểm thử đăng nhập và đăng thật trên Facebook/Threads/Instagram.

## Chọn gói cho khách

- **Lite**: nhẹ hơn, dùng Google Chrome hoặc Microsoft Edge đã cài trên Mac; Safari không dùng cho luồng này.
- **Full**: kèm đúng revision Chromium native của Playwright, phù hợp máy chưa có Chrome/Edge; không kèm browser cache cũ hay headless shell.
- Xem **Apple menu → About This Mac**: mục Chip là Apple M… thì chọn `arm64`; mục Processor là Intel thì chọn `x64`. Không suy luận CPU chỉ từ user agent.
- Dung lượng Mac lấy từ `package-size.json` sau build; không dùng số dung lượng EXE Windows để báo cho khách.

## Build trực tiếp trên Mac

Cần Node.js 22, Xcode Command Line Tools và quyền truy cập dịch vụ ký/notarization của Apple. Dùng Node native đúng CPU; tránh terminal chạy dưới Rosetta khi muốn build arm64.

```sh
npm ci
# Đã cấu hình các biến CSC_LINK, CSC_KEY_PASSWORD, APPLE_ID,
# APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID trong môi trường riêng:
npm run desktop:build:mac:lite:signed
npm run desktop:build:mac:signed
```

Kết quả: `release/macos/<arm64|x64>/<lite|full>/`. Lệnh không có `:signed` chỉ tạo bản thử ký ad-hoc, chưa được Apple notarize; không dùng làm bản phát hành cho khách. Không tắt Gatekeeper toàn hệ thống.

## Liên kết và giữ nguyên tính năng

Mac dùng cùng backend, mã liên kết và luồng chiến dịch như Windows. Nhập địa chỉ **BotAds** (ví dụ `https://bot.salesora.space`) vào app; `xaywebsite.com` là website được quảng bá trong nội dung bài.

Nếu tài khoản đã ghép máy Windows, thu hồi máy cũ trên trang Thiết bị rồi tạo mã để ghép Mac. Đăng nhập lại các kênh trên Mac; không chép session/cookie từ Windows. Khóa mã hóa Windows và macOS khác nhau. Các kênh desktop vẫn cần máy bật, có mạng và app đang chạy; khi máy ngủ lịch không thể chạy đúng giờ.

Tham khảo: [Electron code signing](https://www.electronjs.org/docs/latest/tutorial/code-signing), [GitHub-hosted macOS runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners). Tên biến notarization được đối chiếu với phiên bản electron-builder đang khóa trong package-lock.
