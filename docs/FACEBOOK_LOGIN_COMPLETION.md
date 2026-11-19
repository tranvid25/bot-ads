# Hoàn tất kết nối Facebook — bản 1.1.9

> Tài liệu lịch sử cho bản cũ. Từ **1.1.13**, BotAds tự hoàn tất và nhận chiến dịch sau khi đăng nhập, không yêu cầu đóng Chrome hoặc bấm Hoàn tất. Xem [luồng hiện tại](FACEBOOK_SIMPLE_RUN_IMPLEMENTATION.md).

Đã lưu phiên là bước lưu cookie mã hóa, chưa kết thúc tác vụ đăng nhập. App không nhận tác vụ tìm nhóm/đăng bài khi cửa sổ đăng nhập còn đang được người dùng thao tác.

Sau khi app báo lưu phiên, bấm **Hoàn tất kết nối Facebook** ngay bên dưới phần Facebook. App kiểm tra phiên hiện tại, lưu lại và đóng cửa sổ do BotAds mở để giải phóng lượt làm việc. Vẫn có thể tự đóng toàn bộ tab/cửa sổ BotAds thay cho nút này.

Trong lúc đăng nhập, heartbeat tiếp tục chạy mỗi chu kỳ để máy không bị đánh dấu offline chỉ vì đang đăng nhập. Heartbeat không được phép nhận job trong giai đoạn này. Nếu không liên lạc được backend thì vẫn báo lỗi mạng; phiên đã lưu không chứng minh máy đang online.

Nếu bấm Nhận việc khi chưa hoàn tất, app nhắc dùng nút Hoàn tất trước. Bản 1.1.9 hiển thị trạng thái chờ kết nối riêng, thay vì chỉ ghi Chưa có lượt chạy.

Web có nút Cập nhật trạng thái trong panel Cần chú ý để lấy lại dashboard theo yêu cầu, không tăng tần suất polling.

Với app cũ bị kẹt: thoát hẳn từ khay hệ thống, mở lại, chưa bấm Đăng nhập lại nếu phiên đã lưu, bấm Nhận việc. Nếu vẫn không nhận việc, xem lỗi ở đầu app và nhật ký lượt chạy; chưa kết luận từ cảnh báo offline trên ảnh chụp.

Code 1.1.9 cần build/phát hành installer mới, không được cài tự động chỉ bằng deploy web. Workflow production hiện phát hành Lite/Full trước khi đổi DOWNLOAD_URL.
