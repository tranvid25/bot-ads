# Kiểm tra kết nối app máy tính (1.1.2)

Ô Địa chỉ máy chủ BotAds phải là nơi đăng nhập dashboard và tạo mã ghép máy, mặc định `https://bot.salesora.space`. Website được quảng bá như `xaywebsite.com` chỉ dùng trong thương hiệu và nội dung bài; không dùng để ghép máy.

1. Trên dashboard BotAds vào Thiết bị, tạo mã liên kết mới.
2. Nhập địa chỉ BotAds và mã vào app rồi bấm Liên kết máy tính.
3. Nếu lỗi, bấm **Mở nhật ký kết nối** ngay trong phần Hoạt động gần đây của app. Nút này dùng được trước khi ghép máy.
4. Nhật ký `connection-diagnostics.json` nằm trong thư mục userData của Electron: thông thường `%APPDATA%/botads` trên Windows hoặc `~/Library/Application Support/botads` trên Mac. Tên thư mục phụ thuộc tên app đã đóng gói; nút trong app mở đúng file thực tế.

File giữ tối đa 100 sự kiện gần nhất gồm thời gian, phiên bản, địa chỉ máy chủ và HTTP status. Không ghi mã ghép, token, mật khẩu, cookie, nội dung bài hoặc toàn bộ phản hồi máy chủ. Log này dành cho kết nối ghép máy, không phải nhật ký mọi tác vụ. Kết quả chạy bài xem trên dashboard và Hoạt động gần đây.

- HTTP 404/405: kiểm tra đúng địa chỉ BotAds và tuyến API; tạo mã mới không sửa được lỗi sai địa chỉ.
- Lỗi mạng: kiểm tra mạng, HTTPS, DNS hoặc máy chủ có hoạt động không.
- Mã sai/hết hạn: tạo mã mới trên cùng dashboard BotAds, rồi thử lại.
- Bản app cũ chưa có nút log: cài đè 1.1.2; có thể sửa địa chỉ trong bản cũ để ghép trước, không cần đợi nút log.

Nếu lỗi đến từ backend, đối chiếu thời gian trong file với log Worker trong Cloudflare Dashboard (Worker backend → Logs) hoặc `npx wrangler tail --env production` tại repo đã đăng nhập Cloudflare. Không gửi toàn bộ credentials.bin hoặc dữ liệu session để tìm lỗi.
