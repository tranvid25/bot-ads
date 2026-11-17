# Plan hoàn thiện chiến dịch Facebook Groups

Ngày rà soát: 16/11/2026. Trạng thái: đề xuất để duyệt; chưa triển khai chức năng.

## 1. Kết luận từ log và mã nguồn

- Tìm kiếm có kết quả: log ghi tìm được 52 nhóm; cấu hình lượt chỉ đánh giá tối đa 20 nhóm. Cần hiển thị riêng số link thu thập và số nhóm đã kiểm tra, không gộp thành “0 kết quả”.
- Đọc danh sách đã tham gia thất bại; hệ thống giữ dữ liệu cũ và tiếp tục tìm kiếm. Đây là cảnh báo thiếu thông tin, không chứng minh tài khoản không có quyền đăng.
- `packages/automation/post.js` bắt buộc nút `Joined/Đã tham gia` trước khi mở composer. Thiếu nút này gây thất bại dù nhóm có thể cho khách tạo bài.
- Phân loại nhóm đang dựa từ khóa nội quy/chủ đề; “chưa thấy cho phép” không đồng nghĩa “cấm”. Cần giữ dấu hiệu và cho khách kiểm tra, thay vì đánh đồng thành nhóm lỗi.
- Một số nhóm được cảnh báo cấm quảng cáo lúc tìm nhưng xuất hiện trong kế hoạch đăng sau đó. Cần giải thích rõ ai đã duyệt/ghi đè và dựa trên bằng chứng nào; không tự xóa dấu hiệu cấm khi chọn hàng loạt.
- Log mất kết nối máy chủ là lỗi độc lập với thành viên. Có lượt nhận tiếp sau đó nhưng log không có job ID/nguồn tạo nên chưa kết luận được đó là chạy tay, lịch khác hay phục hồi.
- Selector nhóm hiện có checkbox riêng từng nhóm; thiếu chọn tất cả và hiển thị gọn. CSS toàn cục có thể làm checkbox/tên xếp dọc.
- Đã có nút Chạy ở danh sách chiến dịch và lịch lặp theo ngày/giờ. Thiếu chọn Đăng ngay/Đặt giờ ngay trong bước hoàn tất form; chưa có luồng xóa chiến dịch đồng bộ hủy việc đầy đủ.

## 2. Mục tiêu sản phẩm

Luồng khách: ghép máy → kết nối Facebook → tìm/nhập nhóm → xem và duyệt nhóm → chọn nhóm → soạn bài → Đăng ngay hoặc Đặt giờ → theo dõi kết quả → dừng/xóa khi cần.

Giữ ba khái niệm độc lập:

| Khái niệm | Ví dụ trạng thái | Ý nghĩa |
| --- | --- | --- |
| Thành viên | Đã tham gia / Chưa tham gia / Đang chờ / Chưa xác định | Thông tin tài khoản trong nhóm |
| Khả năng đăng | Có thể mở composer / Cần tham gia / Cần duyệt người tham gia / Bị hạn chế / Chưa xác định | Có được tạo bài bằng danh tính hiện tại không |
| Quyền quảng cáo | Khách đã duyệt / Có điều kiện / Có dấu hiệu cấm / Chưa kiểm tra | Nội dung quảng cáo có phù hợp nội quy không |

Một nhóm công khai không tự động có nghĩa khách nào cũng đăng được. Meta mô tả có thể tham gia hội thoại không cần gia nhập nếu cộng đồng cho phép; quản trị viên vẫn kiểm soát quyền đăng và duyệt bài: https://about.fb.com/news/2020/10/supporting-online-communities/.

## 3. Sửa điều kiện đăng vào nhóm — ưu tiên P0

1. Bỏ điều kiện bắt buộc nhìn thấy nút Joined. Membership unknown không chặn toàn bộ lượt.
2. Trên đúng trang nhóm, đúng danh tính Facebook, kiểm tra tài khoản không bị checkpoint và quyền mở composer thực tế. Chỉ có nút trên feed/ô bình luận không đủ bằng chứng; phải mở đúng hộp tạo bài và kiểm tra nội dung/đích.
3. Nếu có thể tạo bài và nhóm đã được khách duyệt phù hợp nội dung, tiếp tục luồng đăng, dù chưa tham gia.
4. Nếu Facebook yêu cầu tham gia, phê duyệt người tham gia hoặc trả lời câu hỏi: ghi lý do riêng, cho khách mở nhóm xử lý; không tự tham gia hay điền câu trả lời trong bản này.
5. Có thể soạn nhưng bài phải chờ quản trị viên: gửi theo quyền được cấp rồi ghi `pending_approval`, không ghi thành công công khai.
6. Không xác định được quyền do giao diện/timeout: ghi `unknown_permission`, phân biệt với `membership_required`; không khẳng định chưa tham gia.
7. Thiếu quyền trước submit không chiếm số bài đã gửi và không phải lỗi gửi bài. Vẫn giữ giới hạn tốc độ duyệt nhóm để không quét dồn dập.
8. Sau submit chỉ xác nhận thành công khi có bằng chứng đủ tin cậy; mất mạng hoặc không rõ kết quả → unknown, không tự đăng lại.

