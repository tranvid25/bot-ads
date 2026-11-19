# Sửa lỗi nút Post không bấm được — desktop 1.1.11

Log `locator.click: Timeout ... locator resolved to ... aria-label="Post"` chỉ cho biết đã tìm được phần tử. Chưa đủ log để xác định chính xác Facebook đang khóa nút, có lớp phủ hay giao diện còn thay đổi.

Log đầy đủ được bổ sung sau đó ghi rõ `element is visible, enabled and stable` và phần tử `10K posts` chặn pointer events. Hai bài tương ứng trong lịch sử máy kết thúc bằng hashtag: có cơ sở nghi ngờ bảng gợi ý hashtag che nút, không phải nút disabled. Bản sửa chuyển focus bằng Tab khi hit-test nhận ra gợi ý số bài che nút; không bấm chọn gợi ý, không dùng Escape đóng nhầm composer và không force click. Vẫn kiểm tra actionability sau khi chuyển focus; lớp phủ không đóng thì báo lỗi, không ép gửi.

Code trước đây chỉ kiểm tra `aria-disabled` tối đa 10 lần rồi bấm tiếp dù vẫn disabled. Việc giữ chỗ và đánh dấu đang gửi xảy ra trước thao tác click, nên timeout có thể hiển thị Chưa xác nhận dù Facebook chưa nhận bài.

Thay đổi:

- Chọn hộp soạn đang hiển thị và nút Post đang hiển thị.
- Kiểm tra nội dung thực đã nằm đầy đủ trong hộp soạn.
- Dùng Playwright trial click để kiểm tra disabled, vị trí, lớp phủ và độ ổn định mà không gửi bài.
- Thông báo chọn ảnh không còn khẳng định upload hoàn tất chỉ dựa vào việc đã chờ 5 giây.
- Chờ tối đa 45 giây trước khi giữ chỗ; kiểm tra lại sau khi giữ chỗ trước khi bấm thật.
- Không dùng force click, không tự xóa lớp phủ và không tự bấm gửi nhiều lần.
- Nếu chưa tới thao tác bấm thật: báo thất bại kèm nguyên nhân đọc được, thay vì coi là đã gửi.
- Nếu thao tác bấm thật đã bắt đầu nhưng kết quả chưa rõ: vẫn giữ Chưa xác nhận và yêu cầu đối soát để tránh đăng trùng.

Các lượt Chưa xác nhận từ phiên bản cũ không được tự đổi thành thất bại. Kiểm tra Facebook hoặc dùng Kiểm tra lại kết quả trước khi gửi lại.

Cần phát hành/cập nhật desktop **1.1.11** để nhận bản sửa; chỉ deploy web không cập nhật phần điều khiển trình duyệt của app đã cài. Không cần secret hoặc migration mới. Chưa nghiệm thu với tài khoản Facebook production.
