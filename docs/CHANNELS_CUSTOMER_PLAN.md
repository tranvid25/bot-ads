# Plan kết nối và sử dụng kênh cho khách hàng BotAds

Trạng thái: đây là đề xuất API ban đầu. Sau khi chủ BotAds không tạo được Meta App, hướng đã chọn là Threads/Instagram qua app máy tính. Xem [bàn giao desktop 1.1.0](THREADS_INSTAGRAM_DESKTOP.md) cho mã nguồn, giới hạn và cách nghiệm thu hiện tại; các phần API dưới đây giữ làm phương án tương lai.

## 1. Mục tiêu

Khách chỉ cần có tài khoản mạng xã hội phù hợp, kết nối và cấp quyền cho BotAds. Chủ BotAds quản lý ứng dụng tích hợp, cấu hình callback, secrets và thủ tục cấp quyền nền tảng. Khách không cần tạo Developer App hoặc đưa mật khẩu mạng xã hội cho BotAds.

Tập trung triển khai Threads và Instagram bằng API. Giữ Facebook Groups qua app máy tính và LinkedIn/DEV/Bluesky theo cơ chế hiện có.

## 2. Hiện trạng cần chỉnh trước khi mở cho khách

Trong mã nguồn hiện tại:

- Threads và Instagram nằm trong MANUAL_PROVIDERS; đặt lịch tạo awaiting_manual.
- Nút kết nối chỉ lưu tên qua /api/marketing/channels/manual, chưa OAuth.
- Companion mới có thực thi Facebook Groups, chưa có runner Threads/Instagram.
- MetaConnectView quảng bá tự động qua Desktop Bot; Status đổi awaiting_manual thành “Chờ Desktop Bot”; PublicationTable còn ẩn thao tác xác nhận thủ công cho các kênh Meta.

Do đó chưa được thông báo Threads/Instagram đã kết nối và sẵn sàng tự đăng. Các bản ghi manual cũ không được tự chuyển thành kết nối API; khách phải kết nối OAuth và xác nhận lại các lịch liên quan.

## 3. Khách cần chuẩn bị gì?

| Kênh | Khách chuẩn bị | Cách kết nối đề xuất | Thực thi |
| --- | --- | --- | --- |
| Threads | Tài khoản Threads | Bấm kết nối, đăng nhập trên nền tảng và cấp quyền | Backend chạy API khi đến giờ |
| Instagram | Tài khoản Professional: Business hoặc Creator | Instagram Login, cấp quyền và xác nhận đúng tài khoản | Backend chạy API; nội dung feed cần media phù hợp |
| LinkedIn | Tài khoản LinkedIn phù hợp với phạm vi BotAds hỗ trợ | OAuth hiện có | API cloud |
| DEV | Tài khoản DEV và API key của chính khách | Nhập key tại kết nối kênh | API cloud |
| Bluesky | Tài khoản Bluesky | OAuth hiện có | API cloud |
| Facebook Groups | Máy tính có BotAds, phiên Facebook, nhóm được phép đăng | Ghép thiết bị, đăng nhập Facebook trong app | Máy tính phải hoạt động |

Threads API hỗ trợ bài text, ảnh, video và carousel. MVP đề xuất text/link trước, ảnh sau. Quyền đăng tối thiểu dự kiến threads_basic và threads_content_publish. [Tài liệu Threads do Meta cung cấp](https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api?entity=request-34203612-74fb48b1-ad1a-480e-b200-4dcdb8126a2f).

