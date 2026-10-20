# BotAds — tự động đăng bài nhóm Facebook

**Web React + API MVC + ứng dụng Windows:** đọc [hướng dẫn sử dụng bản mới](docs/HUONG_DAN_SU_DUNG.md). Kế hoạch sản phẩm ở [SAAS_PLAN.md](SAAS_PLAN.md). Phần hướng dẫn bên dưới dành cho bot CLI trong `packages/automation`; cấu hình và lịch sử CLI hiện nằm trong thư mục đó.

Bot chạy bằng Node.js + Playwright. Quy trình gồm kiểm tra bài cũ → tìm và đồng bộ nhóm → tự đánh giá nhóm → xin tham gia → bổ sung kho AI khi cần → đăng bài và bình luận vào đúng bài đã xác nhận. Bot dừng khi gặp đăng nhập, xác minh, hạn chế thao tác hoặc hết giới hạn lượt chạy. Lỗi riêng từng nhóm và kết quả gửi chưa rõ được bỏ qua để tiếp tục nhóm khác theo mặc định.

## Bắt đầu

Yêu cầu Node.js 20 trở lên và Chromium của Playwright. Nếu chưa có:

```powershell
npm install
npx playwright install chromium
```

Cấu hình hiện tại đã được giữ lại và bổ sung các giá trị mặc định. Khi cài mới, sao chép `config.example.json` thành `config.json`.

```powershell
npm run doctor
npm run login
npm run auto
```

`auto` tự tìm, đồng bộ, đọc thông tin/nội quy nhóm, chọn nhóm có chủ đề phù hợp, xin tham gia, bổ sung bài AI và đăng. Không cần nhập URL hoặc đánh dấu từng nhóm. Chế độ mặc định `groupSelection.mode: "exclude-prohibited"` chọn nhóm đúng chủ đề khi đọc được thông tin và chưa thấy lệnh cấm hoặc điều kiện quảng cáo. Điều này là suy luận tự động, không phải xác nhận cho phép của admin. Muốn yêu cầu câu cho phép rõ ràng, đặt mode thành `explicit-permission`. Nhóm chưa đọc được thông tin, có dấu hiệu cấm hoặc có điều kiện quảng cáo chưa hỗ trợ vẫn bị bỏ qua. Bộ lọc theo văn bản không bảo đảm hiểu đúng mọi cách diễn đạt hay thay đổi giao diện.

Chỉ khi muốn điều chỉnh thủ công, dùng các lệnh tùy chọn:

```powershell
npm run manage -- allow "https://www.facebook.com/groups/TEN_NHOM" --note "Nhóm cho phép giới thiệu sản phẩm"
npm run manage -- block "https://www.facebook.com/groups/TEN_NHOM" --note "Không cho quảng cáo"
```

Nhóm mới được tự đánh giá, lưu lý do và đoạn văn bản làm căn cứ. Kết quả tự đánh giá được kiểm tra lại sau 7 ngày, tối đa 30 nhóm mỗi lượt, ưu tiên nhóm đã tham gia. Thay đổi mode sẽ tự đánh giá lại các kết quả cũ. Danh sách đã cào được dùng lại trong 24 giờ (`discoveryIntervalHours`), không cào toàn bộ mỗi lần chạy. Lệnh `block` thủ công luôn được giữ nguyên. `allow` cũng đưa nhóm vào danh sách để xin tham gia; bước đồng bộ và kiểm tra thành viên trên trang xác nhận lại trước khi đăng. Nhóm có câu hỏi tham gia được đánh dấu `manual_required` và bỏ qua để tiếp tục nhóm khác. Bot không tự đoán thông tin cá nhân, vượt xác minh tài khoản hoặc tự điền một câu trả lời chung cho mọi câu hỏi.

Xem kế hoạch rồi chạy:

```powershell
npm run plan
npm run auto
```

`plan` không mở Facebook, gọi AI hay gửi bài. `auto` thực hiện các bước đã bật trong `config.automation`. Bạn cũng có thể dùng `npm start` và chọn tính năng trên menu. Để chỉ đăng vào danh sách sẵn có, dùng `npm run post`.

## Giới hạn và chống trùng