## 4. Tìm nhóm và thông báo kết quả

- Hiển thị các giai đoạn: Chờ máy → Thu thập link → Kiểm tra nhóm x/y → Đã hoàn tất / Hoàn tất một phần / Bị gián đoạn.
- Hiển thị đếm tách biệt: tìm thấy, đã kiểm tra, nhóm mới thêm, trùng, chưa rõ quyền, cần tham gia, cần kiểm tra nội quy, nhóm bị loại.
- Kết quả cập nhật theo đợt, không đợi xử lý hết mới trả toàn bộ. Khi gián đoạn giữ các nhóm đã lưu và chỉ rõ số chưa kiểm tra.
- Toast đúng một lần mỗi lần hoàn tất job, ví dụ “Tìm thấy 52 link; đã kiểm tra 20 nhóm, thêm 15 nhóm mới, 5 nhóm đã có”. Không dùng số mẫu nếu server chưa có dữ liệu thực.
- Toast có nút Mở thư viện, tự đóng với thành công; thông báo lỗi cần thao tác giữ lại và có nút thử lại. Kèm bảng tổng kết bền vững, không chỉ thông báo thoáng qua.
- Backend trả summary/counters và ID job; frontend không suy diễn số nhóm mới từ tổng thư viện. Không toast lặp mỗi lần polling/rerender.

## 5. Chọn tất cả, duyệt hàng loạt và bố cục gọn

Thư viện nhóm:

- Một hàng mỗi nhóm: checkbox | tên và link | trạng thái quyền/thành viên | trạng thái duyệt | thao tác. Desktop dùng cột, mobile ưu tiên tên + trạng thái và mở thêm chi tiết.
- Checkbox và tên nằm ngang, input checkbox có width/flex riêng, không nhận style full-width của input văn bản.
- Có Chọn tất cả trang này (20 nhóm), Bỏ chọn và checkbox trạng thái một phần. Hiện “Đã chọn x/y”.
- Tùy chọn Chọn tất cả kết quả đang lọc phải ghi rõ số lượng và phạm vi toàn bộ các trang. Không vô tình chọn nhóm bị ẩn bởi bộ lọc cũ.
- Hai thao tác riêng: Duyệt nhóm đã chọn và Chọn nhóm để đăng; duyệt không tự gửi bài.
- Duyệt hàng loạt yêu cầu xác nhận nội quy đã kiểm tra, hiển thị nhóm có cảnh báo; không mặc nhiên biến nhóm bị loại/cấm thành được phép quảng cáo.
- Nhóm cấm/có điều kiện tách khỏi nút duyệt nhanh. Khách kiểm tra riêng và ghi lý do/bằng chứng nếu đánh giá tự động sai. Không coi bộ phân loại từ khóa là kết luận tuyệt đối.
- Backend endpoint bulk review xác minh workspace, nhóm, giới hạn lô, thời điểm duyệt và quyền tài khoản. Dedupe ID; trả approved/skipped/conflicts + lý do, có audit; không N request cho N checkbox.
- Toast ví dụ “Đã duyệt 18 nhóm; 2 nhóm cần kiểm tra riêng”. Chọn lại nhóm đã duyệt không ghi đè lịch sử vô cớ.

Trong form chiến dịch:

- Dùng cùng component chọn hàng, lọc và đếm với thư viện thay vì tạo bố cục thứ hai.
- Có Chọn tất cả nhóm đủ điều kiện và Bỏ chọn. Chỉ chọn trong phạm vi bộ lọc đã hiển thị rõ, kiểm tra lại điều kiện phía server.
- Danh sách có chiều cao tối đa, cuộn nội bộ và phân trang; không kéo dài modal theo hàng trăm nhóm. Giữ tiêu đề và nút Lưu/Đăng luôn dễ tiếp cận.
- Nhóm quá hạn duyệt hoặc bị thu hồi quyền hiện disabled kèm lý do. Khi thay đổi lựa chọn, ID và URL phải được cập nhật cùng lúc, không lệch nhóm thực tế.

## 6. Đăng ngay / Đặt giờ / Lưu nháp

