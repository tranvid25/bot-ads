# Plan đơn giản hóa luồng Facebook: kết nối một lần → Chạy chiến dịch

Đã triển khai luồng chính trong desktop **1.1.13**, backend và web. Xem [ghi chú triển khai và giới hạn nghiệm thu](FACEBOOK_SIMPLE_RUN_IMPLEMENTATION.md). Cần cập nhật app và deploy migration để dùng luồng mới trên production.

## 1. Mục tiêu trải nghiệm

- Lần đầu: mở BotAds desktop → ghép website một lần → đăng nhập Facebook → tự báo Sẵn sàng.
- Sau đó: vào website → chiến dịch → Chạy. Desktop tự nhận, đăng và đồng bộ kết quả.
- Lần sau mở app: khôi phục liên kết, kiểm tra phiên và tiếp tục; không bắt đăng nhập/ghép lại nếu còn hợp lệ.
- Không phải đóng Chrome, bấm Hoàn tất, bật nhận việc, ngắt kết nối hoặc mở lại app mỗi lần chạy.
- Không tự đóng cửa sổ người dùng đang xem chỉ để giải phóng worker.
- Máy vẫn phải bật và có mạng. App đang tắt hoàn toàn thì website hướng dẫn Mở BotAds, không yêu cầu kết nối lại.

## 2. Nguyên nhân trong mã hiện tại

| Vị trí | Vấn đề |
| --- | --- |
| `packages/automation/login_session.cjs` | Sau khi lưu phiên, vòng đăng nhập tiếp tục đến khi người dùng đóng browser hoặc gửi finish. |
| `apps/companion/runtime/facebook-login.cjs` | `facebookLogin` giữ true cho tới khi runner kết thúc. |
| `apps/companion/runtime/jobs.cjs` | Có `facebookLogin` thì heartbeat xong return; có child thì chưa nhận chiến dịch. Browser đăng nhập còn mở trở thành điều kiện chặn việc. |
| `apps/companion/runtime/lifecycle.cjs` | Ghép máy mới đặt `facebookReceiving=false`; finish-login chỉ gửi tín hiệu, không tự chuyển toàn bộ luồng sang nhận việc. |
| `apps/companion/runtime/status.cjs` | `facebookReady` chủ yếu dựa cookie c_user và cờ lỗi; không thể hiện đầy đủ quyền nhận việc của scheduler. |
| `apps/companion/renderer.js` | Đã lưu phiên nhưng vẫn yêu cầu Hoàn tất và Bật nhận việc, tạo thông báo mâu thuẫn với cảm nhận đã kết nối. |
| `apps/api/controllers/device/heartbeat.mjs` | Server biết online và facebook_ready, nhưng chưa biết đang đăng nhập, chủ động tạm dừng hay đồng bộ. |
| `packages/contracts/facebook-job-wait.mjs` | Web chỉ đoán một số lý do chờ và đẩy khách trở lại desktop. |

Không có yêu cầu nghiệp vụ phải xóa liên kết rồi ghép lại cho mỗi chiến dịch. Đó không phải luồng sử dụng chuẩn. Cài bản cập nhật có thể cần đóng app một lần, tách biệt với thao tác chạy chiến dịch hằng ngày.

## 3. Luồng mới

### Lần đầu

1. Ghép BotAds với tài khoản website.
2. Bấm Kết nối Facebook, đăng nhập và hoàn tất xác minh nếu Facebook yêu cầu.
3. Desktop kiểm tra trang không ở login/checkpoint, xác nhận danh tính và lưu phiên mã hóa thành công.
4. Tự báo Sẵn sàng; tự bật chế độ nhận chiến dịch cho kết nối mới. Không có bước Hoàn tất hoặc Bật nhận việc bắt buộc.
5. Khách có thể giữ cửa sổ Facebook mở hoặc tự đóng. Cả hai đều không khóa scheduler khi đang rảnh.
6. Về website chọn chiến dịch, bấm Chạy.

Không đánh dấu sẵn sàng chỉ vì thấy cookie c_user cũ. Phải phân biệt phiên đã lưu với phiên đã xác minh và worker có thể nhận việc.

### Các lần sau

- Mở app: tự nối lại server và khôi phục trạng thái đã lưu.
- Phiên còn hợp lệ: tự sẵn sàng, bấm Chạy trên web là đủ.
- Phiên hết hạn hoặc checkpoint: hiển thị đúng yêu cầu đăng nhập/xác minh; xác minh xong tự tiếp tục lượt đang chờ còn hiệu lực.
- Không tự gửi bù lượt đã hết hạn, không tạo một lượt mới do đăng nhập lại.
- Đóng cửa sổ chính về khay vẫn nhận lịch như hiện tại. Thoát hẳn app/máy ngủ thì hiện ngoại tuyến.

