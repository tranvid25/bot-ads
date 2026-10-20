# Dùng thử BotAds trên Windows

## Bạn đang có những gì?

- `apps/web`: giao diện React để đăng ký, tạo chiến dịch, nhập bài hoặc yêu cầu Gemini viết, chọn ảnh, chỉnh hạn mức và xem kết quả.
- `apps/api`: API Cloudflare Workers, tách `routes`, `controllers`, `services`, `models`, `middleware`, `migrations`. D1 lưu dữ liệu; R2 lưu ảnh.
- `apps/companion`: ứng dụng Electron chạy trên Windows, ghép với website, lưu phiên Facebook được mã hóa, nhận công việc và chạy trình duyệt.
- `packages/automation`: lõi bot Node.js + Playwright, tìm/kiểm tra nhóm, tham gia, đăng bài, xác nhận bài, bình luận và đối soát.
- `packages/contracts`: kiểm tra dữ liệu chiến dịch dùng chung.
- `tests`: kiểm tra tự động. `scripts`: khởi tạo, đóng gói, kiểm tra giao diện và cài lịch CLI.
- `release`: bộ cài Windows và bản ứng dụng đã đóng gói.

Đây là bản thử phát triển trên máy. Website chưa được deploy lên Internet. Tài khoản đăng ký ở bản local và dữ liệu local chưa tự chuyển sang Cloudflare production.

## Mở website local

Mở PowerShell tại thư mục dự án. Chạy từng lệnh theo thứ tự:

```powershell
cd D:\botAds
npm install
npm run cloud:setup
npm run web:build
npm run cloud:dev
```

`cloud:setup` tạo secret local nếu chưa có và áp dụng database migrations local. `cloud:dev` chạy API, database/ảnh giả lập Cloudflare và phục vụ bản React đã build. Giữ cửa sổ này mở.

Mở **http://127.0.0.1:8899** trong trình duyệt. Nếu website đã mở được và server đang chạy thì không cần chạy thêm một server nữa.

Lần sau chỉ cần `npm run cloud:dev`; chạy lại `npm run web:build` nếu đã sửa frontend. Khi phát triển giao diện với cập nhật nhanh, có thể mở thêm terminal chạy `npm run web:dev`; giao diện dev ở cổng 5173 và API vẫn cần cổng 8899.

## Đăng ký và ghép ứng dụng

1. Trên web, chọn **Đăng ký**, nhập tên, email và mật khẩu ít nhất 12 ký tự. Đây là tài khoản BotAds, không phải mật khẩu Facebook.
2. Mở ứng dụng Windows bằng một trong hai cách: chạy bộ cài trong `release`, hoặc mở terminal thứ hai tại `D:\botAds` và chạy `npm run desktop` để thử bằng source hiện tại.
3. Trên web vào **Thiết bị → Tạo mã liên kết**.
4. Trong ứng dụng nhập website **http://127.0.0.1:8899** và mã vừa tạo. Bấm **Liên kết máy tính**. Mã chỉ dùng một lần và hết hạn sau 10 phút.
5. Bấm **Kết nối Facebook** trong ứng dụng. Trình duyệt mở ra; tự đăng nhập và hoàn tất xác minh nếu Facebook yêu cầu.

Mỗi tài khoản BotAds hiện liên kết một thiết bị. Muốn đổi máy, thu hồi thiết bị cũ trên website. Ứng dụng giữ phiên Facebook riêng; phiên đăng nhập của bot CLI cũ không được tự nhập sang ứng dụng mới.

## Tạo và chạy chiến dịch

1. Bấm **Tạo chiến dịch**, nhập tên dễ nhớ.
2. Chọn **Tôi có bài viết** để nhập nội dung; hoặc **Nhờ Gemini viết** để nhập mô tả sản phẩm và prompt rồi tạo bản nháp.
3. Đánh dấu **Dùng bài này** cho những bài muốn đăng. Chọn/tải ảnh cho từng bài. Các bài được chọn luân phiên giữa các nhóm.
4. Nếu cần, bật bình luận kèm link và nhập website, nội dung bình luận.
5. Sang **Nhóm mục tiêu**: nhập từ khóa, từ khóa loại trừ, tùy chọn nhóm có sẵn, tự tìm nhóm và tự xin tham gia.
6. Sang **Lịch & giới hạn**: chọn số lượt gửi tối đa/ngày, khoảng nghỉ trước khi đăng lại nhóm, giờ và ngày chạy.
7. Lưu chiến dịch. Trong bản thử local, bấm **Chạy** để xếp một lượt vào hàng chờ. Ứng dụng nhận việc khi đã kết nối và có phiên Facebook.
8. Mở **Kết quả** để xem nhật ký, trạng thái bài, link bài và kết quả bình luận riêng.

Muốn tối đa 50 lượt/ngày: đặt **Cài đặt → Giới hạn tài khoản = 50** và **giới hạn chiến dịch = 50**. Nếu một trong hai vẫn là 30 thì tài khoản chỉ gửi tối đa theo giới hạn thấp hơn. Bản đầu cho phép 1–100; chủ hệ thống có thể thay mức trần bằng `MAX_DAILY_POSTS`.

Bài chờ duyệt hoặc chưa xác nhận vẫn giữ chỗ trong hạn mức. Một lượt chạy kết thúc không có nghĩa mọi bài đều xuất bản. Chỉ bài có bằng chứng xác nhận mới ghi thành công; không gửi lại mù khi chưa rõ kết quả.

## Gemini trong bản local

Backend cần `GEMINI_API_KEY` trong `.dev.vars`; nếu chưa có, chế độ tự soạn vẫn dùng được. Thêm dòng này bằng trình soạn thảo trên máy:

