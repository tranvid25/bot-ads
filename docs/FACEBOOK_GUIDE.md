# Hướng dẫn bắt đầu Facebook Groups với BotAds

## 1. Kết nối máy và Facebook

1. Đăng nhập BotAds, chọn **Facebook Groups** ở thanh bên. Bốn bước trên màn hình cho biết bạn cần làm tiếp việc gì.
2. Mở **Thiết bị Facebook**, tải và cài bản ứng dụng mới có tính năng tìm nhóm.
3. Bấm **Tạo mã liên kết**. Trong app, nhập địa chỉ BotAds đang dùng, ví dụ `https://bot.salesora.space`, và mã vừa tạo. Mã dùng một lần, hết hạn sau 10 phút.
4. Bấm **Kết nối Facebook** trong app và đăng nhập ở cửa sổ trình duyệt được mở. BotAds lưu phiên được mã hóa trên máy.
5. Giữ app và máy có mạng; nếu đã dừng nhận việc, bấm tiếp tục trong app.

Địa chỉ BotAds giúp app nhận lịch. Website cần quảng bá, chẳng hạn `https://xaywebsite.com`, được đặt trong nội dung bài; không nhập website quảng bá vào ô liên kết app.

## 2. Tìm hoặc nhập nhóm, sau đó duyệt

- Trong **Facebook Groups**, nhập từ khóa dịch vụ, mỗi dòng một từ khóa, và giới hạn 1–50 kết quả. Bấm **Tìm nhóm, chưa đăng bài**.
- Máy tìm theo từ khóa và đồng bộ thêm nhóm đã tham gia trong giới hạn kết quả. Lượt tìm chỉ thu thập và đánh giá; không tham gia nhóm và không đăng bài.
- Bạn cũng có thể nhập URL nhóm đã biết khi chưa tìm được nhóm bằng máy.
- Tại **Thư viện nhóm Facebook**, lọc theo nguồn, membership hoặc trạng thái duyệt. Mở nhóm, kiểm tra nội quy và quyền đăng nội dung dịch vụ rồi bấm **Duyệt nhóm**.
- Nhóm đã duyệt mới chọn được. Duyệt lại sau 7 ngày; nếu kết quả kiểm tra thay đổi, nhóm quay về chưa duyệt. Không trộn nhóm gắn với nhiều tài khoản Facebook trong cùng một chiến dịch.

Tìm thấy nhóm hoặc đã tham gia nhóm không có nghĩa là được đăng quảng cáo. Nhóm có thể cần quản trị viên duyệt thành viên hoặc duyệt bài.

## 3. Soạn bài và tạo chiến dịch

1. Chọn các nhóm đã duyệt, bấm **Soạn bài cho … nhóm đã chọn**.
2. Nhập tên chiến dịch, nội dung, ảnh nếu có và link dịch vụ của bạn.
3. Trong **Nhóm mục tiêu**, nhập từ khóa chủ đề và kiểm tra nhóm đã chọn. Thư viện có thể mở ở tab riêng để giữ nháp; sau khi duyệt thêm nhóm, quay lại và bấm tải lại danh sách.
4. Trong **Lịch & giới hạn**, kiểm tra số nhóm/bài, hạn mức ngày, khoảng nghỉ, giờ và ngày chạy.
5. **Lưu chiến dịch** giữ nháp. Muốn chạy vào lịch, bật **Bật lịch tự động sau khi lưu**. Muốn chạy ngay, lưu rồi bấm **Chạy** trong danh sách chiến dịch.

Nháp chưa có nhóm vẫn lưu được khi có nội dung và từ khóa chủ đề. Chưa có nhóm hợp lệ thì chưa chạy hoặc bật lịch được. Tìm nhóm và tự tham gia nhóm không còn nằm trong lượt đăng của chiến dịch mới.

## 4. Kiểm tra kết quả

Mở **Kết quả** qua bước 4 của hướng dẫn. Xem từng lượt và từng nhóm: đã xuất bản, chờ quản trị viên duyệt, lỗi hoặc chưa xác định. Có link bài khi máy xác định được. Không coi trạng thái đang chạy hoặc đã bấm gửi là đã đăng thành công.

- Máy offline: hàng chờ đợi tối đa khoảng 2 giờ; không đăng bù nhiều ngày.
- Tìm nhóm mất kết nối: lease hết thì dừng; mở máy rồi tạo lượt tìm mới. App không tự lặp lại lượt tìm bị ngắt.
- Đổi tài khoản Facebook: cần dùng đúng tài khoản gắn với nhóm; khác tài khoản thì lượt đăng dừng trước khi thực hiện.
- Kết quả chưa rõ: kiểm tra trên Facebook và đối soát trước khi chạy lại, tránh đăng trùng.

## Chạy bản mới ở local

Tại thư mục dự án, chạy lần lượt:

```powershell
npm ci
npm run cloud:setup
```

Mở hai terminal:

```powershell
# Terminal 1: API và D1 local
npm run cloud:dev
```

```powershell
# Terminal 2: frontend
npm run web:dev
```

Mở địa chỉ Vite in ra (mặc định `http://127.0.0.1:5173`). Với app máy tính local, dùng cùng địa chỉ `http://127.0.0.1:5173` làm địa chỉ website, tạo mã trong chính tài khoản local đó. Chạy app từ terminal thứ ba:

```powershell
npm run desktop
```

Secrets local nằm trong `.dev.vars`, không commit. Luồng Facebook trên máy không cần OAuth Client Secret của LinkedIn/Google. Các đăng nhập OAuth vẫn cần cấu hình callback riêng khi thử local.
