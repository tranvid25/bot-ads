# Kế hoạch dựng lại giao diện BotAds giống Buffer

## 1. Mục tiêu

Làm trực tiếp trong repo `D:\botAds`. Dựng lại giao diện theo ứng dụng **https://publish.buffer.com/**, gồm quản lý bài, trình soạn, kết nối kênh, lịch và chi tiết bài. Giữ thương hiệu BotAds, nội dung tiếng Việt và toàn bộ chức năng backend hiện tại.

Mục tiêu là đối chiếu giao diện thật và tái hiện bằng React/CSS có thể chỉnh sửa; không chỉ đổi màu hoặc tạo một dashboard lấy cảm hứng từ Buffer.

## 2. Kiểm tra dự án trước khi sửa

- Xác nhận workspace, đọc hướng dẫn dự án nếu có, kiểm tra Git status và scripts.
- Giữ React/Vite, frontend Cloudflare Pages, backend Worker và proxy `/api/*`.
- Bảo toàn thay đổi đang có; không xóa hoặc reset repo.
- Không thay domain, database, secrets hay cấu trúc deploy để làm UI.
- Hoàn tất local trước; không tự push, merge hoặc deploy.

Các file chính cần đọc:

```text
apps/web/src/App.jsx
apps/web/src/style.css
apps/web/src/marketing.css
apps/web/src/publishing.css
apps/web/src/components/MarketingWorkspace.jsx
apps/web/src/components/PublishingViews.jsx
apps/web/src/components/GoogleAccount.jsx
apps/web/src/pages/Auth.jsx
apps/web/src/lib/api.js
apps/api/controllers/marketing.controller.mjs
packages/contracts/marketing.mjs
scripts/smoke-marketing.mjs
```

## 3. Thu thập giao diện mẫu

### Điều kiện quan sát

`publish.buffer.com` là app có đăng nhập. Trang `buffer.com/publish` chỉ có demo công khai, không chứng minh đã quan sát toàn bộ app thật.

Nếu không truy cập được màn hình sau đăng nhập, cần ảnh/video do chủ dự án cung cấp hoặc phiên trình duyệt đã đăng nhập do chủ dự án kiểm soát. Không yêu cầu gửi mật khẩu/cookie vào chat, không vượt kiểm tra bảo mật và không tự tưởng tượng phần chưa quan sát được.

### Các màn hình cần có bằng chứng

| Màn hình | Trạng thái cần quan sát |
| --- | --- |
| Khung ứng dụng | Sidebar, header, workspace, channel đang chọn, menu tài khoản |
| Danh sách bài | Hàng chờ, nháp, đã đăng, lỗi, bộ lọc, không có dữ liệu |
| Lịch | Tuần/tháng, trước/sau/hôm nay, bài trong lịch, popup liên quan |
| Trình soạn | Chọn nhiều kênh, nội dung theo kênh, media, preview, lưu nháp |
| Lên lịch | Chọn tài khoản, ngày/giờ, xác nhận, thông báo lỗi |
| Kết nối kênh | Chọn nền tảng, bắt đầu kết nối, đã kết nối, kết nối thất bại |
| Chi tiết bài | Nội dung, tài khoản, trạng thái, lịch, permalink, nhật ký và thao tác |
| Cài đặt | Các màn hình trong phạm vi mà BotAds có chức năng tương ứng |

Chụp desktop **1440×1000**, mobile **390×844** và breakpoint trung gian có thay đổi bố cục. Ghi trigger → kết quả cho các tương tác click, hover, bàn phím, cuộn và thời gian nếu có.

### Thông số cần đo

Đọc computed styles khi có thể: font, weight, size, line-height, letter-spacing, màu, chiều rộng sidebar, chiều cao header, khoảng cách, padding, border, radius, shadow, kích thước modal, sticky/fixed và breakpoint.

Ghi tài nguyên nguồn, kích thước và cách crop. Nếu không thể dùng font/tài nguyên gốc, nêu rõ phương án thay thế và khác biệt. Không lấy ảnh khách hàng, số liệu hoặc lời chứng thực của Buffer làm dữ liệu thật cho BotAds.

## 4. Triển khai theo thứ tự

### Bước A — Khung ứng dụng

Dựng typography, màu, spacing và component dùng chung trước: sidebar, header, navigation, nút, tab, dropdown, badge, modal và empty state. So sánh khung với mẫu ở desktop/mobile trước khi mở rộng các màn hình.

### Bước B — Danh sách bài và kết nối kênh

Đối chiếu thẻ bài, bộ lọc, tab, trạng thái và thao tác. Kết nối các điều khiển với dữ liệu thật từ API. Trang channel phải phân biệt nền tảng tự đăng với nền tảng thủ công, có trạng thái cấu hình và lỗi rõ ràng.

### Bước C — Trình soạn và lên lịch

Dựng theo bố cục mẫu đã quan sát: chọn kênh, vùng viết, media, preview và các bước lưu/lên lịch. Giữ kiểm tra nội dung theo nền tảng, tags DEV, canonical, UTM và consent ảnh. Không chỉ đổi CSS của form dài rồi coi là đã giống trình soạn mẫu.

### Bước D — Lịch và chi tiết bài