```dotenv
GEMINI_API_KEY=API_KEY_CUA_BAN
```

Giữ nguyên `AUTH_SECRET` đã tạo. Không đưa API key vào frontend, commit vào Git hoặc gửi trong chat. Khởi động lại `cloud:dev` sau khi đổi `.dev.vars`. API key trong cấu hình bot CLI cũ không tự chuyển vào backend mới.

## Chạy nền, lịch và dừng

- Đóng tab web: ứng dụng vẫn có thể làm việc nếu API còn chạy.
- Đóng cửa sổ ứng dụng: ứng dụng thu nhỏ xuống khay hệ thống.
- Tắt máy, ngủ máy hoặc mất kết nối API: không tiếp tục gửi việc mới.
- Trong ứng dụng chọn **Dừng / tạm nghỉ** để ngừng nhận việc; chọn **Nhận việc từ website** để tiếp tục.
- Website có nút **Dừng** từng lượt. Nó ngăn thao tác tiếp theo, không thu hồi bài Facebook đã nhận.
- **Cron không tự chạy theo giờ thật trong `wrangler dev`.** Bản local dùng nút Chạy. Khi deploy, Cron Cloudflare mới tạo việc theo lịch đã bật; máy khách vẫn cần online.
- Không chạy đồng thời `npm run auto` và ứng dụng trên cùng tài khoản Facebook: hai chế độ hiện dùng kho dữ liệu riêng.

## Trạng thái phát hành

### Deploy production qua GitHub Actions

Repo đã có workflow `.github/workflows/deploy-production.yml`: khi push lên `main`, GitHub chạy kiểm tra, build giao diện, áp dụng migration D1 và deploy Worker production. Có thể chạy thủ công ở tab **Actions → Deploy production → Run workflow**. Workflow deploy lên URL `workers.dev`; domain riêng chưa được cấu hình. D1 dùng database `bot-ads`, R2 dùng bucket `bot-ads`.

Token Cloudflare từng được dán vào chat, vì vậy phải thu hồi token đó và tạo token mới trước khi thêm secret. Trong GitHub repo vào **Settings → Secrets and variables → Actions**, thêm secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` và `AUTH_SECRET`. Token mới chỉ cần quyền sửa Workers Scripts, D1 và R2 trong đúng Cloudflare account. `AUTH_SECRET` tạo bằng `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`; chỉ lưu trong GitHub Secrets. Mã account ID cần copy lại từ Cloudflare Dashboard vì giá trị đã gửi có vẻ thiếu ký tự.

Trước lần chạy đầu, xác nhận database D1 có ID đúng và chưa có schema khác cần giữ lại; migration đầu tạo các bảng BotAds. Đảm bảo bucket R2 `bot-ads` đã tồn tại. Nếu thiếu tài nguyên hoặc token quyền chưa đủ, workflow dừng trước khi deploy thành công. Có thể thêm `GEMINI_API_KEY` thành Worker secret riêng sau deploy nếu muốn bật tạo nội dung Gemini. `DOWNLOAD_URL` đang để trống nên nút tải ứng dụng vẫn chưa hoạt động; cần tải bộ cài lên nơi công khai rồi cấu hình URL trước khi bật phân phối.

Production hiện là bản pilot: đăng ký mở, chưa có xác minh email/thanh toán; cần thử với tài khoản và nhóm được phép trước khi mời khách dùng rộng rãi. Không đưa token, `AUTH_SECRET`, `GEMINI_API_KEY` hoặc `.dev.vars` vào commit.

### Tạo bản cài cho MacBook

Ứng dụng desktop có thể đóng gói thành `.dmg` trên máy macOS. Mở Terminal trên Mac, tải mã nguồn dự án về máy, cài Node.js 20 trở lên, rồi chạy:

```sh
npm install
npm run desktop:build:mac
```

Lệnh này tạo bản theo kiến trúc của máy đang build: Apple Silicon (M1/M2/M3/M4) hoặc Intel. File `.dmg` cùng mã SHA-256 nằm trong thư mục `release`. Không tạo bản macOS trên Windows; hãy chạy lệnh trên máy Mac. Bản hiện tại chưa ký Developer ID hoặc notarize, nên macOS có thể cảnh báo khi mở. Để khách tải và cài thuận tiện, cần tài khoản Apple Developer trả phí để ký và notarize ứng dụng trước khi phát hành rộng.

Domain riêng chưa cấu hình; sau deploy có thể dùng URL `workers.dev` trước. Binding D1/R2 production đã khai báo trong `wrangler.jsonc` nhưng cần xác nhận tài nguyên tồn tại và đúng tài khoản. Secrets được đưa vào GitHub Actions trước deploy. Nút tải trên web chưa được bật khi `DOWNLOAD_URL` còn trống; cần upload bộ cài Windows (và Mac nếu phát hành) lên nơi tải công khai rồi cấu hình URL.

Bộ cài hiện chưa ký số. Đã kiểm thử luồng đăng ký, tạo bài thủ công, cấu hình 50/ngày và ghép ứng dụng; chưa thực hiện đăng Facebook thật trong các bài kiểm tra này. Cần chạy thử có kiểm soát với nhóm được phép trước khi phát hành rộng cho khách hàng.

Kiểm tra ngày 20/10/2026: 45 kiểm tra lõi automation, 17 kiểm tra SaaS, build React/Worker, kiểm tra giao diện desktop/mobile và ghép Electron đều đạt. Bản Windows đóng gói mở được, tải được lõi automation và chạy Chromium đi kèm. Kiểm tra archive xác nhận không chứa config cá nhân, cookie hoặc lịch sử đăng.