| Cấu hình | Mặc định | Ý nghĩa |
|---|---:|---|
| `cooldownDays` | 7 | Khoảng nghỉ đủ 7 × 24 giờ từ lần đăng thành công |
| `maxPostsPerRun` | 30 | Số nhóm được thử đăng trong một lượt |
| `maxPostsPerDay` | 30 | Giới hạn bài gửi trong ngày theo múi giờ cấu hình |
| `maxConsecutiveFailures` | 3 | Ngưỡng cảnh báo lỗi liên tiếp; chỉ dừng nếu bật `haltOnConsecutiveFailures` |
| `haltOnConsecutiveFailures` | false | Mặc định tiếp tục nhóm khác dù nhiều nhóm lỗi |
| `maxRunMinutes` | 110 | Thời gian tối đa của quy trình; kiểm tra giữa các thao tác |
| `maxJoinsPerRun` | 3 | Số nhóm được thử xin tham gia trong một lượt |
| `minDelaySeconds` / `maxDelaySeconds` | 60 / 120 | Khoảng nghỉ giữa các nhóm |
| `requireApprovedGroups` | true | Chỉ đăng vào nhóm được tự đánh giá đạt hoặc đã dùng `allow` |
| `groupSelection.enabled` | true | Tự đánh giá và chọn nhóm, không cần nhập từng URL |
| `haltOnUnknown` | false | Bỏ qua nhóm chưa rõ kết quả; true để dừng toàn bộ |
| `timezone` | Asia/Ho_Chi_Minh | Múi giờ cho giới hạn ngày và lịch chạy |
| `maxScrolls` | 30 | Số lần cuộn tối đa; dừng sớm khi hết kết quả |

Các giới hạn là kiểm soát vận hành, không phải bảo đảm tài khoản không bị Facebook hạn chế. Nhóm lỗi 3 lần bị tạm bỏ qua; dùng `allow` sau khi đã kiểm tra để đặt lại bộ đếm. `excludedKeywords` loại nhóm theo tên; `searchKeywords` là các từ khóa tìm kiếm. URL được chuẩn hóa host, chữ hoa/thường, tham số và dấu `/` cuối. URL tên nhóm và URL ID của cùng một nhóm chưa được tự hợp nhất.

Bot có một khóa chung để ngăn chạy đồng thời các lệnh làm thay đổi dữ liệu. Khóa của tiến trình đã chết được thu hồi; không xóa khóa của tiến trình đang chạy. Mỗi kết quả chưa xác nhận được giữ xuyên ngày. Mặc định chỉ nhóm liên quan bị bỏ qua, bài AI liên quan được giữ riêng trong kho và không được cấp cho nhóm khác.

## Lịch chạy

Mặc định cấu hình là **09:00 thứ Hai đến thứ Sáu, giờ Việt Nam**. Lịch chưa được tự kích hoạt khi cập nhật code.

Chọn một trong hai cách:

```powershell
# Giữ terminal và máy tính mở
npm run schedule

# Hoặc đăng ký Windows Task Scheduler
npm run schedule:install

# Gỡ tác vụ Windows
npm run schedule:remove
```

Tác vụ Windows kiểm tra mỗi 5 phút và dùng giờ/ngày trong `config.schedule` để quyết định chạy. Máy phải bật và người dùng phải đăng nhập Windows vì Chromium có thể cần cửa sổ tương tác. Chạy tối đa một lượt lịch mỗi ngày; nếu lỗi hoặc máy khởi động lại giữa lượt, không tự thử lặp lại ngày đó. Xem lỗi bằng `schedule_state.json`; xử lý nguyên nhân rồi chạy `npm run auto` để thử thủ công. Khi bắt đầu bộ lịch sau giờ đã hẹn trong ngày hợp lệ, bot chạy bù một lần.

## Dừng và tiếp tục

```powershell
npm run stop
npm run resume
```

`stop` tạo yêu cầu dừng; bot kiểm tra trong thời gian nghỉ và trước các thao tác. Một thao tác Playwright/API đang chờ cần kết thúc hoặc timeout trước khi dừng hoàn toàn. Ctrl+C cũng yêu cầu dừng. Chờ lượt hiện tại đóng trước khi `resume` và chạy lại. `resume` chỉ bỏ cờ dừng, không tự đăng bài. Các lệnh quản lý và xem báo cáo vẫn dùng được khi đang dừng.

