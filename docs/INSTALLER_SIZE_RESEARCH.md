# Nghiên cứu và tối ưu dung lượng BotAds Windows

## Nguyên nhân và số đo ban đầu

Đo trực tiếp bộ cài 1.1.0 trước tối ưu:

- File tải về: 408.815.580 byte, khoảng 408,82 MB (389,88 MiB).
- Thư mục app giải nén: 1.155.841.655 byte, khoảng 1,16 GB; chưa tính dữ liệu người dùng.
- Trình duyệt đi kèm: 752.827.379 byte. Bao gồm Chromium có giao diện khoảng 457,6 MB và Headless Shell khoảng 290,9 MB, cùng công cụ phụ.
- Electron còn đóng 55 gói ngôn ngữ, tổng khoảng 50,6 MB; giao diện BotAds hiện dùng tiếng Việt và tiếng Anh.
- Script build cũ đặt mức nén 1 để build nhanh, làm bộ cài lớn hơn.

Code ứng dụng trong app.asar chỉ khoảng 16,6 MB. Phần lớn dung lượng là runtime và browser, không phải mã giao diện hoặc số lượng component.

## Kết quả đo cuối cùng ngày 12/11/2026

| Bản | File tải về | File app giải nén | Giảm dung lượng tải so với cũ |
| --- | ---: | ---: | ---: |
| Trước tối ưu | 408,82 MB | 1.155,84 MB | — |
| Full tối ưu | 275,27 MB | 811,42 MB | 32,7% |
| Lite | 114,67 MB | 353,79 MB | 72,0% |

Đơn vị MB ở bảng = 1.000.000 byte. Windows thường hiển thị theo MiB: Lite khoảng 109,4 MiB, Full khoảng 262,5 MiB. Các số sau giải nén không gồm browser có sẵn trên máy khách hoặc dữ liệu phát sinh.

Byte thực tế: Full 275.267.162; Lite 114.674.498. Mỗi bản đã có file .sha256 và package-size.json chứa số đo, thay vì ước lượng theo tỉ lệ nén.

## Hai bản đã bổ sung

| Bản | Cách hoạt động | Khách cần chuẩn bị |
| --- | --- | --- |
| Lite | Không đóng kèm browser automation; ưu tiên Edge, dự phòng Chrome trên Windows | Có Edge/Chrome chạy được và tương thích trên máy |
| Full tối ưu | Đóng đúng một Chromium tương ứng phiên bản Playwright, không kèm Headless Shell hoặc browser cache cũ | Không cần cài riêng Edge/Chrome cho tác vụ BotAds |

Cả hai giữ Electron, app ID, kho phiên mã hóa và các luồng Facebook/Threads/Instagram. Browser được mở bằng phiên tạm riêng, sau đó nạp trạng thái của BotAds; không attach vào hồ sơ Chrome/Edge cá nhân hoặc cổng debug có sẵn.

