# Threads và Instagram qua BotAds máy tính — bản 1.1.0

## Trạng thái bàn giao

Đã có mã nguồn kết nối tài khoản trên trình duyệt, nhận lịch từ web, đăng và báo cáo kết quả. Không cần Meta Developer App cho luồng desktop này. Chưa có nghiệm thu với tài khoản Threads/Instagram thật; các bài kiểm thử dùng tài khoản/DOM mô phỏng, không tạo bài công khai.

| Kênh | Phạm vi bản đầu |
| --- | --- |
| Threads | Bài chữ và link, tối đa 500 ký tự; chưa nhận ảnh/video |
| Instagram | Một ảnh PNG/JPG tối đa 5 MB và caption tối đa 2.200 ký tự; chưa nhận video, carousel hoặc Story |

Máy phải bật, có mạng và app nhận việc. Nền tảng yêu cầu xác minh hoặc thay đổi giao diện có thể khiến lượt dừng; không hứa tự động 100% hoặc tài khoản luôn an toàn.

## Khách hàng sử dụng

1. Đăng nhập BotAds và chuẩn bị thương hiệu, website quảng bá của mình.
2. Cài bản BotAds máy tính 1.1.0. Giữ app mở; lần đầu vào **Thiết bị Facebook / Thiết bị & mã liên kết** để ghép máy với website BotAds. Địa chỉ ghép là website điều khiển BotAds, không phải website dịch vụ cần quảng bá.
3. Trên web, mở **Connect Channel**, chọn Threads hoặc Instagram và thương hiệu đích.
4. Bấm **Mở đăng nhập … trên máy**. Đây là yêu cầu chờ máy nhận, chưa phải kết nối thành công. Có thể hủy yêu cầu chờ trên web.
5. Trong cửa sổ trình duyệt do app mở, tự đăng nhập và xử lý xác minh của nền tảng. BotAds đọc danh tính từ liên kết Trang cá nhân của phiên đang mở.
6. Khi app lưu phiên mã hóa và báo cáo thành công, web hiện đúng handle tài khoản. Mỗi máy/workspace giữ một phiên cho mỗi provider trong bản này; muốn đổi tài khoản cần xóa phiên kênh cũ trong app trước.
7. Dùng composer web soạn bài, chọn đúng tài khoản đích, duyệt và đăng ngay/đặt lịch. Instagram phải gắn ảnh ở phiên bản Instagram. Máy kiểm tra lại tài khoản trước khi gửi.
8. Theo dõi kết quả trên web. **Đã xác nhận đăng** cần link bằng chứng từ trình duyệt; **Chưa rõ — cần kiểm tra** không được tự thử lại. Mở nền tảng kiểm tra rồi nhập link hoặc xác nhận chưa đăng.

Hai phiên Threads/Instagram tách khỏi phiên Facebook. Cookies và trạng thái trình duyệt được lưu trong kho credentials mã hóa trên máy, không gửi trong API kết nối/báo cáo. Ảnh tải về thư mục dữ liệu local để đưa vào ô upload của nền tảng.

## Hành vi khi có lỗi

- App cũ: backend yêu cầu cập nhật trước khi tạo yêu cầu kết nối mới.
- Máy offline: yêu cầu kết nối chờ tối đa 30 phút; bài đến hạn chờ máy tối đa 2 giờ. Quá hạn cần thao tác lại, không đăng bù nhiều ngày.
- Cần xác minh/hết phiên: dừng, hướng dẫn kết nối lại. Không vượt CAPTCHA hoặc tự hoàn thành xác minh.
- Sai tài khoản: dừng trước khi gửi; không đổi tài khoản đích của lịch đã duyệt.
- Hủy hoặc ngắt kênh: chặn giữ chỗ mới. Thao tác đã gửi lên nền tảng vẫn phải đối soát kết quả thực tế.
- Mất mạng sau giữ chỗ/bấm gửi: giữ unknown, không tự đăng lại.
- Instagram báo chia sẻ xong nhưng không có link đủ bằng chứng: giữ unknown, cho khách nhập link xác nhận thủ công. Không đoán bài mới nhất trên profile.
- Xóa phiên trong app: kênh trên web chuyển cần kết nối lại. Ngắt kênh trên web hủy các lượt chưa gửi; có thể xóa phiên local riêng trong app.

## Backend và các module mới

Migration: `apps/api/migrations/0009_desktop_social.sql`.

- `devices.social_supported`: khả năng nhận tác vụ social của bản app.
- `marketing_channels.transport`, `device_id`: phân biệt API, manual và desktop; bind kênh với máy đã xác minh phiên.
- `marketing_publications.transport`: lưu phương thức chạy của publication. Kênh và lượt manual cũ giữ nguyên manual, không tự được nâng thành desktop.
- `desktop_social_tasks`: tác vụ connect/publish riêng, lease 90 giây, claim token và deadline. Khóa chéo với job Facebook/discovery, cộng khóa workspace và tài khoản của marketing publisher.