## 4. Tách vòng đời browser khỏi tác vụ

Không giải quyết bằng cách bỏ cờ busy rồi chạy hai worker chung profile hoặc tự đóng Chrome sau đăng nhập.

- Thêm bộ quản lý phiên Facebook do desktop sở hữu, có IPC rõ ràng: đăng nhập, kiểm tra phiên, thực hiện việc, dừng và đóng khi thoát/cập nhật.
- Worker/browser có thể còn sống nhưng đang idle; idle không đồng nghĩa đang chạy chiến dịch.
- Sau xác minh, gửi sự kiện ready cho scheduler thay vì đợi cả tiến trình đăng nhập thoát.
- Khi có chiến dịch, dùng trang làm việc riêng trong phiên được quản lý; không điều hướng tab người dùng đang xem.
- Một tác vụ tự động Facebook hoạt động tại một thời điểm; tìm nhóm, đối soát và đăng bài cùng hàng đợi điều phối.
- Browser người dùng tự đóng khi idle: vẫn giữ phiên mã hóa; tác vụ sau tự mở browser cần thiết. Không yêu cầu ghép lại.
- Browser bị đóng giữa thao tác gửi: bảo toàn reservation và trạng thái chưa xác nhận; đối soát trước khi gửi lại.
- `browser_helper` cung cấp adapter phiên được quản lý có cơ chế release trang; CLI độc lập vẫn dùng cách launch/close cũ.
- Chuyển từng module posting/discovery/recheck sang adapter này; không đổi đồng thời mọi channel.
- Khi phiên Facebook idle, không chặn công việc Threads/Instagram, đổi cài đặt hoặc cập nhật app. Khi thực sự bận vẫn giữ khóa và cơ chế dừng hiện tại.

## 5. Trạng thái thống nhất desktop và web

| Trạng thái | Khách thấy | Hệ thống xử lý |
| --- | --- | --- |
| Chưa liên kết | Kết nối BotAds | Hướng dẫn ghép một lần |
| Cần đăng nhập/xác minh | Kết nối Facebook | Mở đúng cửa sổ đăng nhập |
| Sẵn sàng | Sẵn sàng nhận chiến dịch | Tự nhận việc hợp lệ |
| Đang xử lý | Tên chiến dịch, nhóm, tiến độ | Không chạy trùng |
| Đang đồng bộ | Kết quả đang được gửi lên website | Tự thử lại khi có mạng |
| Chủ động tạm dừng | Đã tạm dừng trên máy | Giữ phiên, không tự ghi đè lựa chọn dừng |
| Ngoại tuyến | Mở BotAds trên máy đã kết nối | Tự nối lại khi app hoạt động |

- Backend lưu trạng thái thiết bị cùng thời điểm heartbeat, khả năng phiên bản và mã lý do; không nhận trạng thái chạy do frontend tự khai.
- App là nguồn trạng thái phiên/worker; backend là nguồn trạng thái job và lease. GUI chỉ hiển thị kết quả tổng hợp.
- Giữ trường heartbeat cũ cho EXE cũ; thêm trường có version và giá trị mặc định, không suy đoán EXE cũ đang sẵn sàng.
- Di trú thành một trạng thái điều phối thay vì bổ sung nhiều cờ boolean dễ mâu thuẫn; cờ cũ chỉ còn ở lớp tương thích.
- Web hiển thị lý do chờ thực tế và hành động ngay tại chiến dịch.

## 6. Nút Chạy trên website

- Sẵn sàng: tạo hoặc tái sử dụng đúng một job, tự nhận theo chu kỳ hiện có, hiển thị Chờ máy nhận → Đang chạy.
- Đang có lượt của cùng chiến dịch: mở lượt hiện có, không tạo bản sao và không báo lỗi 409 chung chung.
- Có chiến dịch khác đang chạy: hiển thị đang chờ chiến dịch nào; cho theo dõi/hủy lượt chờ, không bắt ngắt kết nối.
- Chưa đăng nhập: hiển thị Kết nối Facebook tại chỗ; tạo yêu cầu đăng nhập cho desktop đã ghép. Xong bước này tự tiếp tục job hợp lệ.
- Ngoại tuyến: một hướng dẫn Mở BotAds; tự cập nhật khi máy trở lại. Không đưa khách đi qua nhiều trang hướng dẫn.
- Chủ động tạm dừng: nút Tiếp tục và chạy trên web gửi lệnh có xác thực tới đúng thiết bị. Không tự ghi đè pause chỉ vì có lịch đến hạn.
- Lệnh tiếp tục phải có định danh, hạn dùng, ACK và xử lý lặp an toàn; không tái dùng lệnh cũ sau khi thu hồi/đổi thiết bị.
- Giữ polling có kiểm soát và hiển thị đang chờ; chưa thêm WebSocket/Durable Object chỉ để xử lý UX này.