## Kết quả và xử lý bài chưa rõ trạng thái

```powershell
npm run manage -- attempts
npm run history
npm run report
```

Mỗi lượt gửi có ID riêng, nội dung, thời điểm, liên kết bài nếu xác nhận được, kết quả bình luận và lỗi. Báo cáo xuất ra `report.json` và `report.csv` để mở bằng Excel. Nhật ký lượt chạy được giới hạn 200 lượt gần nhất; lịch sử bài giữ đầy đủ để chống trùng.

- `success`: đã thấy bài mới có nội dung khớp và liên kết mới.
- `pending_approval`: đã thấy thông báo mới cho biết chờ duyệt; không gửi lại dù qua ngày khác.
- `submitting` / `unknown`: đã chuẩn bị gửi hoặc kết quả chưa rõ. Bỏ qua nhóm này và giữ riêng bài AI, tiếp tục các nhóm khác; nếu bật `haltOnUnknown` thì dừng toàn bộ.
- `failed`: lỗi trước khi gửi; bài AI được giữ lại.
- `rejected`: bạn đã xác nhận bài bị từ chối; tăng bộ đếm lỗi của nhóm.

Mỗi lượt `auto` tự kiểm tra lại một số bài chờ duyệt/chưa rõ kết quả và bài thành công còn thiếu bình luận. Chỉ xác nhận khi nội dung khớp, có liên kết mới và xác định được tác giả là tài khoản hiện tại (hoặc đã biết chính xác liên kết bài). Không thấy bài không có nghĩa là bị từ chối, nên không tự gửi lại. Bình luận mặc định có link `https://pronunreview.com` (`commentWebsiteUrl`). Bot mở ô bình luận trong đúng bài và chỉ báo thành công khi thấy bình luận hiển thị. Thiếu ô nhập/lỗi trước khi gửi được thử lại ở lượt sau; nếu đã nhấn gửi nhưng chưa rõ kết quả, chỉ kiểm tra lại và không tự gửi trùng. Có thể chạy riêng `npm run reconcile`; nếu đang dừng, chạy `npm run resume` trước. Nếu Facebook không cung cấp đủ bằng chứng, nhóm tiếp tục được bỏ qua; bạn có thể xử lý thủ công bằng ID thật:

```powershell
npm run manage -- resolve "ID_LUOT_GUI" success --url "https://www.facebook.com/groups/TEN_NHOM/posts/ID_BAI" --note "Đã thấy bài trên nhóm"
npm run manage -- resolve "ID_LUOT_GUI" pending_approval --note "Đã kiểm tra danh sách bài chờ duyệt"
npm run manage -- resolve "ID_LUOT_GUI" failed --note "Đã kiểm tra, bài chưa được gửi"
npm run manage -- resolve "ID_LUOT_GUI" rejected --note "Admin đã từ chối bài"
```

Lệnh lưu lịch sử điều chỉnh và đồng bộ kho AI. Khi kết quả gửi chưa rõ, không đổi thành `failed` chỉ vì chưa thấy bài trên bảng tin: hãy kiểm tra cả bài chờ duyệt. Để thử xin vào nhóm lại sau khi đã kiểm tra yêu cầu cũ:

```powershell
npm run manage -- membership "https://www.facebook.com/groups/TEN_NHOM" retry
```

Lịch sử cũ trong `history.json` được đọc và chuyển sang nhật ký mới khi ghi dữ liệu lần đầu, giữ nguyên file cũ. Bot không thể sửa lại các kết quả `success` bị ghi nhầm bởi phiên bản cũ nếu bạn chưa kiểm tra thực tế.

## Kho AI và thông tin đăng nhập

```powershell
# Ưu tiên biến môi trường; cũng tương thích khóa đang có trong config.json
$env:GEMINI_API_KEY = "KHOA_CUA_BAN"
npm run generate-ai -- 10
```

Có thể cấu hình `geminiModels` thành danh sách tên model. Nếu không chỉ định, bot lấy các model Flash hỗ trợ sinh nội dung từ API. Yêu cầu API có timeout; nếu tạo bài không thành công thì dùng mẫu dự phòng. `automation.generateAI` chỉ bổ sung khi số bài trong kho thiếu so với kế hoạch đăng. ID bài giúp việc phục hồi sau sự cố không xóa nhầm bài trùng nội dung trong kho.