- Bước cuối có hai lựa chọn thời điểm: Đăng ngay và Đặt giờ. Lưu nháp là hành động phụ riêng, không phải tự gửi khi vừa lưu form.
- Đăng ngay: lưu đúng phiên bản chiến dịch rồi enqueue một job đúng snapshot được xác nhận. UI không tạo hai request thiếu liên kết khiến retry lưu lại thành nhiều job; dùng idempotency key cho thao tác và nút busy.
- Máy offline: thông báo “Đã xếp hàng, chờ máy online”; không ghi đã đăng ngay. Job có hạn chờ hiển thị rõ, không âm thầm gửi bù quá hạn.
- Đặt giờ: chọn ngày + giờ + múi giờ; mặc định một lần, tùy chọn lặp tuần nếu khách bật. Hiển thị lần chạy tiếp theo, không tự biến giờ đã qua thành ngày khác.
- Giữ lịch lặp cũ khi migrate; không ép lịch cũ thành Đăng ngay hoặc chạy thêm một lượt khi chỉ sửa tên.
- Đổi nội dung/nhóm sau khi đã xếp hàng: nêu rõ job đã giữ snapshot; muốn dùng bản mới phải hủy/tạo lại, không âm thầm đổi bài đã duyệt.
- Một click có một job; tạo lại hoặc tự động phục hồi không được vượt job đang chạy/unknown/cooldown và hạn mức.
- Sau enqueue hiện toast “Đã xếp lịch cho x nhóm” kèm Mở tiến độ. Chi tiết có các kết quả: Đã đăng có link / Chờ quản trị viên / Không đủ quyền / Chưa rõ / Đã hủy.

## 7. Xóa chiến dịch và dừng công việc — ưu tiên P0

- Thêm menu Xóa chiến dịch bên cạnh Chỉnh sửa/Chạy; xác nhận tên và cảnh báo số lượt đang chờ/đang chạy.
- Dùng soft delete (`deleted_at`/tombstone), tắt lịch và tăng revision. Ẩn khỏi danh sách hoạt động; giữ lịch sử attempts, nội dung snapshot và link đã đăng để đối soát.
- Trong một giao dịch/batch phù hợp D1: đánh dấu xóa, hủy job queued, đặt cancel_requested cho job running. API tenant-scoped, CSRF và xóa lặp an toàn.
- Cron, enqueue, claim, prepare và reserve đều chặn chiến dịch đã xóa. Không chỉ xóa khỏi UI hoặc chỉ tắt enabled: snapshot job cũ vẫn có thể chạy.
- Kiểm tra cancellation ngay trong điều kiện SQL giữ chỗ; không chỉ SELECT trước INSERT vì có thể xóa xen giữa hai thao tác. Kiểm tra lại trước click submit với token/lease còn hiệu lực.
- Heartbeat báo dừng; runner ngừng trước nhóm kế tiếp và trước submit, hoàn tất gửi báo cáo. Không kill process đột ngột sau khi có thể đã gửi mà chưa biết kết quả.
- Có race không thể loại bỏ hoàn toàn giữa xác nhận cuối và Facebook nhận click. Bài Facebook đã nhận/chờ duyệt trước khi dừng có thể vẫn xuất hiện; xóa chiến dịch không xóa bài trên Facebook.
- UI phân biệt “Đã xóa, không nhận việc mới”, “Đang dừng lượt hiện tại”, “Đã dừng”. Không hứa đã dừng khi desktop chưa xác nhận hoặc offline; khi reconnect vẫn phải đọc tombstone/cancel trước khi làm việc.
- Hủy job/chạy sau xóa hoặc báo cáo muộn không được hồi sinh lịch. Mất mạng sau gửi vẫn giữ unknown và bằng chứng, không reset để tự thử lại.

## 8. Mất kết nối và chạy tiếp sau gián đoạn

- Log structured: campaignId, jobId, attemptId, nguồn manual/scheduled/recovery, giai đoạn kiểm tra/giữ chỗ/gửi/báo cáo, thời hạn lease; không token/cookie.
- Đối chiếu heartbeat, request timeout, lịch kiểm tra và sleep giữa nhóm; chờ 75–107 giây không được vô tình làm hết lease nếu heartbeat vẫn hoạt động.
- Khi bị gián đoạn trước gửi có thể thử lại có kiểm soát; sau khi có khả năng gửi phải đối soát. Nhóm blocked do quyền tách khỏi lỗi mạng; không lặp lại cùng lỗi với nhiều job không rõ nguồn.
- Dừng/xóa phải được kiểm tra cả trong lúc sleep; không chờ hết nhiều phút mới phản hồi.
- Phần Nhận việc hiển thị rõ đang bận đăng nhập/tìm nhóm/đăng bài/đồng bộ/chờ mạng, không chỉ ghi “0 kết quả”.