## 7. Giao diện desktop gọn hơn

Màn hình chính chỉ cần:

- Trạng thái kết nối và tài khoản Facebook.
- Một hành động chính theo trạng thái: Kết nối Facebook hoặc Mở chiến dịch.
- Tên công việc đang chạy/đồng bộ, lỗi cần xử lý nếu có.
- Tạm dừng và nhật ký ở phần phụ.
- Đổi tài khoản, ngắt liên kết và xóa phiên ở phần Nâng cao, có xác nhận rõ tác dụng.

Bỏ hai nút bắt buộc Hoàn tất kết nối và Bật nhận việc khỏi luồng bình thường. Không đặt nút xóa liên kết cạnh thao tác chạy thường xuyên. Giữ các kết nối Threads/Instagram, không bắt đăng nhập Facebook mới dùng được các kênh đó.

## 8. Bảo toàn dữ liệu và chống đăng trùng

- Không xóa cookie, pairing, campaign, reservation hay attempts để làm app trông hết lỗi.
- Giữ xác minh tài khoản đúng với nhóm đã duyệt, giới hạn ngày, khoảng nghỉ và khóa liên tác vụ.
- Phân biệt hủy job, tạm dừng nhận việc và ngắt tài khoản.
- Giữ các bài cũ Chưa xác nhận; đối soát trên web, không mặc định coi chưa đăng rồi gửi lại.
- Dừng/hủy chỉ ngăn phần việc chưa gửi; không tuyên bố đã thu hồi bài Facebook đã nhận.
- Kết quả gửi có permalink và nguồn xác minh vẫn là tiêu chuẩn thống kê thành công.

## 9. Thứ tự thực hiện

1. Chuẩn hóa trạng thái và sự kiện ready; bỏ bước bật nhận việc bắt buộc cho kết nối mới.
2. Tách phiên/browser idle khỏi khóa tác vụ, chuyển posting/discovery/recheck sang adapter theo từng bước.
3. Đồng bộ trạng thái thật qua heartbeat; bổ sung lệnh kết nối/tiếp tục từ web với ACK và hạn dùng.
4. Rút gọn desktop và thông báo Chạy trên website; giữ hướng dẫn chi tiết dưới phần trợ giúp.
5. Di trú bản cũ, kiểm tra hồi quy, build installer và nghiệm thu thực tế.

Không tự chuyển `facebookReceiving=false` cũ thành true hàng loạt: cờ này hiện không phân biệt khách chủ động dừng với chưa xong onboarding. Kết nối mới mặc định tự nhận; bản cũ chưa rõ ý định hiển thị Tiếp tục và chạy trên web để khách xác nhận một lần.

## 10. Điều kiện nghiệm thu

- Ghép/đăng nhập lần đầu xong: chỉ cần một lần bấm Chạy trên web, không bấm Hoàn tất/Bật nhận việc.
- Giữ browser đăng nhập mở: chiến dịch vẫn nhận được; tab người dùng không bị tự đóng/điều hướng.
- Tự đóng browser khi idle: vẫn chạy được bằng phiên đã lưu, không ghép lại.
- Mở lại app: khôi phục được liên kết; không ghi đè trạng thái chủ động dừng.
- Hết phiên, mất mạng, sleep/wake, app restart và cập nhật: thông báo đúng nguyên nhân, không tạo job hoặc bài trùng.
- Hai lần bấm Chạy, lịch chạy đồng thời và lệnh tiếp tục gửi lại: chỉ một tác vụ có quyền gửi.
- Browser bị đóng sau khi Facebook có thể đã nhận bài: giữ chưa xác nhận và đối soát, không gửi lại mù.
- Hồi quy kết nối/đăng nhập Google và các kênh API/Threads/Instagram; không yêu cầu người dùng đăng nhập lại các kênh khác.
- Module sản xuất dưới 200 dòng; thử cả Windows Lite và cấu hình Mac; nghiệm thu bằng tài khoản Facebook thật trước khi coi luồng hoàn tất.