| API | Chức năng |
| --- | --- |
| `GET /api/marketing/desktop/status` | Máy, capability và các yêu cầu kết nối của khách |
| `POST /api/marketing/desktop/start` | Tạo yêu cầu đăng nhập theo provider/brand |
| `POST /api/marketing/desktop/tasks/:id/cancel` | Hủy yêu cầu kết nối của chính khách |
| `POST /api/device/social/claim` | Máy nhận tác vụ; chỉ đúng workspace/device |
| `POST /api/device/social/heartbeat` | Gia hạn hoặc yêu cầu dừng |
| `POST /api/device/social/before-submit` | Giữ chỗ một lần, kiểm tra hủy/kết nối/quota trước click gửi |
| `POST /api/device/social/report` | Báo kết quả idempotent, link và lỗi; không nhận cookie |
| `POST /api/device/social/forget` | Đánh dấu kênh cần đăng nhập lại khi máy xóa phiên |

Module map:

- `packages/social-contract.cjs`: validation nội dung, danh tính và permalink.
- `apps/api/services/desktop-social/`: claim, lease, quota, báo cáo, hết hạn.
- `apps/companion/social-client.cjs`: điều phối và journal báo cáo local; restart không tự lặp lại thao tác đăng.
- `apps/companion/social-runner.cjs`: process riêng và giao thức giữ chỗ/auth.
- `apps/companion/social/`: browser, login, nhận diện tài khoản và adapter Threads/Instagram.
- `apps/web/src/components/marketing/MetaConnectView.jsx`: hướng dẫn kết nối thật, không lưu tên nhập tay làm kết nối.
- `DesktopConnectionProgress.jsx`: trạng thái chờ/đăng nhập/kết nối/lỗi và hủy yêu cầu.

Instagram có thể xác nhận link từ completion dialog hoặc response của chính thao tác upload/share trên trình duyệt. Response phải thuộc Instagram và khớp caption/tài khoản; đây không phải gọi API bằng Meta App.

## Chạy local

```powershell
npm ci
npm run cloud:setup
```

Mở ba terminal riêng:

```powershell
npm run cloud:dev
```

```powershell
npm run web:dev
```

```powershell
npm run desktop
```

Dùng địa chỉ Vite mặc định `http://127.0.0.1:5173` trên cả trình duyệt và ô website trong app. Tạo mã từ chính tài khoản local. Luồng này không cần bổ sung Meta App ID/Secret hoặc đổi AUTH_SECRET/TOKEN_ENCRYPTION_KEY đang dùng.

## Phát hành và pilot

1. Chạy CI: source length, SaaS/API/browser, automation, ba bộ UI, web/Worker/Pages build.
2. Áp migration 0009 trước khi chạy backend mới. Workflow production hiện có áp migration tự động khi deploy; chưa deploy trong lần bàn giao này.
3. Bộ cài local mới: `release/BotAds-Setup-1.1.0.exe`, checksum cùng tên có đuôi `.sha256`. Kiểm tra ASAR so byte với source và kiểm tra không chứa dữ liệu cá nhân.
   Có thêm bản Lite tại `release/lite/BotAds-Setup-1.1.0-Lite.exe` (khoảng 115 MB), dùng Edge/Chrome có sẵn; Full đã tối ưu còn khoảng 275 MB. Xem [phân tích dung lượng và điều kiện sử dụng](INSTALLER_SIZE_RESEARCH.md).
4. Upload release mới rồi đổi `DOWNLOAD_URL` sang file 1.1.0. Cấu hình production hiện vẫn trỏ bản 1.0.0; build local chưa thay link tải trên website.
5. Cài app mới, thử đăng nhập và một bài thật trên tài khoản được phép cho mỗi kênh. Đối chiếu link, nội dung/ảnh và kết quả web; thử thêm mất mạng, hủy và hết phiên.
6. Chỉ mở cho khách sau pilot. Nếu giao diện thật khác fixture, cập nhật adapter/selector và kiểm thử lại trước khi hứa tự động đăng ổn định.

Không tự tìm nhóm, spam bình luận, tự theo dõi hoặc nhắn tin trên Threads/Instagram trong phạm vi bản này.

## Kết quả kiểm tra local ngày 11/11/2026

- 80/80 kiểm thử SaaS/API/desktop/browser đạt; 45/45 automation/regression đạt.
- Ba bộ UI marketing, Facebook và Threads/Instagram đều đạt, có kiểm tra mobile.
- Source check: 288 file production đều dưới 200 dòng; các module mới đã format bình thường.
- Web build, Worker production dry-run và Pages Functions build đạt.
- Bộ cài Windows 1.1.0 build đạt; runtime trong ASAR khớp source và không đóng gói dữ liệu phiên cá nhân.
- Chưa deploy production, chưa upload release và chưa đăng bài thật trên Threads/Instagram.