Tái hiện các góc nhìn và popup có chức năng thật tương ứng. Hiển thị đúng trạng thái, tài khoản, nội dung đã duyệt và permalink. Chỉ thêm kéo thả/chỉnh lịch nếu backend đã có thao tác cập nhật an toàn; nếu chưa có, ghi là khoảng trống chức năng, không làm tương tác giả.

### Bước E — Responsive và khả năng truy cập

Kiểm tra chiều rộng nhỏ, breakpoint trung gian, màn hình rộng, nội dung dài, ảnh và nhiều kênh. Modal cần quản lý focus, đóng bằng Escape, khóa cuộn nền và trả focus về nút mở. Các điều khiển phải có nhãn và trạng thái focus nhìn thấy được.

Có thể tổ chức lại component/CSS trong phạm vi UI để bảo trì dễ hơn; tránh tiếp tục chồng các lớp override gây xung đột.

## 5. Chức năng BotAds phải giữ

- Đăng ký/đăng nhập mật khẩu và Google; liên kết Google với tài khoản có sẵn.
- Phiên đăng nhập, phân tách workspace và quyền truy cập dữ liệu.
- LinkedIn OAuth và DEV API key; không đưa credentials ra frontend/log/Git.
- Lưu nháp, nội dung riêng từng kênh, duyệt phiên bản và snapshot lịch đăng.
- Upload ảnh, quyền truy cập ảnh riêng tư và consent ảnh công khai.
- Đặt lịch, hủy, xử lý bài đến hạn, permalink và nhật ký.
- Không tự thử lại bài chưa rõ kết quả; giữ quy trình kiểm tra trước khi gửi lại.
- Giữ khác biệt giữa API xác nhận đã đăng và người dùng tự xác nhận.

Phạm vi tích hợp hiện tại:

| Nền tảng | Hành vi |
| --- | --- |
| LinkedIn, DEV | Tự đăng qua API khi tài khoản đã kết nối và đủ quyền |
| Medium, Reddit, Indie Hackers | Hỗ trợ chuẩn bị nội dung và đăng thủ công |
| Facebook Groups | Qua companion trên máy tính |
| Google | Đăng nhập BotAds, không phải quyền đăng bài mạng xã hội |

Không thêm nút không có hành vi thật hoặc báo thành công khi backend chưa xác nhận. Chỉ thể hiện các tính năng Buffer khác như phân quyền nhóm, thống kê tự động hay lịch lặp khi chúng đã được triển khai thật; nếu chưa có, đưa vào danh sách thiếu.

## 6. Chạy dự án local

Yêu cầu Node.js 22. Lần đầu hoặc khi dependency/migration thay đổi:

```powershell
cd D:\botAds
npm ci
npm run cloud:setup
```

Terminal thứ nhất:

```powershell
npm run cloud:dev
```

Terminal thứ hai:

```powershell
npm run web:dev
```

Mở **http://127.0.0.1:5173**. Backend ở cổng 8899. Local dùng database riêng. Dùng fixture/tài khoản thử cho QA; việc dùng key thật vẫn có thể đăng bài thật.

## 7. Đối chiếu và sửa

Lưu ảnh và ghi chú ở `docs/research/buffer/`. Mỗi màn hình phải có ảnh nguồn và local tương ứng, cùng viewport, trạng thái và vị trí cuộn. Đợi font/media ổn định trước khi so sánh.

Sửa theo thứ tự:

1. Bố cục, thành phần thiếu và kích thước tổng thể.
2. Font, độ đậm, xuống dòng và độ rộng nội dung.
3. Khoảng cách, căn chỉnh, kích thước ảnh và crop.
4. Màu, border, radius, shadow và icon.
5. Hover, focus, responsive và chuyển động.

Không dùng ảnh demo cũ làm bằng chứng cho màn hình app chưa được quan sát. Không coi build thành công là nghiệm thu giao diện.

## 8. Kiểm tra bắt buộc

```powershell
npm run web:build
npm run web:check
npm run test:saas
npm run test:marketing:ui
```

Thử trong trình duyệt: điều hướng, connect, soạn, preview, lưu, duyệt, lên lịch, mở chi tiết, xử lý lỗi và đóng popup. Kiểm tra bàn phím, tràn ngang, tài nguyên lỗi và JavaScript runtime. Cập nhật selector khi UI đổi nhưng không bỏ kiểm thử chức năng để lấy kết quả xanh.

## 9. Tiêu chí bàn giao

- Các màn hình trong phạm vi đều có giao diện và tương tác thực tế.
- Có ảnh đối chiếu desktop/mobile của từng màn hình chính.
- Các kiểm tra phù hợp đã chạy và kết quả được ghi rõ.
- Luồng đăng bài và đăng nhập hiện tại được giữ nguyên hoặc có bằng chứng kiểm thử sau thay đổi.
- Nêu cụ thể khác biệt còn lại: font, thành phần, hành vi, phần chưa có backend hoặc thiếu quyền quan sát.
- Không tuyên bố “giống 100%” hoặc “pixel-perfect” khi chưa có bằng chứng đối chiếu.
- Bàn giao code local, hướng dẫn chạy và danh sách thiếu; chưa tự deploy.
