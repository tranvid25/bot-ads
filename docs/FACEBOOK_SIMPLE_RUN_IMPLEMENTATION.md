# Luồng Facebook đơn giản — desktop 1.1.13

## Khách sử dụng

Lần đầu ghép website và đăng nhập Facebook. BotAds tự xác minh, lưu phiên mã hóa và báo sẵn sàng. Sau đó vào chiến dịch trên website, bấm **Chạy**; không có bước Hoàn tất kết nối hoặc Bật nhận việc bắt buộc.

Browser đăng nhập có thể giữ mở. Tác vụ chạy trên trang riêng trong cùng phiên, không điều hướng/đóng tab khách đang xem. Nếu khách đóng browser khi idle, tác vụ sau mở lại bằng phiên đã lưu. App cần còn hoạt động và máy có mạng.

Khi máy được chủ động tạm dừng, bấm Chạy trên website có lựa chọn **Tiếp tục và chạy**. Lệnh được gửi tới máy đã ghép, không yêu cầu ngắt/ghép lại. Mất mạng hiện hướng dẫn mở app và tự chờ nối lại. Chỉ thu hồi pairing hoặc đổi tài khoản mới cần thao tác tương ứng.

## Thay đổi chính

- Worker Facebook tồn tại giữa các tác vụ nhưng chỉ giữ khóa khi thực sự làm việc; bộ chạy Threads/Instagram vẫn tách biệt.
- CLI login vẫn hỗ trợ cách đóng cửa sổ thủ công. Desktop dùng autoFinish sau hai mẫu hợp lệ và giữ browser.
- Adapter phiên cấp trang riêng, release chỉ đóng trang làm việc. Không đóng cả context/browser dùng chung khi kết thúc từng stage.
- Kiểm tra c_user thực trong context trước khi cấp trang, từ chối khi khách đã đổi/đăng xuất tài khoản trong browser.
- Kiểm tra lại danh tính ngay trước giữ chỗ và trước bấm gửi. Đổi sang tài khoản khác thì dừng để người dùng xác nhận, không tự đóng tab và chạy tiếp dưới tài khoản khác.
- Login thành công tự nhận việc; lựa chọn tạm dừng chủ động vẫn được giữ. Bản cũ có flag false vẫn được tiếp tục từ web, không xóa cấu hình để di trú.
- Trạng thái gửi cùng heartbeat: ready, connecting, login_required, paused, working, syncing. Web lấy trạng thái thiết bị qua API có xác thực.
- Lệnh connect/resume có ID, scope workspace/device, thời hạn 10 phút, chỉ một lệnh pending cùng loại và ACK lặp an toàn. Thiết bị bị thu hồi không nhận lệnh.
- Hết phiên khi chưa có lượt gửi chưa rõ kết quả: xếp lại cùng job, tự mở đăng nhập và tiếp tục khi xác minh xong. Không tạo job mới, không gia hạn lịch đã quá hạn.
- Nếu đã có submitting/unknown thì giữ needs_review, không tự gửi lại.
- Báo cáo đồng bộ có khóa chống chạy chồng. Đóng/thoát/đổi workspace ngắt worker cũ để không dùng nhầm phiên.
- Các nút xóa liên kết, đổi tài khoản và nhận việc thủ công nằm trong Nâng cao; trạng thái và Mở chiến dịch là nội dung chính.

## Triển khai

- Migration `0012_desktop_runtime.sql`: trạng thái và lệnh thiết bị.
- Deploy backend và web, cập nhật desktop 1.1.13. Không cần secret mới.
- Workflow production áp dụng migration; heartbeat cũ không có runtime vẫn hoạt động. Installer mới cần các module phiên/điều phối mới trong ASAR.
- Không thay đổi API đăng bài LinkedIn/DEV/Bluesky, không dùng chung session Facebook cho Threads/Instagram.
- Chu kỳ nhận việc vẫn theo scheduler có sẵn; Chạy hiển thị chờ máy nhận, không hứa đã gửi Facebook ngay khi enqueue thành công.

## Kiểm tra và giới hạn

Các test mới bao gồm browser giữ mở qua hai tác vụ, không đổi tab người dùng, từ chối đổi tài khoản, worker nhận nhiều yêu cầu mà không thoát, xác thực tự hoàn tất, trạng thái/lệnh theo workspace, timeout/ACK, và retry auth chỉ khi an toàn.

Smoke UI kiểm tra Chạy trong trang chiến dịch với máy ready/paused/login_required/offline và desktop không còn các bước bắt buộc cũ. Toàn bộ thử nghiệm dùng fixture/local; cần nghiệm thu Facebook thật sau cập nhật. Không xóa các attempts chưa xác nhận từ phiên bản cũ.