Playwright chính thức hỗ trợ channel chrome/msedge và cho phép bỏ Headless Shell bằng --no-shell. Khi cần headless trong bản Full, dùng channel chromium để chạy Chromium đầy đủ ở chế độ headless mới. [Nguồn Playwright](https://playwright.dev/docs/browsers#chromium-new-headless-mode).

## Tối ưu đóng gói đã thực hiện

1. Full chỉ sao chép thư mục Chromium hiện tại từ .browser-dist, không lấy toàn bộ cache. Không xóa cache trên máy phát triển.
2. Lite bỏ extraResources chứa browser; build Lite không tải hay cài browser.
3. Tăng compression lên maximum, mức nén mặc định 9. Thời gian build tăng; cách chạy app sau khi giải nén vẫn dùng các binary tương ứng.
4. Giữ Electron locale en-US và vi; ICU và font/rendering runtime vẫn được giữ.
5. Gắn botadsBrowserMode vào package metadata. Bản Lite vẫn chọn system browser khi còn thư mục browser cũ từ một lần cài Full; không suy luận bản app chỉ từ sự tồn tại thư mục.
6. Kiểm tra ASAR khớp source, không chứa phiên cá nhân; kiểm tra Lite không có browser, Full có đúng một Chromium và không có shell.
7. Build xuất checksum SHA-256 và package-size.json để đo lại theo byte.

Nếu Lite không mở được Edge/Chrome, app báo cách cài/cập nhật hoặc dùng Full, không tự cài/ghi đè browser của khách. Máy doanh nghiệp có thể chịu chính sách hạn chế điều khiển browser; cần kiểm tra quyền với IT. [Giới hạn được Playwright ghi nhận](https://playwright.dev/docs/browsers#google-chrome--microsoft-edge).

## Lệnh build và vị trí file

```powershell
# Full: dùng Chromium đóng kèm
npm run desktop:build

# Lite: dùng Edge/Chrome có sẵn
npm run desktop:build:lite
```

- Full: release/BotAds-Setup-1.1.0.exe.
- Lite: release/lite/BotAds-Setup-1.1.0-Lite.exe.
- Cạnh mỗi file có .sha256 và package-size.json của bản tương ứng.
- Không đổi link tải production hoặc tự upload release trong lần tối ưu này.

## Kiểm chứng

- Unit test cho lựa chọn browser, Edge → Chrome fallback, trường hợp thiếu cả hai, lựa chọn developer và Full headless không cần shell.
- Trên máy phát triển đã thử Edge 157.0.4341.46 và Chrome 156.0.8078.80: điều hướng local, nhập liệu, bấm nút và tách cookies giữa hai context đều đạt. Không đăng nhập hay đăng bài thật.
- Có script smoke cho chính binary đã đóng gói: khởi động app ẩn bằng thư mục dữ liệu trống, kiểm tra đúng mode và mở browser từ runtime trong ASAR.
- Các luồng posting hiện tại vẫn cần pilot thật như tài liệu Threads/Instagram; kiểm tra browser runtime không thay thế nghiệm thu nền tảng.

Kết quả: 86/86 SaaS/API/desktop/browser tests và 45/45 automation/regression tests đạt. Source check: 289 file production dưới 200 dòng. Cả Lite và Full qua kiểm tra ASAR, khởi động GUI ẩn với dữ liệu trống và mở browser từ chính runtime đóng gói. Full đã chạy Chromium 156.0.8078.4 ở headless mới mà không có Headless Shell. GUI được thử từ bản sao thư mục tạm sạch để tránh ACL đặc thù của workspace; không tắt sandbox của app.

Chưa chạy cài/nâng cấp NSIS trên máy khách và chưa đăng mạng xã hội thật trong đợt tối ưu này. Tính năng không bị xóa, nhưng Lite đổi phụ thuộc browser: phiên bản/chính sách Edge hoặc Chrome trên từng máy có thể ảnh hưởng tương thích, nên giữ Full dự phòng và pilot trước phát hành rộng.

Các số footprint là tổng kích thước file giải nén, không tính Edge/Chrome đã cài sẵn, cache/ảnh/phiên phát sinh hoặc cache bộ cài của Windows.

## Các hướng chưa triển khai

| Hướng | Đánh giá |
| --- | --- |
| Tải Chromium ở lần chạy đầu | Làm bộ cài ban đầu nhỏ nhưng chuyển phần tải lớn sang lúc bắt đầu dùng; cần thêm phục hồi tải lỗi, checksum và cập nhật runtime |
| Tận dụng Chromium bên trong Electron cho toàn bộ automation | Cần thiết kế lại kết nối browser, process/session và kiểm chứng đăng nhập/đăng bài; chưa có PoC |
| Chuyển UI sang Tauri/WebView2 | Có thể giảm runtime giao diện, nhưng phải thay Electron IPC, tray, autostart, safeStorage và cách chạy Node/Playwright sidecar; không thể chỉ so kích thước file UI |

Tauri cũng có các lựa chọn phân phối/tải WebView2; phải tính runtime này và sidecar vào tổng dung lượng khách cần, thay vì hứa một con số rất nhỏ khi chưa có bản build. [Nguồn Tauri](https://v2.tauri.app/distribute/windows-installer/#webview2-installation-options).

Đề xuất phát hành Lite làm lựa chọn tải chính sau pilot trên máy khách, đồng thời giữ Full dự phòng. Chưa thay framework trong lần này để giữ các luồng đang dùng.
