# Triển khai luồng tham gia nhóm Facebook — 1.1.14

Tài liệu khách hàng: [FACEBOOK_GROUPS_GUIDE.md](FACEBOOK_GROUPS_GUIDE.md).

## Phạm vi

Luồng web: tìm/nhập nhóm → chọn nhóm → xin tham gia nếu cần → theo dõi/hoàn tất câu hỏi → kiểm tra trạng thái → duyệt quyền đăng → tạo và chạy chiến dịch → xem nhật ký.

Không tự xin tham gia toàn bộ kết quả tìm kiếm. Khách chọn danh sách và xác nhận trước. Không bắt tham gia các nhóm đã cho phép tạo bài. Tham gia nhóm không tự duyệt nội dung, không tự chạy chiến dịch và không thay thế bước duyệt bài của quản trị viên.

## API và dữ liệu

- Migration `0013_facebook_membership.sql` thêm loại tác vụ vào hàng chờ discovery, trạng thái chi tiết và tài khoản kiểm tra trên nhóm, bảng kết quả từng nhóm.
- `POST /api/facebook/groups/membership`: `{ ids, operation: "join" | "check" | "open", confirmed }`.
- `join`: tối đa 20 nhóm, cần `confirmed:true`, không nhận nhóm đã loại.
- `check`: tối đa 50 nhóm, chỉ đọc trạng thái.
- `open`: đúng 1 nhóm, mở trong phiên Facebook BotAds trên desktop để khách thao tác.
- GET thư viện hiện có trả cả loại tác vụ và kết quả từng nhóm.
- Dùng lại claim/heartbeat/report/cancel của discovery và khóa loại trừ với campaign/social. Mỗi workspace chỉ một lượt tìm/tham gia đang chờ hoặc chạy.
- Chỉ desktop gửi `membershipSupported:true` mới claim tác vụ mới. Desktop cũ không hiểu tác vụ không được nhận nhầm.
- Đối chiếu quyền workspace, thiết bị, tài khoản, nhóm thuộc snapshot, lease và sequence; report lặp không tăng số nhóm.
- Nhóm nhập link ghi nhận tài khoản đã kiểm tra trong `membership_account_key`; chiến dịch dùng tài khoản này khi ràng buộc thiết bị.

## Desktop

- Tác vụ chạy trên worker Facebook hiện có, dùng tab riêng trong phiên đã kết nối.
- Lưu và gửi intent trước tương tác; lưu từng kết quả trước khi upload. Nếu mất mạng, giữ kết quả cục bộ để gửi lại; không tự lặp thao tác xin tham gia chưa rõ kết quả.
- Kiểm tra trạng thái đã tham gia/chờ trước khi bấm Join. Trước tương tác kiểm tra hủy, lease, hạn chế Facebook và danh tính cookie `c_user`.
- Một lần click Join; không force click hay retry mù khi timeout.
- Giãn 30 giây giữa các nhóm trong lượt xin tham gia. Gặp câu hỏi thì giữ tab để khách hoàn tất, không tự trả lời.
- Lỗi riêng một nhóm được ghi chưa xác nhận và tiếp tục nhóm sau. Halt vì phiên/tài khoản, hạn chế, lease hoặc hủy sẽ dừng cả lượt.
- Hủy tác vụ không thu hồi yêu cầu đã gửi tới Facebook. Kết quả đã được server nhận giữ nguyên; phần chưa rõ cần kiểm tra lại.
- Thao tác kiểm tra/mở không click Join và không đăng bài.

## Đưa lên production

1. Review, commit và push mã nguồn lên nhánh được workflow production theo dõi.
2. CI áp dụng migrations, gồm `0012` nếu chưa có và **`0013` trước API/web mới**. Workflow hiện dùng `wrangler d1 migrations apply`; không chạy riêng file SQL nhiều lần.
3. Workflow build/phát hành desktop **1.1.14**. Khách đang dùng bản có updater có thể kiểm tra cập nhật; lần nâng cấp này cần app mới để nhận tác vụ tham gia.
   Nếu phân phối macOS, chạy workflow macOS tương ứng cho cùng phiên bản, với cấu hình signing/notarization đã chuẩn bị.
4. Không cần thêm OAuth app, Meta API key hoặc secret cho tính năng này.
5. Kiểm thử thật một nhóm của bạn: tìm → xin tham gia → kiểm tra → duyệt → tạo chiến dịch → chạy → xem bằng chứng bài đăng. Với nhóm có câu hỏi, kiểm tra tab vẫn mở và thao tác check không gửi lại yêu cầu.

Máy đang dùng app cũ vẫn dùng tác vụ cũ; nó không nhận tác vụ tham gia. Tác vụ mới chờ máy tương thích và hết hạn sau 2 giờ nếu không được nhận. Không cần xóa dữ liệu hoặc ghép lại máy để cập nhật.

## Kiểm tra bản mã nguồn 1.1.14

- SaaS: **187/187** qua, gồm 177 bài chạy trong môi trường cục bộ và 10 bài cửa sổ đăng nhập chạy riêng với trình duyệt hệ thống. Một lượt chạy ngoài sandbox trước đó lỗi kết nối localhost; các bài đó đã chạy lại qua trong môi trường phù hợp.
- Automation hiện có: **45/45** qua.
- Kiểm thử giao diện qua: membership (desktop/mobile và race tải trạng thái cũ), Facebook pairing/campaign, simplified Run, companion onboarding, marketing, Threads/Instagram.
- **348** file nguồn ứng dụng/packages đều dưới 200 dòng; kiểm tra whitespace qua.
- Build web, Pages Functions và Worker production dry-run qua; chưa deploy qua các lệnh kiểm tra này.
- Windows Lite **1.1.14** đã build tại `release/lite/BotAds-Setup-1.1.14-Lite.exe`, khoảng 115 MB. Verifier kiểm tra source đóng gói, dữ liệu riêng không bị kèm vào bộ cài và checksum feed cập nhật đều qua.
- Đã chạy ẩn bản `release/lite/win-unpacked/BotAds.exe` với userData kiểm thử riêng: phiên bản đúng, giao diện mở, module membership nạp được và trình duyệt hệ thống chạy trang giả lập được.

## Giới hạn nghiệm thu

Các bài kiểm thử API, browser fixture và desktop client không xin tham gia hoặc đăng lên nhóm Facebook thật. Việc duyệt thành viên/bài phụ thuộc Facebook và quản trị viên. Bản build cục bộ không có nghĩa là đã phát hành lên production hoặc đã được khách cài.