Instagram Login phục vụ Business/Creator; quyền cơ bản và đăng nội dung là instagram_business_basic và instagram_business_content_publish. MVP đề xuất một ảnh và caption; mở rộng carousel/Reels sau khi pipeline media sẵn sàng. [Tài liệu Instagram Login do Meta cung cấp](https://www.postman.com/meta/instagram/folder/1z5vxzu/instagram-api-with-instagram-login).

## 4. Luồng khách lần đầu

1. Đăng ký/đăng nhập BotAds.
2. Tạo thương hiệu: tên dịch vụ, website quảng bá, đối tượng, ngôn ngữ. Không tự tạo thương hiệu với website BotAds làm website quảng bá.
3. Mở Kênh → Thêm kênh. Mỗi thẻ ghi yêu cầu tài khoản, loại nội dung và cách chạy.
4. Chọn Threads hoặc Instagram → BotAds đưa sang trang cấp quyền của nền tảng.
5. Nền tảng trả về callback; backend kiểm tra state, đổi code lấy token, đọc danh tính tài khoản và quyền thực tế.
6. Hiển thị avatar, tên/handle và thương hiệu sẽ gắn với tài khoản. Chỉ ghi “Đã kết nối” khi đã kiểm tra thành công.
7. Hướng dẫn tạo bài đầu tiên: chọn kênh → soạn phiên bản phù hợp → xem trước → duyệt → đăng ngay hoặc đặt lịch.

Nếu tài khoản Instagram chưa phù hợp: hiện hướng dẫn chuyển Professional và nút thử lại. Nếu khách từ chối quyền: quay lại danh sách kênh với lý do và nút kết nối lại, không tạo kênh giả.

## 5. Soạn và đăng bài

- Dùng composer hiện có, chọn một hoặc nhiều tài khoản đích đã xác thực.
- Tách nội dung và kiểm tra điều kiện theo từng kênh; bản Instagram cần ảnh/video, không gửi một bài chỉ có text như Threads.
- Hiện rõ số tài khoản đích, nội dung từng bản, thời gian, múi giờ và phương thức chạy.
- “Lưu nháp” không tạo job. “Duyệt” không tự đăng nếu khách chưa chọn hành động đăng/lịch.
- Đăng ngay/đặt lịch tạo một publication cho mỗi tài khoản đích và phiên bản nội dung; chống tạo trùng khi bấm hai lần.
- Bản đầu tiên do khách soạn và duyệt. Tự tạo nội dung liên tục là tính năng riêng, cần thiết lập rõ phạm vi cho phép.

Threads/Instagram dùng API thì khách không cần bật máy tính. Backend giữ lịch và thực hiện khi đến giờ. Facebook Groups giữ hướng dẫn riêng về máy tính.

## 6. Trạng thái khách phải hiểu được

| Trạng thái | Giao diện và hành động |
| --- | --- |
| Chưa kết nối | Yêu cầu tài khoản và nút kết nối |
| Cần bổ sung quyền | Nêu quyền còn thiếu và nút cấp lại |
| Đã kết nối | Danh tính thật, thương hiệu sở hữu, khả năng đăng |
| Cần kết nối lại | Lý do hết hạn/thu hồi quyền; dừng lịch liên quan, hướng dẫn OAuth lại |
| Đang chờ lịch | Giờ chạy và múi giờ, cho phép hủy |
| Đang xử lý media | Đang tải/chuyển xử lý ảnh/video; chưa được coi là đã đăng |
| Đang gửi | Đã bắt đầu yêu cầu xuất bản; hạn chế gửi lại |
| Đã đăng | Có ID nền tảng, link khi lấy được và thời điểm |
| Lỗi đã xác định | Lý do cụ thể; sửa bài hoặc thử lại khi phù hợp |
| Chưa rõ kết quả | Yêu cầu kiểm tra; không tự đăng lại |
| Đăng thủ công | Ghi đúng là thủ công và có chỗ nhập link xác nhận |

Kênh bị ngắt kết nối: dừng publication chưa gửi, xử lý lượt đang gửi theo kết quả thực tế. Kết nối lại phải kiểm tra cùng tài khoản; không chuyển lịch của tài khoản A sang B.

## 7. Chủ BotAds phải chuẩn bị

1. Tạo/cấu hình use case Threads và Instagram trong Meta Developer Dashboard; dùng đúng ID/secret của từng tích hợp.
2. Cấu hình callback HTTPS riêng, chính sách quyền riêng tư, hỗ trợ, xóa dữ liệu và xử lý ngắt kết nối.
3. Lưu secrets phía backend và cơ chế deploy secrets hiện có; không đưa vào frontend hoặc Git.
4. Chuẩn bị tài khoản thử nghiệm và thử đủ luồng kết nối → đăng → ngắt → kết nối lại.
5. Kiểm tra và hoàn tất App Review, access level, xác minh cần thiết theo yêu cầu dashboard cho việc phục vụ khách ngoài nhóm tester. App tự đăng được cho chủ app chưa đủ làm điều kiện mở bán.
6. Có cảnh báo vận hành về kết nối hết hạn, lỗi media, rate limit và publication chưa xác định.

Chưa xác minh cấu hình Meta App thực tế của chủ BotAds trong lần nghiên cứu này. Thời gian và kết quả xét duyệt là điều kiện bên ngoài, không cam kết trước.

## 8. Phần kỹ thuật cần bổ sung

- OAuth start/callback riêng cho từng provider; state dùng một lần, hết hạn và gắn đúng workspace/brand/user khởi tạo.
- Mã hóa token theo cơ chế hiện có; lưu actor ID, scopes, thời điểm hết hạn. Refresh token khi được nền tảng hỗ trợ; thiếu quyền thì yêu cầu kết nối lại.
- Adapter Threads và Instagram trong publisher hiện có. Giữ lease, quota, khóa theo tài khoản, snapshot và unknown; không xây một scheduler mới.
- Với API tạo container rồi publish: lưu container ID và tiến trình từng bước. Việc tạo container thành công chưa chứng minh bài đã xuất bản.
- Luồng media cho Meta tải được, có sự đồng ý của khách, giới hạn thời gian truy cập phù hợp và cleanup. Không biến toàn bộ kho ảnh riêng thành public.
- Tách trạng thái khả năng đăng của kênh khỏi việc chỉ lưu tên nhận diện; giữ manual là manual.
- Áp giới hạn nội dung/media theo provider trước khi cho đặt lịch. Có chuyển đổi ảnh phù hợp nếu cần; video cần pipeline riêng.
- Phân tách tenant và brand; không cho người khác dùng token hoặc đổi đích của một publication đã duyệt.

Meta mô tả luồng Reels tạo container, kiểm tra FINISHED rồi media_publish; media URL phải truy cập được từ máy chủ Meta. Đây là lý do Instagram cần thêm trạng thái xử lý media. [Tài liệu publishing do Meta cung cấp](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-1ff01566-3509-48bd-a0f4-8571a91ccfdf).

## 9. Thứ tự triển khai đề xuất

| Giai đoạn | Phạm vi | Điều kiện hoàn thành |
| --- | --- | --- |
| 0 | Sửa thông báo khả năng hiện có | Không còn lời hứa Desktop Bot cho kênh chưa có runner; manual vẫn xác nhận được |
| 1 | Kết nối Threads thật | Đúng danh tính/quyền, tenant isolation, ngắt/kết nối lại hoạt động |
| 2 | Threads text/link và lịch | Một publication chỉ tạo một bài; có kết quả/link và xử lý unknown |
| 3 | Kết nối Instagram + một ảnh/caption | Chặn tài khoản/nội dung không phù hợp; media/container/publish và lịch hoạt động |
| 4 | Mở cho khách | Quyền Meta phù hợp, pilot tài khoản khách và tài liệu onboarding đạt |
| 5 | Mở rộng | Threads ảnh, Instagram carousel/Reels, insights theo quyền được duyệt |

Ưu tiên Threads trước vì phạm vi text/link gần với publisher hiện có; Instagram sau vì cần thêm quy trình media. Đây là đánh giá triển khai cho repo này, không phải cam kết về thời gian xét duyệt Meta.

## 10. Nghiệm thu theo vai khách hàng

- Khách mới tự đi từ tạo thương hiệu đến kết nối mà không cần Developer App.
- Từ chối quyền, hết hạn OAuth, sai state và callback lỗi đều có thông báo và cách tiếp tục.
- Hai khách không thấy hoặc sử dụng kênh/token của nhau.
- Nhấn đăng hai lần, cron chạy lại, timeout sau submit không tạo bài trùng.
- Instagram có media sai, xử lý chậm hoặc bị từ chối đều cho kết quả rõ ràng.
- Ngắt kết nối, mất quyền và kết nối lại bằng tài khoản khác không làm gửi nhầm lịch cũ.
- Pilot bài thật trên tài khoản được phép; đối chiếu ID/link nền tảng và màn hình kết quả.

## 11. Câu hỏi cần chốt trước khi code

1. Instagram của khách mục tiêu đã là Business/Creator chưa?
2. Có chấp nhận MVP Threads text/link và Instagram một ảnh/caption trước không?
3. Chủ BotAds đã có Meta Developer App/use case tương ứng và tài khoản thử nghiệm chưa?

Chưa cần gửi secrets vào chat để duyệt plan này.
