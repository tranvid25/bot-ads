# Facebook: bảng gợi ý hashtag che nút Post — 1.1.12

Ảnh người dùng gửi và log `10K posts ... intercepts pointer events` xác nhận phần tử trong bảng gợi ý nằm trên nút Post. Log cũng xác nhận nút visible/enabled/stable, nên tăng thời gian chờ disabled không giải quyết nguyên nhân này.

## Bản sửa

- Nhận diện phần tử gợi ý số bài ở vị trí nút Post.
- Bấm vùng tiêu đề `Create post` / `Tạo bài viết` không phải control để đóng gợi ý trước khi gửi. Không chọn hashtag khác, không dùng force click hoặc Escape đóng composer.
- Nếu không tìm được tiêu đề an toàn, chuyển focus bằng Tab; nội dung phải vẫn khớp đầy đủ, không được có phần tự hoàn thành ngoài bài gốc.
- Kiểm tra lại nút bằng trial click rồi mới giữ chỗ và gửi. Bản thân thao tác đóng gợi ý/trial không đăng bài.
- Bấm thật chỉ một lần; chưa rõ kết quả vẫn cần đối soát để tránh trùng.
- Nhật ký khởi động ghi phiên bản desktop để phân biệt EXE đang chạy với mã trên web.
- Kiểm tra package bắt buộc có hai module `post_submit.cjs` và `post_suggestions.cjs`; kiểm tra nội dung bên trong ASAR khớp source.

## Sử dụng

Cần bộ cài **1.1.12**. Chỉ cập nhật web/backend không thay phần điều khiển trình duyệt trong EXE cũ. Dừng lượt hiện tại và thoát app ở khay hệ thống trước khi cài bản mới; không xóa dữ liệu tài khoản.

`Nghỉ 120s` là khoảng nghỉ giữa các nhóm theo cấu hình, không phải crash. Những lượt đã ghi Chưa xác nhận từ bản cũ cần kiểm tra Facebook trước khi chạy lại; bản sửa không tự xóa lịch sử đó.

Test mô phỏng bố cục ảnh đã kiểm tra: đóng popup bằng tiêu đề, không dùng Tab khi có tiêu đề, không thay nội dung, không gửi trong quá trình kiểm tra, chỉ gửi khi nút đã nhận click. Cần nghiệm thu thêm với giao diện Facebook thật sau khi cập nhật.
