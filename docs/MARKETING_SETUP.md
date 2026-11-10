# Vận hành marketing đa kênh trên BotAds

Cập nhật: 10/11/2026. Domain frontend: **https://bot.salesora.space**. Frontend Cloudflare Pages và backend Worker được deploy riêng qua workflow hiện có.

## Phạm vi bản này

- Thương hiệu/website, bài tự soạn và bản nội dung riêng cho LinkedIn, DEV, Medium, Reddit, Indie Hackers.
- Lưu nháp → xem nội dung → duyệt phiên bản → chọn tài khoản đích và lịch → xem kết quả.
- DEV API: xác minh API key, tạo bài đã xuất bản, ảnh, tags và canonical tùy chọn.
- LinkedIn cá nhân: OAuth, đăng text/link trong nội dung hoặc ảnh. Cần Developer App và quyền thật trước khi sử dụng.
- Medium/Reddit/Indie Hackers: tổ chức tài khoản, lịch, sao chép nội dung và nhập link xác nhận; không có đăng tự động cho các kênh này.
- Hàng đợi bền vững trong D1, claim có điều kiện, Cron mỗi 5 phút, nút xử lý bài đến hạn, giới hạn ngày và khóa chống chạy đồng thời.
- Token kết nối mã hóa AES-GCM trên backend, không đưa vào localStorage, cookie hoặc bundle frontend. Thông tin Facebook cũ vẫn nằm trong ứng dụng Windows.
- Báo cáo visits/leads do người dùng nhập có nhãn nguồn; link UTM được gợi ý để tự chèn. Chưa kết nối Search Console/GA4/CRM hoặc tự đo trích dẫn AI.

Hàng đợi dùng D1 trong lần triển khai này, thay cho Cloudflare Queues được đề xuất trong kế hoạch. Không cần tạo thêm tài nguyên Queue hoặc đổi quyền hạ tầng; vẫn giữ journal trước gửi, snapshot nội dung và cơ chế phục hồi. Cron xử lý tối đa 5 bài mỗi lượt; nút xử lý cũng có giới hạn để tránh một request chạy quá lâu. Các bài còn lại giữ nguyên trong hàng đợi. Cần đo tải và nâng giới hạn/tách consumer trước khi mở rộng số khách.

Lịch mới là lịch theo từng lần đăng, lưu UTC và hiển thị theo múi giờ trình duyệt. Chưa tạo lịch marketing lặp lại tự động. Lịch Facebook cũ vẫn dùng cấu hình riêng. LinkedIn Company Pages và xuất bản trực tiếp vào CMS chưa được bật trong bản này; khách có thể nhập URL bài gốc đã xuất bản bằng công cụ hiện có của website.

## 1. Deploy

Push lên nhánh `main` kích hoạt `.github/workflows/deploy-production.yml`:

1. Kiểm tra automation, API/contracts/marketing, build React, kiểm tra giao diện marketing với API giả lập và build backend/Pages Function.
2. Áp dụng migration mới `0002_marketing.sql` vào D1. Migration bổ sung bảng, giữ nguyên dữ liệu Facebook và tài khoản cũ.
3. Deploy Worker và khởi tạo secret `TOKEN_ENCRYPTION_KEY` nếu chưa có.
4. Đưa AUTH_SECRET và các thông tin LinkedIn được cung cấp vào Worker; giữ khóa mã hóa marketing đã tồn tại.
5. Deploy Pages, kiểm tra giao diện và `/api/meta` qua cả Pages URL và `bot.salesora.space`.

Secrets đang có: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `AUTH_SECRET`. Token Cloudflare cần quyền Workers Scripts, D1, R2 và Pages tương ứng với hệ thống hiện tại. Secret bootstrap dùng quyền quản lý secret của Worker.

`TOKEN_ENCRYPTION_KEY` là 32 byte ngẫu nhiên mã hóa base64. Workflow tự tạo một lần trên Worker; các lần deploy sau không thay thế. Có thể tự tạo và thêm vào GitHub Secrets trước lần đầu nếu muốn quản lý bản sao khóa trong password manager. Không đưa khóa vào chat, log hoặc Git. Khi Worker đã có khóa, script bootstrap giữ nguyên ngay cả khi GitHub Secrets có giá trị khác; xoay khóa phải thực hiện có chủ đích theo mục bên dưới.

`PUBLIC_APP_URL` production đã đặt là `https://bot.salesora.space`. Custom domain này phải gắn vào project Pages `botads-web` và dùng HTTPS. Project name không cần trùng domain. Nếu health check Pages URL đạt nhưng custom domain thất bại, kiểm tra mapping domain/DNS và lớp Access/WAF; workflow báo lỗi thay vì coi production đã sẵn sàng.

