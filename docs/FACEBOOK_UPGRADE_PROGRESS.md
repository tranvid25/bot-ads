# Tiến độ thực hiện nâng cấp Facebook — 1.1.8

Đây là đợt triển khai lõi, chưa phải hoàn tất toàn bộ plan hay nghiệm thu production.

## Bổ sung ngày 17/11/2026

Đã bổ sung trong mã nguồn và có test: lịch một lần theo timestamp ISO (không thay lịch tuần cũ), save-and-run trên backend, request ID/hash chặn tạo trùng và tái dùng cùng key cho nội dung khác, nhập nhóm CSV xuất từ Excel với kiểm tra URL trước insert và lọc trùng, tìm kiếm/phân trang 20 nhóm trong selector, chọn trang trong thư viện, xem xác nhận trước đăng ngay, tạo link UTM để khách chèn vào bài, xuất CSV các kết quả Facebook đã tải (tối đa 100).

CSV chưa đọc trực tiếp file .xlsx. UTM là công cụ gắn nguồn vào URL, chưa tích hợp GA4/thu chuyển đổi. Báo cáo chưa xuất toàn bộ lịch sử. Thời gian một lần có cửa sổ bắt kịp 2 giờ, không tự đăng bù nhiều ngày. Backend lưu dữ liệu lịch trong JSON chiến dịch hiện có, không cần migration cho các phần bổ sung này.

Các mục đã có ở đoạn trên thay thế trạng thái cũ tương ứng trong danh sách còn việc bên dưới. Chưa hoàn tất Fanpage/kiểm thử thật, đa máy/tài khoản, phân quyền, thư viện nội dung nâng cao, lịch tháng, media nâng cao, audit duyệt lô, telemetry theo từng bước và phát hành installer. Đang chờ URL Fanpage và xác nhận quyền quản lý của tài khoản kết nối để nghiệm thu đúng danh tính.

## Đã triển khai trong mã nguồn

### Bổ sung tiếp ngày 17/11/2026

- Người dùng đồng ý làm Fanpage sau. Phần còn lại không phụ thuộc URL/quyền Page.
- Thư viện bài viết lưu D1 theo workspace, tối đa 100 bài; lưu lại cùng source ID cập nhật bài hiện có. Có tìm kiếm, sao chép nội dung và ảnh vào chiến dịch, xóa riêng khỏi thư viện mà không đổi bài trong chiến dịch.
- Migration mới `0010_facebook_templates.sql` cần áp dụng trước khi dùng API thư viện; workflow deploy hiện chạy D1 migrations trước Worker. Chạy local phải chạy setup/migrate để nhận bảng mới.
- Panel “Cần chú ý” dùng dữ liệu dashboard hiện có, không thêm polling: chỉ ra máy offline khi có việc, job quá hạn/lỗi/cần kiểm tra và bài chưa rõ kết quả, trạng thái chờ xác nhận dừng. Có nút đến Thiết bị/Kết quả và ẩn trong lần xem hiện tại.
- Chưa phải thông báo push/email, chưa có phân quyền đội nhóm, đa tài khoản/máy hay định dạng video/carousel. Chưa nghiệm thu Facebook thật hoặc phát hành installer.

- Không bắt buộc nút Joined trước composer; lỗi không mở được composer tách khỏi thiếu thông tin thành viên.
- Thư viện chọn tất cả theo bộ lọc, bỏ chọn, duyệt hàng loạt qua một API; nhóm bị loại/có cảnh báo cấm hoặc điều kiện không được duyệt nhanh.
- Form chọn tất cả nhóm đủ điều kiện, đếm nhóm được chọn; checkbox/tên nhóm nằm ngang.
- Toast duyệt lô và hoàn tất lượt tìm (dựa groups_seen server, chưa có breakdown mới/trùng).
- Form có chọn đăng ngay sau lưu hoặc đặt lịch/lưu nháp. Đăng ngay tắt lịch lặp trong payload, dùng endpoint run hiện có.
- Xóa chiến dịch lưu tombstone trong JSON, tắt lịch, hủy queued, yêu cầu running dừng, giữ lịch sử.
- Dashboard không trả chiến dịch đã xóa; sửa/chạy lại bị chặn. Enqueue và reserve có điều kiện atomic chặn deleted/canceled.
- Polling tìm nhóm chỉ khi có task queued/running, không gọi chồng hoặc khi tab ẩn.

## Còn phải thực hiện

- Kiểm tra quyền composer chi tiết, các trạng thái permission riêng và evidence; test browser cho nhóm visitor/membership-required.
- Hợp đồng save-and-run có idempotency key xuyên suốt, lịch ngày giờ một lần và migration tương thích; hiện chỉ có lịch tuần cũ + run ngay.
- Báo cáo tiến độ từng giai đoạn và thống kê mới/trùng/chưa kiểm tra; log job/source; điều tra lease gián đoạn thực tế.
- Danh sách phân trang/select page/indeterminate, bộ lọc trạng thái và bản xem trước trước chạy hoàn chỉnh.
- Audit chi tiết duyệt lô, chứng minh hủy race trên thiết bị thật, thông báo xác nhận desktop đã dừng.
- Chọn/xác minh Fanpage làm danh tính đăng, đăng trực tiếp Fanpage, tương thích tài khoản/máy.
- Lịch tuần/tháng Facebook, thư viện nội dung dùng lại nâng cao, CSV/Excel, phân loại nhóm, UTM/chuyển đổi, báo cáo web, thông báo lỗi cần thao tác, phân quyền/duyệt đội nhóm, các định dạng media nâng cao.
- Capability gate cho desktop cũ, build và phát hành bộ cài 1.1.8, pilot tài khoản Facebook thật.

Xóa không gỡ bài Facebook đã gửi. Chưa nghiệm thu chặn tuyệt đối cửa sổ race sau khi Facebook đã nhận submit. Bulk review giữ xác nhận của người dùng; không phải bằng chứng Facebook cấp quyền quảng cáo. Tham khảo toàn bộ thiết kế trong FACEBOOK_CAMPAIGN_UPGRADE_PLAN.md.