`auth.json` chứa phiên đăng nhập, không chia sẻ file này. Các file cấu hình thật, phiên đăng nhập, dữ liệu lịch sử và báo cáo được loại khỏi Git bằng `.gitignore`. Dữ liệu lưu tại thư mục dự án; kiểm tra tự động dùng thư mục tạm riêng qua `BOTADS_DATA_DIR`.

## Kiểm tra và giới hạn thực tế

```powershell
npm test
```

Bộ kiểm tra dùng dữ liệu tạm, tiến trình con và Chromium với trang HTML được chặn và cấp nội dung tại máy. Không đăng nhập, tham gia nhóm, gọi Gemini hoặc đăng bài thật. Bao gồm luồng soạn/gửi bài, xác nhận kết quả, phạm vi bình luận, khoảng nghỉ xuyên ngày, chuyển đổi lịch sử, giới hạn ngày, khóa tiến trình, lịch chạy và phục hồi kho AI.

Facebook có thể thay đổi giao diện, giới hạn tài khoản, yêu cầu xác minh hoặc duyệt bài. Khi không xác định chắc, bot dừng hoặc bỏ qua. Xác nhận thực tế lần đầu trên một nhóm bạn quản lý hoặc được phép đăng trước khi bật lịch dài hạn. Đây là tự động đăng bài nhóm; không phải quản lý chiến dịch trả phí trong Meta Ads Manager.

## Nền tảng SaaS (Cloudflare Workers + React + Windows Companion)

Kiến trúc SaaS tách biệt giao diện quản lý trên Cloudflare và ứng dụng chạy cục bộ trên máy Windows của khách hàng theo [SAAS_PLAN.md](SAAS_PLAN.md):

- **Web Dashboard (`apps/web/`)**: React + Vite quản lý tài khoản, chiến dịch, ảnh R2, lịch đăng, kết quả bài viết và thiết bị.
- **Backend API (`apps/api/`)**: Cloudflare Workers + D1 database + R2 object storage + Cron triggers.
- **Windows Companion App (`apps/companion/`)**: Electron tray app, bảo vệ thông tin bằng Windows SafeStorage, điều khiển Chromium Playwright cục bộ.
- **Automation Core (`packages/automation/`)**: Lõi tự động hóa Playwright, tương tác nhóm, kiểm tra nội quy, xác minh bài và bình luận.
- **Contracts (`packages/contracts/`)**: Schema xác thực dữ liệu chiến dịch và tính toán lịch chạy theo múi giờ.

### Cấu trúc mã nguồn Monorepo

```text
apps/
  web/                  Giao diện quản lý React + Vite (Dashboard, Chiến dịch, Thiết bị, Kết quả)
  api/                  Cloudflare Workers API (D1 database, R2 assets, Cron scheduler, Gemini)
  companion/            Ứng dụng Windows Electron (Tray, DPAPI safeStorage, IPC, Playwright runner)
packages/
  automation/           Toàn bộ module Playwright, lọc nhóm, gửi bài, đối soát, lưu trữ dữ liệu
  contracts/            Schema kiểm thực dữ liệu chiến dịch & múi giờ
scripts/                Script đóng gói (build-desktop, setup-local, smoke-ui, install-schedule)
tests/                  Toàn bộ test suites (SaaS API tests, Contracts tests, Browser regression tests)
```

### Lệnh chạy và kiểm thử SaaS

```powershell
# Chạy toàn bộ kiểm thử SaaS (D1, Auth, Pairing, Rate limits, Quota, Cron, Contracts)
npm run test:saas

# Cài đặt môi trường D1 local và khởi tạo biến môi trường .dev.vars
npm run cloud:setup

# Chạy server Cloudflare Workers dev (port 8899)
npm run cloud:dev

# Chạy dashboard web React dev
npm run web:dev

# Build web tĩnh và kiểm tra bundle Cloudflare Workers
npm run cloud:build

# Mở ứng dụng Windows Companion
npm run desktop

# Đóng gói bộ cài đặt Windows (NSIS installer)
npm run desktop:build
```

