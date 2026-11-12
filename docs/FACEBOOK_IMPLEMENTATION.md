# Bàn giao refactor và Facebook Groups

## Trạng thái

Mã nguồn có hướng dẫn bốn bước, thư viện nhóm, tìm nhóm độc lập, duyệt nhóm và chiến dịch chọn nhóm đã duyệt. Chưa deploy production và chưa chạy pilot đăng thật. Các kiểm thử dùng D1/R2 cô lập và trình duyệt fixture, không tạo bài công khai.

## Module map

| Phạm vi | Vị trí |
| --- | --- |
| Khung ứng dụng, sidebar, trang, hooks | `apps/web/src/components/app/` |
| Hướng dẫn, thư viện, tìm nhóm, các bước campaign | `apps/web/src/components/facebook/` |
| CSS theo vùng, giữ thứ tự cascade | `apps/web/src/styles/`, `apps/web/public/styles/`, `apps/companion/styles/` |
| Marketing routes và OAuth callbacks | `apps/api/controllers/marketing/` |
| Google OAuth | `apps/api/controllers/google-auth.controller/` |
| Claim/prepare/reserve/report thiết bị | `apps/api/controllers/device/` |
| Provider adapters, DPoP, HTTP | `apps/api/services/marketing-providers/` |
| Publishing, locks và media | `apps/api/services/marketing-publisher/` |
| Electron lifecycle, window, storage, jobs | `apps/companion/runtime/` |
| Tìm nhóm độc lập trên máy | `packages/automation/discover_only.cjs`, `apps/companion/discovery-client.cjs` |

`npm run check:source` kiểm tra source JS/JSX/MJS/CJS/CSS trong apps/packages dưới 200 dòng/file; CI chạy trước deploy. Không tính dist, dependencies, SQL, fixture hoặc tài liệu. Không thêm framework hay thư viện runtime mới trong lần này.

## Schema và API mới

Migration `0008_facebook_groups.sql`: `facebook_discovery_jobs`, `facebook_groups`, capability `devices.discovery_supported`. Nhóm phân tách workspace và account hash; cookie/UID thô không được gửi trong báo cáo nhóm.

| API | Mục đích |
| --- | --- |
| `GET /api/facebook` | Tối đa 500 nhóm gần nhất và 20 lượt tìm của workspace |
| `POST /api/facebook/discover` | Tạo lượt tìm với keywords, excludedKeywords, limit |
| `POST /api/facebook/groups` | Nhập URL, trạng thái chưa duyệt |
| `PUT /api/facebook/groups/:id` | Duyệt/loại; duyệt cần confirmed=true |
| `POST /api/facebook/tasks/:id` | Hủy lượt tìm |
| `POST /api/device/discovery/claim` | Nhận task, gắn thiết bị và account hash |
| `POST /api/device/discovery/heartbeat` | Gia hạn 90 giây hoặc yêu cầu dừng |
| `POST /api/device/discovery/report` | Batch có sequence, chống trùng, tối đa 50 nhóm |

Mỗi workspace một lượt tìm hoạt động; claim tìm và claim đăng kiểm tra khóa chéo trong câu SQL. Lượt chờ hết hạn sau 2 giờ. Cron đóng lượt quá hạn/mất lease. Máy lưu báo cáo pending để retry; khi restart không tự chạy lại thao tác tìm bị ngắt.

Campaign mới dùng workflowVersion=2, groupIds và snapshot phiên bản duyệt. Backend xác thực quyền sở hữu, duyệt trong 7 ngày, cùng account; kiểm tra lại khi enqueue, prepare và reserve. Runner đối chiếu account trước chạy. Nhóm đổi membership/lý do kiểm tra sẽ mất duyệt. Nhóm nhập URL chưa gắn account vẫn cần kiểm tra thực tế trên trình duyệt khi đăng. Campaign cũ giữ contract cũ; khi chỉnh sửa qua giao diện mới phải chọn nhóm đã duyệt.

## Kiểm tra

```powershell
npm run check:source
npm test
npm run test:saas
npm run web:build
npm run test:marketing:ui
npm run test:facebook:ui
npm run cloud:build:production
npm run web:check
npm run desktop:build
```

Kiểm thử mới bao phủ tenant/device isolation, duplicate report, lease/cancel, 0 kết quả, nhóm chưa duyệt/hết hạn/đổi account, thu hồi duyệt trước gửi, snapshot cũ, phục hồi báo cáo sau restart và bootstrap Electron. Kiểm thử trình duyệt đi từ Settings/sidebar đến tạo mã, import/duyệt/chọn nhóm, soạn/lưu campaign, tìm nhóm và mobile. Ảnh mới: `test-results/facebook-guide-desktop.png`, `test-results/facebook-guide-mobile.png`.

Kết quả local ngày 11/11/2026:

| Kiểm tra | Kết quả |
| --- | --- |
| Source length | 270 file, tất cả dưới 200 dòng |
| SaaS/API/desktop | 66/66 đạt |
| Automation/regression | 45/45 đạt |
| Marketing UI và Facebook UI | Đạt, desktop/mobile; có kiểm tra mép panel không bị cắt |
| CSS trước/sau refactor | Giữ nguyên thứ tự declaration và giá trị của 5 stylesheet cũ |
| Vite, Worker dry-run, Pages Functions | Build đạt |
| Windows installer | Build đạt; đối chiếu byte runtime trong ASAR với source và kiểm tra không chứa dữ liệu riêng |

Bộ cài local: `release/BotAds-Setup-1.0.0.exe`, checksum: `release/BotAds-Setup-1.0.0.exe.sha256`. Đây là bản build local mới, chưa thay thế file đang phát hành trên GitHub/production. Chưa build lại bản macOS trong lần này.

## Đưa lên production và nghiệm thu

1. Push/PR qua CI. Workflow hiện có tự apply migration trước deploy API; deploy frontend sau backend.
2. Phát hành bộ cài mới và cập nhật DOWNLOAD_URL tới đúng bản. Bản EXE đã phát hành trước lần sửa này không có tính năng tìm nhóm. Build local không tự cập nhật link tải trên production.
3. Cài app mới, mở web, xác nhận thiết bị có discovery_supported, tìm vài nhóm và duyệt thủ công.
4. Pilot một bài trên nhóm cho phép: đối chiếu bài/link trên Facebook và kết quả web. Kiểm tra thêm chờ duyệt, offline, hủy và unknown. Không chạy marketing hàng loạt để nghiệm thu.

Chưa có: lựa chọn riêng chỉ tìm trong nhóm đã tham gia, tiếp tục từ cursor sau crash và phân trang server quá 500 nhóm. Discovery hiện tìm theo từ khóa rồi bổ sung nhóm đã tham gia trong giới hạn kết quả. Không tự xin tham gia nhóm trong workflow mới. Facebook Groups vẫn cần máy chạy, không phải luồng API cloud như LinkedIn/DEV.