## 9. Kiến trúc và thứ tự thực hiện

| Đợt | Phạm vi | Điều kiện hoàn tất |
| --- | --- | --- |
| 1 — P0 | Phân biệt membership/quyền đăng; lý do bỏ qua; kiểm tra gián đoạn | Nhóm cho visitor tạo bài không bị chặn bởi thiếu Joined; nhóm cần quyền vẫn dừng đúng |
| 2 — P0 | Xóa + cancellation trên backend và runner | Không nhận job mới sau xóa; job đang chạy dừng có báo cáo, giữ lịch sử |
| 3 — P1 | Component hàng gọn, chọn tất cả, duyệt lô | Phạm vi chọn minh bạch, hỗ trợ mobile và bàn phím, counts chính xác |
| 4 — P1 | Tiến độ tìm, counters, toast | Phân biệt 52 link và 20 nhóm kiểm tra; toast không lặp |
| 5 — P1 | Đăng ngay/đặt giờ một lần/lặp, lưu nháp | Không enqueue trùng, lịch cũ không đổi hành vi, xử lý offline rõ ràng |
| 6 | Nghiệm thu và phát hành | Kiểm thử API/UI/desktop đạt và chạy pilot có quyền đăng trên Facebook thật |

- Tách module theo chức năng, tái sử dụng UI hiện có, mỗi file nguồn dưới 200 dòng.
- Dùng component Toast chung ở lớp app; chia sẻ GroupSelectionList, BulkSelectionToolbar và trạng thái quyền giữa thư viện/form, tránh hai logic duyệt khác nhau.
- Migration bổ sung trạng thái quyền, bằng chứng/thời điểm kiểm tra, tombstone chiến dịch và trường lịch một lần. Migration thêm mới, không sửa SQL cũ đã chạy.
- Chuẩn hóa contracts dùng chung web/API/desktop; desktop thông báo capability/version mới. Backend không âm thầm giao tác vụ đòi logic mới cho EXE cũ còn bắt Joined.
- Triển khai backend tương thích trước, phát hành installer có capability mới, sau đó bật UI/tính năng. Cập nhật manifest/link tải theo version, hỗ trợ Mac theo trạng thái signed hiện có.

## 10. Bộ tiêu chí nghiệm thu

1. Nhóm có composer và không có Joined: đi tiếp sau xác minh đúng nhóm/tài khoản.
2. Nhóm riêng tư/yêu cầu tham gia/chờ duyệt người tham gia: phân loại đúng, không tự bấm Join.
3. Nội quy cấm, chưa đọc được hoặc có điều kiện: hiển thị riêng, bulk approve không xóa cảnh báo âm thầm.
4. Bài gửi chờ admin không ghi public success; mất mạng sau click không gửi lại.
5. Checkbox/tên cùng hàng; 100–500 nhóm không làm tràn modal; chọn trang/toàn bộ lọc/indeterminate đúng.
6. Bulk review chặn ID khách khác, báo số thành công/thất bại, không request storm.
7. Toast xong job chỉ xuất hiện một lần, có đúng số mới/trùng/kiểm tra dở, trạng thái còn xem lại được.
8. Đăng ngay nhấn đôi/retry chỉ có một job; ngày quá khứ bị chặn; timezone và lịch lặp đúng.
9. Xóa queued/running/sleep/offline và xóa đồng thời giữ chỗ: không nhận việc mới, không reserve sau hủy đã xác nhận, báo cáo muộn không hồi sinh chiến dịch.
10. Xóa không làm mất lịch sử hoặc xóa nhầm bài Facebook, không ảnh hưởng chiến dịch khác/khách khác.
11. Heartbeat không hết hạn do bước chờ bình thường; sau gián đoạn có job/source rõ ràng để đối soát.
12. Build, tests và kiểm tra file dưới 200 dòng đạt; pilot trên nhóm thử được phép đăng bằng tài khoản thật trước khi mở rộng cho khách. Không coi DOM mô phỏng là nghiệm thu Facebook production.

## 11. Ngoài phạm vi đợt này

- Chọn/xác minh Fanpage làm danh tính đăng là luồng riêng, không tự xem cookie tài khoản cá nhân là phiên Page.
- Không tự đăng nhập thay khách, vượt yêu cầu tham gia/câu hỏi/xác minh hoặc tự tham gia hàng loạt.
- Không tự xóa bài đã lên Facebook khi xóa chiến dịch.
- Đăng thành công là phân phối nội dung; không đồng nghĩa cam kết thứ hạng SEO/GEO hoặc có khách hàng.