Đừng chạy lại migration đầu bằng cách xóa database. Sao lưu/khả năng phục hồi D1 và quy trình rollback cần được chủ hệ thống duy trì khi vận hành cho khách.

## 2. Tạo LinkedIn Developer App

Trang privacy/terms/support/data-deletion đã được bổ sung vào bản build. Xem [cách vận hành hỗ trợ và hoàn tất LinkedIn](SUPPORT_OPERATIONS.md) để biết URL và bước cấu hình. Chỉ điền URL privacy sau khi deploy và kiểm tra truy cập thật.

Không cần khách gửi mật khẩu LinkedIn. Chủ hệ thống tạo app một lần, mỗi khách sau đó tự OAuth tài khoản của họ.

1. Vào [LinkedIn Developers](https://www.linkedin.com/developers/apps), đăng nhập và tạo ứng dụng. Hoàn tất thông tin ứng dụng và liên kết/xác minh Company Page nếu Developer Portal yêu cầu.
2. Khai báo website sản phẩm `https://bot.salesora.space` và các trang chính sách/quyền riêng tư có nội dung đúng với cách sản phẩm xử lý dữ liệu.
3. Trong **Products**, yêu cầu/bật **Share on LinkedIn** và **Sign In with LinkedIn using OpenID Connect**. Chờ hoàn tất các bước xét duyệt/verification được portal yêu cầu. Không coi việc có Client ID là đã có đủ quyền.
4. Trong **Auth → Authorized redirect URLs**, thêm chính xác:

   ```text
   https://bot.salesora.space/api/marketing/linkedin/callback
   ```

5. Lấy Client ID và Client Secret; thêm vào GitHub repository/environment **production** secrets:

   ```text
   LINKEDIN_CLIENT_ID
   LINKEDIN_CLIENT_SECRET
   ```

6. Chạy lại workflow. Có thể đặt hai Worker secrets này trực tiếp trong Cloudflare Dashboard nếu không dùng GitHub; lần deploy không cung cấp các giá trị mới sẽ giữ các secrets đang có.
7. Trên BotAds → **Marketing đa kênh → Kết nối kênh → LinkedIn → Kết nối qua LinkedIn**, chọn đúng thương hiệu và hoàn tất consent.
8. Tạo một bài test được phép, duyệt và lên lịch cho tài khoản vừa kết nối. Xác nhận bài trên LinkedIn và permalink trong BotAds trước khi mở cho khách.

Scopes dùng trong bản này: `openid profile w_member_social`. LinkedIn member ID lấy từ `/v2/userinfo`; API publisher dùng `/rest/posts` và `/rest/images`, header version `202610`. Cần bảo trì version theo lịch sunset của LinkedIn. Quyền đọc bài/thống kê không được mặc định có từ quyền ghi.

OAuth state một lần gắn với browser cookie HttpOnly, SameSite=Lax có hạn 10 phút. Cookie đăng nhập BotAds vẫn SameSite=Strict. Callback không yêu cầu nới cookie đăng nhập hoặc lưu access token vào frontend.

Token có hạn; bản này yêu cầu người dùng kết nối lại khi hết hạn hoặc bị thu hồi. Không hứa refresh tự động nếu app chưa được cấp khả năng đó. Nếu giao diện báo kết nối thất bại: kiểm tra hai Products, redirect URI, secrets và dùng đúng domain chính. Không gửi Client Secret cho người hỗ trợ qua chat.

Nguồn: [LinkedIn OAuth](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow), [API access](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access), [Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api).

## 3. Kết nối DEV

1. Khách đăng nhập DEV, mở [Settings → Extensions](https://dev.to/settings/extensions), tạo API key cho BotAds.
2. Trên BotAds chọn đúng thương hiệu, vào **Kết nối kênh**, chọn **DEV Community**, nhập API key và thêm tài khoản.
3. Backend kiểm tra `/api/users/me` và mã hóa key. API dashboard chỉ trả thông tin tài khoản và trạng thái; không trả lại key.
4. Trong bài viết chọn bản DEV, nhập tiêu đề, Markdown, tối đa 4 tag chữ thường/số; khai báo canonical chỉ khi đăng lại nội dung tương tự từ bài gốc.
5. Duyệt, chọn tài khoản DEV, lưu lịch. Bài được gửi ở chế độ published, không phải draft trên DEV. Dùng nội dung test được phép khi nghiệm thu.

Nguồn: [DEV/Forem API](https://developers.forem.com/api/v1).

## 4. Cách khách sử dụng

1. Đăng nhập website, vào **Marketing đa kênh**.
2. **Thêm thương hiệu**: tên thống nhất, website, khách mục tiêu, ngôn ngữ và link liên hệ.
3. Thêm tài khoản kênh. Kênh thủ công chỉ yêu cầu tên để quản lý, không nhận password hoặc cookie của nền tảng.
4. **Tạo bài tự soạn**. Chọn các bản theo kênh và nhập nội dung riêng. Hệ thống giữ nguyên văn bản khi gửi; không tự chèn CTA, sửa câu chữ hay gọi AI.
5. Thêm ảnh nếu cần. Với API, xác nhận quyền chia sẻ công khai ảnh khi đăng. Ảnh nguồn vẫn private; bản ảnh của bài xuất bản được sao chép thành URL công khai không đổi để nền tảng có thể đọc lâu dài.
6. **Lưu bản nháp**, mở lại kiểm tra, rồi **Duyệt nội dung**.
7. **Lên lịch đăng**, chọn đúng tài khoản và ngày giờ. Để trống giờ để vào lượt lịch kế tiếp. Mỗi lần lưu tương ứng một lịch đăng; không tự tạo lịch lặp.
8. API kiểm tra đến hạn mỗi 5 phút. Có thể dùng **Xử lý bài đến hạn** để yêu cầu xử lý ngay các bài đã đến giờ. Không gửi sớm những bài đặt trong tương lai.
9. Kênh thủ công: sao chép, mở nền tảng, tự thêm ảnh/kiểm tra nội quy và đăng; sau đó nhập permalink. Trạng thái ghi **Bạn xác nhận đã đăng**.
10. Sau khi có dữ liệu analytics/CRM, nhập visits/leads và nguồn/kỳ đo trong **Nhập số liệu**. Không coi các con số này là API nền tảng tự xác nhận.

Đóng tab hoặc tắt máy khách không ảnh hưởng publisher API. Nhánh Facebook vẫn cần ứng dụng Windows online. Nút hủy không xóa bài mà nền tảng đã nhận.

## 5. Đọc kết quả và xử lý lỗi

| Trạng thái | Ý nghĩa / cách xử lý |
| --- | --- |
| Đã lên lịch | Đang chờ giờ, quota và lượt worker |
| Đang gửi | Có worker giữ lease; có thể đã bắt đầu gửi HTTP |
| API xác nhận đã đăng | Có phản hồi thành công và ID/link bài; index, lượt xem và chuyển đổi là số liệu riêng |
| Cần tự đăng | Người dùng cần thực hiện trên Medium/Reddit/Indie Hackers |
| Bạn xác nhận đã đăng | Người dùng cung cấp link; không gắn nhãn API đã xác minh |
| Cần kết nối lại | Token hết hạn/401 hoặc tài khoản đã mất hiệu lực |
| Chờ thử lại | Nền tảng báo rate limit hoặc tài khoản đang trong khoảng nghỉ |
| Lỗi | Lỗi đã rõ trước khi đăng hoặc provider từ chối; kiểm tra và chủ động thử lại |
| Chưa rõ | Request có thể đã được nhận; không tự gửi lại |

Nếu **Chưa rõ**: mở tài khoản nền tảng để kiểm tra. Đã có bài thì nhập permalink. Chỉ khi đã xác nhận trực tiếp chưa có bài mới dùng **Đã kiểm tra: chưa đăng**, ghi lý do và xác nhận; sau đó có thể chủ động thử lại. Cơ chế này không thay thế việc kiểm tra của chủ tài khoản và không bảo đảm exactly-once khi provider không có idempotency API.

Sửa bài tạo phiên bản nháp mới, cần duyệt lại. Lượt đã đặt lịch giữ snapshot đã duyệt; phải hủy lượt cũ nếu muốn thay nội dung. Một bản nội dung trên cùng tài khoản không được tạo thêm lịch khi lượt trước còn chờ/chưa rõ.

Mỗi account nền tảng có khoảng nghỉ ít nhất 60 giây và khóa dùng chung kể cả khi được liên kết ở nhiều workspace. Giới hạn marketing/ngày lấy từ Cài đặt tài khoản; tính riêng với Facebook theo múi giờ workspace, giữ chỗ cho lượt published/unknown. Có thêm trần rolling 24 giờ theo remote account (`MARKETING_ACCOUNT_DAILY_LIMIT`, mặc định 100). Không mô tả các giới hạn này là bảo đảm tài khoản không bị nền tảng hạn chế.

Ngắt kết nối xóa credential trong hệ thống và hủy các lượt chưa gửi. Nếu muốn thu hồi quyền ứng dụng ở provider, khách cũng cần thao tác trong LinkedIn/DEV. Ảnh đã được chia sẻ trong bài công khai và bài đã đăng không tự biến mất khi ngắt kết nối.

## 6. Local và kiểm thử

```powershell
npm run cloud:setup
npm run cloud:dev
# Trong terminal khác:
npm run web:dev
```

Mở `http://127.0.0.1:5173`. `cloud:setup` giữ AUTH_SECRET cũ, bổ sung khóa marketing nếu thiếu và áp dụng migrations local. Không in khóa ra terminal.

`wrangler dev` không tự kích hoạt Cron như production; dùng nút xử lý bài đến hạn. Không cố thực hiện LinkedIn OAuth local bằng callback production; nghiệm thu OAuth trên domain HTTPS đã đăng ký với LinkedIn, hoặc cấu hình app/callback dev riêng theo quy định provider.

Kiểm tra tự động:

```powershell
npm test
npm run test:saas
npm run web:build
npm run test:marketing:ui
npm run web:check
npm run cloud:build:production
```

`test:marketing:ui` dùng D1/R2 tạm và API giả lập; không dùng khách thật, không gửi bài ra ngoài. Bao gồm đăng ký, brand, kết nối DEV/thủ công, soạn/preview/duyệt/lịch, nhập permalink và số liệu, gửi qua publisher fixture, desktop/mobile. Ảnh chụp tại `test-results/marketing-desktop.png` và `marketing-mobile.png`.

## 7. Khóa mã hóa và phục hồi

Giữ khóa hiện tại, không thay ngẫu nhiên mỗi deploy. Dữ liệu token chứa key version và AAD gắn với workspace/provider/account.

Khi xoay khóa có kế hoạch: đặt secret khóa cũ vào `TOKEN_ENCRYPTION_KEY_PREVIOUS`, đặt version cũ ở `TOKEN_KEY_VERSION_PREVIOUS`; đặt khóa mới và đổi `TOKEN_KEY_VERSION`. Bản này đọc được khóa hiện tại và một khóa trước. Cần chuyển/mã hóa lại các connection hoặc yêu cầu khách kết nối lại trước lần xoay tiếp theo; không xóa khóa cũ khi vẫn còn token cần giải mã.

Nếu mất khóa, không thể phục hồi các credential đã mã hóa chỉ từ D1. Tài khoản BotAds/nội dung không mất nhưng khách cần kết nối lại các kênh. Quyền truy cập Cloudflare, backup khóa tự quản lý và D1 cần được kiểm soát phù hợp với việc vận hành cho khách hàng.

## 8. Checklist trước khi mời khách

- Workflow xanh, migration bổ sung đạt, web/API trên custom domain đúng và cookie hoạt động.
- Thử DEV bằng một tài khoản được phép; kiểm tra đúng nội dung, tác giả, ảnh và URL.
- Hoàn tất LinkedIn App, consent thật và một bài thật; app chưa có quyền thì không bật bán tính năng LinkedIn như đã sẵn sàng.
- Kiểm tra một lượt ngắt kết nối, token hết hạn, bài lỗi và xử lý unknown.
- Xác nhận dữ liệu hai khách không đọc chéo được bằng test, giới hạn và lịch đúng múi giờ.
- Có trang privacy/terms và cách hỗ trợ, xử lý yêu cầu xóa dữ liệu trước khi mở rộng thương mại.
- Không hứa thứ hạng SEO/GEO, không hứa tự đăng đủ năm nền tảng. Theo dõi traffic/lead thực tế trong pilot.

Kiểm thử giả lập và build thành công không thay thế nghiệm thu provider thật hoặc kiểm tra production. Không có quyền API/tài khoản thật thì phải ghi là chưa nghiệm thu, không báo thành công thay khách.

## Kết quả kiểm tra mã nguồn ngày 10/11/2026

- `npm test`: 45/45 đạt.
- `npm run test:saas`: 34/34 đạt, bao gồm 16 kiểm tra marketing mới.
- `npm run web:build`, `npm run web:check`, `npm run cloud:build:production`: đạt.
- `npm run test:marketing:ui`: đạt trên desktop 1440px và mobile 390px, không tràn ngang; API provider và dữ liệu đều là fixture riêng.
- YAML workflow và cú pháp script khởi tạo secret: hợp lệ.
- Chưa push/deploy production hoặc gửi bài thật trong phiên triển khai này. Chủ hệ thống xác nhận chưa có LinkedIn Developer App; bước cấu hình và nghiệm thu thật vẫn cần thực hiện theo mục 2.
