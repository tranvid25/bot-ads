# Facebook: nhận việc và nhật ký chiến dịch — 1.1.10

> Hướng dẫn lịch sử cho 1.1.10–1.1.12. Từ **1.1.13**, đăng nhập xong tự sẵn sàng; không cần Hoàn tất/Bật nhận việc. Dùng [luồng mới](FACEBOOK_SIMPLE_RUN_IMPLEMENTATION.md).

## Người dùng bắt đầu như thế nào?

1. Đăng nhập website BotAds → Thiết bị → tạo mã liên kết.
2. Mở desktop → liên kết với địa chỉ BotAds và mã. Địa chỉ này không phải website được quảng cáo.
3. Kết nối Facebook → đăng nhập trong cửa sổ BotAds → Hoàn tất kết nối Facebook.
4. Bật nhận việc Facebook. App báo rõ đang nhận việc và chờ chiến dịch đến hạn.
5. Trên website: tìm/import nhóm, kiểm tra và duyệt nhóm, chọn nội dung, tạo chiến dịch, Đăng ngay hoặc Đặt lịch.
6. Bấm Nhật ký chiến dịch để theo dõi từng lượt gửi và mở bài đã xuất bản.

Có thể soạn trước bước 2–4. Đến lúc chạy, máy cần bật, có mạng và bật nhận việc.
Lần sau app giữ lựa chọn nhận việc đã lưu; phiên cũ còn hợp lệ thì không cần đăng nhập lại.
Máy đã ghép từ phiên bản cũ giữ hành vi nhận việc cũ để không âm thầm ngừng các lịch đang dùng.

## Nút và trạng thái desktop

- Nút Bật nhận việc bị khóa nếu chưa ghép, chưa có phiên, đang đăng nhập, mất liên lạc với server hoặc đang bận.
- Mỗi điều kiện thiếu có lời giải thích ngay trong app.
- Khi đã bật, nút chuyển thành Đã bật nhận việc Facebook; dòng trạng thái giải thích chờ chiến dịch đến hạn.
- Tạm dừng Facebook giữ lựa chọn trong kho mã hóa. Nút này không dừng nhầm Threads/Instagram đang chạy.
- Khi phát hiện đăng nhập Facebook hết hạn/xác minh, đánh dấu phiên cần kết nối lại và ngừng nhận việc Facebook mới.
- Tác vụ đã gửi nhưng mất mạng được giữ trên máy để đồng bộ lại; không tự gửi lại bài.

## Nhật ký và số liệu

- Mở từ thẻ chiến dịch: toàn bộ lịch sử chiến dịch. Mở từ Nhật ký trong bảng lượt chạy: lọc đúng lượt đó.
- Tổng trạng thái do D1 tính từ toàn bộ attempts của chiến dịch, không lấy số dòng ở dashboard hoặc trang hiện tại.
- Một nội dung gửi vào ba nhóm là ba lượt gửi. Chờ duyệt không cộng vào đã xuất bản.
- Bảng phân trang 20 kết quả; có bộ lọc trạng thái, lượt chạy gần đây và tìm bài/URL nhóm.
- Chi tiết lần gửi có nội dung thực gửi, lỗi, thời điểm kiểm tra, kết quả bình luận và permalink nếu xác minh được.
- Các lý do bỏ qua trước khi có reservation nằm trong log lượt chạy; không biến các nhóm chưa gửi thành bài đã đăng.
- Nội dung chi tiết của bản cũ có thể chưa được lưu lên server. Không dựng lại nội dung rồi coi là bản đã gửi.
- Kiểm tra lại kết quả tạo yêu cầu cho đúng máy đã đăng. Máy cần còn dữ liệu bằng chứng gốc.
- Đối soát chỉ đọc bài, không gửi lại bài hoặc bình luận. Không tìm thấy chưa đủ để kết luận thất bại.
- Báo cáo thành công không bị một báo cáo unknown cũ ghi đè. Link/nội dung đã có không bị xóa bởi báo cáo thiếu trường.
- Báo cáo dài chia theo dung lượng; chỉ chốt hoàn tất sau khi gửi hết các phần.

## Cách xác minh

Giữ snapshot đường dẫn trước khi gửi; chuẩn hóa permalink bỏ tham số theo dõi để không nhận nhầm link cũ thành mới.
Đọc thêm dạng story.php và mở nội dung Xem thêm trong bài. Đối soát không có link sẵn cần nội dung, link mới và danh tính người đăng phù hợp; bài quá ngắn hoặc thiếu snapshot vẫn có thể chưa xác nhận.
Facebook đổi giao diện, bài chờ duyệt hoặc không còn bằng chứng gốc vẫn cần kiểm tra trực tiếp. Chưa có nghiệm thu trên tài khoản Facebook thật cho bản sửa này.

## Triển khai

- Migration mới: `apps/api/migrations/0011_facebook_rechecks.sql` (bảng đối soát + index lịch sử).
- Workflow production áp dụng D1 migrations, deploy backend rồi frontend; desktop release có thể tới trước backend nên client bỏ qua endpoint đối soát chưa tồn tại (404).
- Bản desktop mới: **1.1.10**; cần phát hành/cập nhật bản này để dùng điều kiện nút, hướng dẫn và đối soát mới.
- Không cần thêm secret. Không đổi hợp đồng đăng bài LinkedIn/DEV/Bluesky/Threads/Instagram.
- Mac dùng cùng mã desktop; ký/notarize và build native vẫn theo workflow Mac hiện có.

## Kiểm tra

- `npm run check:source`, `npm run web:build`, `npm run cloud:build:production`.
- `npm test` và `npm run test:saas`.
- `npm run test:facebook:ui`, `npm run test:campaign:ui`, `npm run test:companion:ui`.
- `npm run test:marketing:ui`, `npm run test:social:ui`.
- Các smoke test dùng fixture/local, không đăng bài thật và không sửa tài khoản production.
