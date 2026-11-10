# Kế hoạch BotAds: phân phối nội dung marketing, SEO và GEO

Ngày nghiên cứu: 09/11/2026. Cập nhật triển khai: 10/11/2026. Đã bổ sung mã nguồn cho MVP đa kênh; xem [hướng dẫn cấu hình, phạm vi thực tế và nghiệm thu](MARKETING_SETUP.md). Các mục dưới là kế hoạch gốc; hàng đợi bản đầu dùng D1 thay Cloudflare Queues. LinkedIn thật cần chủ hệ thống tạo app/cấp quyền; chưa có nghiệm thu đăng thật chỉ từ việc hoàn thành code.

## 1. Hiểu yêu cầu và quyết định đề xuất

- Sản phẩm quản lý tại `https://bot.salesora.space`; đây là domain frontend do chủ dự án cung cấp.
- XayWebsite là thương hiệu/website chạy pilot đầu tiên; hệ thống sau đó phục vụ nhiều khách hàng, mỗi khách có website và tài khoản kênh riêng.
- Người dùng tự soạn bài, chọn ảnh, chọn kênh, duyệt nội dung và đặt lịch. Bản đầu không cần AI viết bài, Gemini hoặc OpenClaw.
- Mục tiêu kinh doanh: tìm khách quốc tế và tạo lượt truy cập có chất lượng; hỗ trợ nội dung hữu ích được tìm thấy qua công cụ tìm kiếm và các hệ thống trả lời AI.
- Ưu tiên xuất bản bằng API chính thức ở kênh đủ điều kiện. Cloudflare chạy lịch và gửi API nên khách không cần bật máy cho luồng này.
- Medium, Reddit và Indie Hackers cần mức tự động hóa khác nhau. Không đưa ra cam kết tự đăng đủ năm nền tảng ngay từ MVP.
- Facebook Groups hiện có tiếp tục là chức năng browser/companion riêng. Không biến việc chuyển sang API LinkedIn thành lời hứa bỏ được companion cho mọi kênh.

Định vị đề xuất: **công cụ quản lý và phân phối nội dung có lịch, có xác nhận kết quả và đo chuyển đổi**. SEO/GEO là mục tiêu được hỗ trợ bằng nội dung và đo lường; không phải kết quả được bảo đảm bởi số bài đã gửi.

## 2. Những gì đã kiểm tra và giới hạn xác minh

Đã đọc mã nguồn API, campaign contracts, schema D1, luồng giao việc, cấu hình Pages/Worker, workflow deploy và toàn bộ file người dùng gửi gồm năm bài mẫu.

Mã nguồn hiện có:

- React ở `apps/web`, cấu hình Pages project `botads-web`.
- API ở Worker `bot-ads-production`, D1 và R2; Pages Function chuyển tiếp `/api/*` bằng binding `BACKEND`.
- Đăng nhập BotAds, workspace theo chủ tài khoản, nội dung thủ công, ảnh, chiến dịch, lịch, nhật ký và thiết bị.
- Campaign contract gắn với nhóm Facebook; việc thực thi do ứng dụng Windows nhận qua `/api/device/*`.
- Chưa có connector LinkedIn, DEV, CMS, OAuth tài khoản marketing, token vault hoặc publisher API chạy nền.

Tên Pages project `botads-web` không cần trùng domain `bot.salesora.space`. Nếu custom domain được gắn đúng project Pages này thì các đường `/api` tương đối tiếp tục dùng domain khách đang mở. Workflow hiện chỉ kiểm tra frontend qua `botads-web.pages.dev`; cần thêm kiểm tra custom domain khi triển khai giai đoạn đầu.

Đã thử đọc `https://bot.salesora.space/` và `/api/meta` nhưng công cụ duyệt không truy cập được; kết nối từ môi trường shell bị giới hạn. Vì vậy chưa xác nhận tình trạng production, mapping custom domain, cookie hay deployment mới nhất. Đây không phải bằng chứng website đang lỗi.

Đã đọc được trang công khai [XayWebsite](https://xaywebsite.com/): thông điệp chính hiện là AI Automation & Integration cho doanh nghiệp Mỹ, bên cạnh các dịch vụ website. [Resources](https://xaywebsite.com/resources) đã có nhóm bài về AI workflows, integration và đánh giá pilot. Chưa xác định CMS, quyền quản trị hoặc API xuất bản của website từ repo BotAds.

## 3. Khả năng tích hợp từng kênh

| Kênh | Tình trạng nghiên cứu | Cách kết nối/xuất bản đề xuất | MVP |
| --- | --- | --- | --- |
| Blog website khách | Phụ thuộc CMS thực tế; không mặc định website đang dùng WordPress | Bản đầu nhập URL bài gốc đã xuất bản. Sau đó thêm connector CMS phù hợp | Có nhập URL gốc; tự xuất bản website làm sau khi kiểm tra CMS |
| LinkedIn cá nhân | Có quyền `w_member_social` qua sản phẩm Share on LinkedIn | OAuth; backend gọi API khi đến lịch | Kênh ưu tiên tìm khách doanh nghiệp; cần hoàn thành thử nghiệm quyền truy cập trước khi cam kết |
| LinkedIn Company Page | API có `w_organization_social`, cần quyền app và vai trò phù hợp trên Page | Connector riêng cho organization, kiểm tra quyền thực tế | Giai đoạn sau; không dùng quyền đăng cá nhân thay cho quyền Page |
| DEV Community | API có tạo bài, Markdown, draft/publish, `canonical_url` | Khách cấp API key ở backend; xuất bản qua API | Connector kỹ thuật đầu tiên, phù hợp bài chuyên môn |
| Medium | Không cho tích hợp mới, không cấp integration token mới; token cũ được mô tả là tiếp tục hoạt động | Xuất nội dung và hướng dẫn Import Story; người dùng thực hiện xuất bản | Hỗ trợ thủ công; không hứa OAuth mới cho mọi khách |
| Reddit | Truy cập API và sử dụng thương mại cần phê duyệt phù hợp | MVP chuẩn bị bản nháp và nhắc lịch; người dùng tự đăng theo quy định cộng đồng | Thủ công, chỉ bật API nếu use case được duyệt |
| Indie Hackers | Chưa tìm thấy tài liệu chính thức cho public publishing API trong nghiên cứu này | Chuẩn bị bản nháp, mở trang đăng, khách gửi và nhập permalink | Thủ công; không kết luận tuyệt đối rằng không tồn tại API |
| Facebook Groups hiện tại | Lõi đang dùng Playwright và ứng dụng Windows | Giữ companion, session và quy trình đối soát hiện có | Một nhánh riêng, không bị thay thế bởi publisher API |

Nguồn: [LinkedIn permissions](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access), [LinkedIn Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api), [Forem API](https://developers.forem.com/api/v1), [Medium API](https://help.medium.com/hc/en-us/articles/213480228-API-Importing), [Reddit access](https://support.reddithelp.com/hc/en-us/articles/14945211791892-Developer-Platform-Accessing-Reddit-Data).

Lưu ý LinkedIn: đăng bài, đọc lại bài và đọc thống kê có quyền khác nhau. Không thiết kế dashboard hứa đọc toàn bộ bài cá nhân nếu chỉ có quyền ghi. Refresh token cũng không mặc định có cho mọi app; cần lưu hạn token và có luồng yêu cầu kết nối lại. Nguồn: [refresh tokens](https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens).

## 4. Vai trò của OpenClaw và AI

Không cần OpenClaw để hoàn thành luồng này. Scheduler, database, queue và publisher có thể xử lý bài tự soạn bằng logic xác định. Không phát sinh chi phí LLM cho mỗi lượt gửi.

[OpenClaw](https://docs.openclaw.ai/help/faq/what-is-openclaw) là nền tảng trợ lý tự vận hành trên hạ tầng riêng. Có thể cân nhắc sau này nếu muốn quản lý qua chat hoặc trợ lý đề xuất nội dung; nó không cung cấp thay quyền API của LinkedIn/Reddit và không mở lại API mới của Medium.

Nếu bổ sung AI: AI đọc brand brief, gợi ý lịch/bản nội dung theo kênh và đánh dấu nội dung cần kiểm chứng. AI tạo draft, người dùng duyệt phiên bản; publisher chỉ gửi phiên bản đã duyệt. Không để nội dung trang bên ngoài trở thành lệnh thực thi hoặc cho mô hình tự đọc token bí mật.

## 5. Đánh giá năm bài mẫu

Năm bài dùng được làm nguyên liệu ban đầu, nhưng chưa đủ để chứng minh năng lực hoặc tạo khác biệt. Hiện phần lớn là kiến thức phổ biến và chưa có bằng chứng dự án riêng.

| Bài | Đánh giá | Chỉnh trước khi dùng |
| --- | --- | --- |
| LinkedIn | Thông điệp dễ hiểu, CTA rõ | Chọn một nhóm khách/một vấn đề; thêm ảnh dự án thật, cách xử lý và kết quả có thể kiểm chứng |
| Reddit | Có nội dung tư vấn | Kiểm tra quy định nơi đăng; công khai liên quan thương hiệu khi cần; chỉ dùng câu chuyện kinh nghiệm thực sự có |
| Medium | Có thể phát triển thành bài dài | Chọn câu hỏi cụ thể, ví dụ và nguồn; đưa bản gốc lên website trước nếu muốn syndicate |
| DEV | Đúng hướng kỹ thuật nhưng còn tổng quát | Thêm code, sơ đồ, lựa chọn kỹ thuật, trade-off và cách kiểm chứng kết quả |
| Indie Hackers | Có câu hỏi cho founder | Bổ sung trải nghiệm xây sản phẩm thật, giới hạn và bài học; chỉ gắn link nếu phù hợp quy định |

Cần chốt cách gọi thương hiệu: file mẫu dùng XayWebsite, website hiện hiển thị AI Solutions service. Không tự đổi tên thương hiệu; khai báo brand brief thống nhất trước khi phát hành hàng loạt.

Hai trụ nội dung pilot đề xuất: AI workflow/integration cho doanh nghiệp nhỏ tại Mỹ, và website hỗ trợ chuyển đổi/luồng thu lead. Bài về web design vẫn dùng được nếu chủ đích bán đúng dịch vụ đó và dẫn tới landing page tương ứng.

Ví dụ chuỗi nội dung: bài gốc hướng dẫn tích hợp form website với CRM và quy trình theo dõi lead → LinkedIn giải thích vấn đề kinh doanh → DEV trình bày giải pháp kỹ thuật → Medium import bài gốc nếu phù hợp → Reddit/Indie Hackers thảo luận thật trong cộng đồng cho phép. Không cần ép cùng một bài lên đủ mọi nơi.

## 6. Luồng sử dụng của khách

1. Đăng nhập tại `bot.salesora.space`, tạo hồ sơ website/thương hiệu: dịch vụ, đối tượng, ngôn ngữ, thị trường và CTA.
2. Thêm tài khoản kênh. LinkedIn dùng OAuth, DEV dùng API key. Kênh thủ công hiển thị rõ không tự xuất bản.
3. Tạo bài tự soạn: tiêu đề, nội dung, ảnh, nguồn thông tin, bài gốc và trang dịch vụ đích.
4. Tạo từng bản cho từng kênh. Người dùng có thể nhập riêng năm bài đã chuẩn bị; hệ thống không tự sửa chữ trong chế độ thủ công.
5. Xem preview, kiểm tra yêu cầu từng kênh, duyệt phiên bản và đặt lịch theo múi giờ.
6. Kênh API được backend gửi khi đến lịch. Khách không cần bật máy hoặc mở Chrome cho các tác vụ này.
7. Kênh thủ công có danh sách việc đến hạn, nút sao chép nội dung/mở nền tảng. Khách đăng và nhập link bài; hệ thống ghi rõ kết quả do người dùng báo.
8. Dashboard hiện từng đích đăng, permalink, lỗi, nội dung đang chờ thao tác và yêu cầu kết nối lại. Facebook browser vẫn có điều kiện thiết bị online riêng.

Không gắn `published` cho một bài chỉ vì khách đã bấm nút sao chép hoặc mở trang đăng.

## 7. Kiến trúc đề xuất

```text
Khách hàng
  -> bot.salesora.space / React trên Cloudflare Pages
  -> Pages /api/* -> service binding BACKEND
  -> API Worker: auth, brand, nội dung, OAuth, lịch
      -> D1: tài khoản kênh, phiên bản bài, lịch, publication/outbox
      -> R2: ảnh và tài sản nội dung
      -> Cron: chọn publication đến hạn, tạo outbox
      -> Cloudflare Queue -> consumer publisher trong Worker
          -> LinkedIn API / DEV API / CMS khi có connector
          -> trạng thái, post ID, permalink, audit log
      -> danh sách việc thủ công cho kênh chưa có API
      -> nhánh Facebook cũ -> companion Windows -> Playwright
```

Pages và API tiếp tục là hai đích deploy riêng. Consumer có thể nằm cùng codebase Worker API ở giai đoạn đầu, tách Worker riêng khi cần cô lập tải. Không cần chuyển toàn bộ backend sang VPS chỉ để gửi HTTP API.

Cron quét công việc có `scheduled_at <= now` theo trang, không chỉ giới hạn im lặng ở 500 campaign. Lưu lịch thực thi bằng UTC, giữ IANA timezone và quy tắc lịch để xử lý DST. Mức trễ lịch pilot phải công khai theo nhịp Cron; chưa hứa chính xác từng giây.

## 8. Mô hình dữ liệu và hợp đồng thực thi

Thêm migration mới, giữ nguyên các bảng/dữ liệu Facebook cũ:

- `brands`: workspace, domain đã xác minh, tên thương hiệu, khách mục tiêu và dịch vụ.
- `channel_accounts`: workspace, brand, provider, remote actor ID, kiểu cá nhân/Page, scopes, trạng thái kết nối và hạn token.
- `credentials`: token mã hóa, key version, thời hạn và dấu thời gian thu hồi; có thể lưu cùng bảng account nếu MVP đơn giản.
- `content_items`, `content_versions`: bài tự soạn, nguồn, URL gốc, ngôn ngữ, checksum và người duyệt.
- `content_variants`: phiên bản theo kênh, title/body, ảnh, tags, canonical URL và UTM riêng.
- `publications`: account đích, version đã duyệt, lịch, execution mode, trạng thái, remote ID và URL.
- `publish_attempts`, `outbox_events`: số lần thử, request fingerprint, mã phản hồi đã lọc và dấu thời gian.
- `audit_events`, `metric_snapshots`: lịch sử thay đổi và đo lường có nguồn rõ ràng.

Connector contract đề xuất: `validate`, `capabilities`, `publish`, `reconcile`, và `revoke/refresh` khi provider hỗ trợ. `capabilities` phân biệt ghi bài, đọc bài, ảnh, sửa, xóa, draft, canonical, analytics và refresh; UI chỉ bật chức năng đã có quyền.

## 9. Chống trùng, xử lý lỗi và thông tin xác thực

Mỗi publication có khóa duy nhất dựa trên workspace, account, content version và lịch/ý định gửi. Người dùng muốn đăng lại phải tạo ý định mới. Nhiều campaign cùng tài khoản phải chịu rate limit chung của provider/account.

Cloudflare Queue có khả năng giao lại message; không giả định exactly-once. Dùng D1 để claim có điều kiện và kiểm tra trạng thái trước side effect. Ghi bản ghi gửi trước khi gọi provider và giữ kết quả từng đích riêng. Outbox phải có cách quét lại để phục hồi trường hợp D1 ghi thành công nhưng gửi queue thất bại. Nguồn: [delivery guarantees](https://developers.cloudflare.com/queues/reference/delivery-guarantees/), [retries/DLQ](https://developers.cloudflare.com/queues/configuration/batching-retries/).

Trạng thái đề xuất: `draft`, `approved`, `scheduled`, `queued`, `publishing`, `published`, `awaiting_manual`, `user_reported_published`, `needs_reauth`, `retry_wait`, `failed`, `unknown`, `canceled`.

- API trả thành công và post ID: lưu bằng chứng provider đã nhận/xuất bản theo hợp đồng API. Việc crawl/index là bước khác.
- Timeout sau khi gửi: ghi `unknown`; đối soát khi provider và quyền cho phép. Không tự tạo bài lần hai chỉ vì chưa nhận được phản hồi.
- 401/token hết hạn: tạm ngừng account, yêu cầu kết nối lại. 403: làm rõ thiếu quyền, sai actor hoặc hạn chế; không thử vô hạn.
- 429: theo chỉ dẫn provider và backoff. Lỗi 5xx/transport cần xét nguy cơ request đã có hiệu lực trước khi thử lại.
- Lỗi kéo dài: vào DLQ/danh sách cần xử lý. Dừng chiến dịch chặn thao tác gửi mới; không cam kết thu hồi bài đã nhận.

OAuth dùng callback cố định, state một lần gắn phiên/workspace, hạn ngắn; dùng PKCE khi provider hỗ trợ. Redirect sau callback theo allowlist. Token chỉ ở server, mã hóa có xác thực bằng khóa mã hóa riêng trong Worker secret, có phiên bản khóa để xoay vòng; không dùng AUTH_SECRET làm khóa token. Không trả token lại cho frontend hoặc ghi vào log.

Disconnect ngừng lịch của connection, thu hồi/xóa credential theo khả năng provider. Mọi truy cập có workspace ownership check; không tin workspace ID do client truyền. Connector CMS hoặc tải URL do khách nhập cần phòng SSRF, giới hạn HTTPS/redirect/dung lượng và kiểm tra quyền domain. Ảnh nội bộ vẫn private; chỉ cấp đường dẫn có thời hạn phù hợp nếu provider cần tải ảnh.

## 10. Công việc thực sự hỗ trợ SEO/GEO

SEO của website đích không được chuyển sang dashboard BotAds. Bài công khai và trang dịch vụ cần URL ổn định, nội dung đọc được, navigation, metadata và đo chuyển đổi. Đánh giá thực tế từng trang bằng Search Console và kiểm tra truy cập; không suy ra chất lượng index chỉ từ trang chủ.

Google cho biết nền tảng SEO hiện có vẫn áp dụng cho AI Overviews/AI Mode; không cần một loại schema hoặc file AI đặc biệt để đủ điều kiện. Đây là hướng dẫn cho Google Search, không phải quy luật chung cho mọi hệ thống AI. Không có cam kết index/xếp hạng/trích dẫn. Nguồn: [Google AI features](https://developers.google.com/search/docs/appearance/ai-features).

Các việc nội dung đề xuất: trả lời một câu hỏi có nhu cầu thật, nói rõ ai phù hợp/không phù hợp, dùng ví dụ và số liệu thực, ghi tác giả/ngày cập nhật/nguồn, liên kết bài với dịch vụ và case study liên quan. Không bịa trải nghiệm, số doanh thu, kết quả dự án hoặc khách hàng để tăng sức thuyết phục.

Bài gốc ở website trước; bản syndicate đủ tương tự có canonical về URL bài gốc khi nền tảng hỗ trợ. Bản LinkedIn/tóm tắt khác nội dung không mặc định cần canonical. Canonical là tín hiệu lựa chọn URL, không bảo đảm Google chọn đúng bản mong muốn. UTM dùng cho link CTA, không đưa thông số theo dõi vào canonical. Nguồn: [Google canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [Medium Import](https://help.medium.com/hc/en-us/articles/214550207-Importing-a-post-to-Medium).

Không xây tính năng tạo backlink hàng loạt nhằm thao túng thứ hạng hoặc đăng nội dung ít giá trị ở quy mô lớn. Nguồn: [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies).

## 11. Đo hiệu quả

Tách bốn nhóm số liệu:

1. Vận hành: đến hạn, đã gửi, provider trả thành công, chờ thủ công, unknown, lỗi theo kênh và thời gian xử lý.
2. Phân phối: lượt xem/tương tác do API có quyền cung cấp; trường hợp không có quyền thì hiển thị không khả dụng hoặc cho nhập thủ công có nhãn.
3. Kinh doanh: lượt về website theo UTM/referrer, form gửi thành công, yêu cầu tư vấn, qualified leads và đơn hàng khi có dữ liệu.
4. Search/GEO: hiệu suất tìm kiếm website, URL được index qua nguồn kiểm tra phù hợp; bộ câu hỏi AI theo dõi thủ công hoặc qua công cụ có quyền, ghi ngày/model/ngôn ngữ và link trích dẫn quan sát được.

Không coi mọi direct traffic là do AI, không biến việc được nhắc một lần thành bằng chứng mô hình đã học thương hiệu, không suy ra đăng 20 bài sẽ tăng hạng bao nhiêu. Giai đoạn đầu không cần xây công cụ đo GEO tự động riêng.

## 12. Lộ trình và tiêu chí nghiệm thu

Các mốc theo kết quả, không phải cam kết thời gian duyệt API từ bên ngoài.

| Mốc | Công việc | Điều kiện hoàn thành |
| --- | --- | --- |
| P0: domain và định vị | Xác nhận Pages custom domain; kiểm tra web, `/api/meta`, cookie, upload, pairing; chốt brand và CMS; đăng ký app LinkedIn | Có kiểm tra production qua domain thật, có tài khoản/kênh pilot và phạm vi API đã biết |
| P1: nội dung đa kênh | Brands, phiên bản bài, editor theo kênh, preview/approval, link gốc, UTM, danh sách việc thủ công | Nhập năm bài mẫu thành năm bản đúng kênh; không tự sửa bài; sửa sau duyệt tạo version cần duyệt lại |
| P2: publisher API đầu tiên | DEV connector, token vault, publications, outbox, queue, hạn mức và xử lý timeout | Tạo draft và một bài thật được phép; lưu đúng ID/URL; test giao message lặp và phục hồi không gửi mù |
| P3: LinkedIn | OAuth, đúng member actor, text/link và ảnh; thêm Page chỉ khi có quyền | Một bài trên tài khoản pilot đăng được khi máy khách tắt; token hết hạn được xử lý; không hứa analytics chưa có quyền |
| P4: website và đo lường | CMS connector nếu đã xác định, hoặc tiếp tục nhập URL gốc; baseline search/lead, báo cáo UTM | Từ bài gốc đến bài phân phối và một sự kiện lead có thể lần theo được |
| P5: khách pilot | Một brand nội bộ trước, rồi 3–5 khách; hỗ trợ, xóa dữ liệu, quota và chi phí | Cô lập dữ liệu/token, phục hồi lỗi, không gửi trùng trong kịch bản kiểm thử; checklist hỗ trợ được dùng thực tế |

Ưu tiên kinh doanh là LinkedIn và website. Thứ tự kỹ thuật có thể làm DEV trước để kiểm chứng pipeline trong lúc hoàn thành quyền LinkedIn. Không bắt buộc xây connector WordPress nếu XayWebsite không dùng WordPress. Nếu dùng WordPress self-hosted, xem [Application Passwords](https://developer.wordpress.org/advanced-administration/security/application-passwords/) để kết nối bằng thông tin xác thực riêng có thể thu hồi.

Kiểm thử bắt buộc: cross-workspace, OAuth state/replay, token hết hạn, thiếu quyền, queue giao lại, crash sau provider nhận bài, rate limit, dừng giữa campaign, ảnh hết hạn, nhiều đích một đích lỗi, lịch qua DST, manual chưa nhập link, không lấy được analytics. Test tự động dùng mock/fixture; smoke thật do chủ tài khoản cho phép với phạm vi một bài.

## 13. Chi phí và phạm vi bán cho khách

Chi phí cần đo: Workers/Queues/D1/R2, tần suất cron, ảnh/băng thông, lưu nhật ký, hỗ trợ khách, quyền truy cập API theo thỏa thuận nền tảng. Không gắn một mức giá cứng khi chưa có đo pilot. Chế độ bài tự soạn không bắt buộc phát sinh tiền model AI; tự viết connector vẫn có chi phí phát triển và bảo trì.

Gói MVP chỉ nên mô tả đúng: quản lý bài tự soạn, lịch, đăng qua các connector đã hỗ trợ, trợ giúp thủ công cho các kênh còn lại, báo cáo trạng thái và traffic/lead có dữ liệu. Không quảng cáo tự đăng mọi nền tảng hoặc bảo đảm SEO/GEO.

## 14. Những điểm cần chốt khi bắt đầu triển khai

- Brand hiển thị chính xác là XayWebsite, AI Solutions service hay tên khác? Ưu tiên bán AI automation/integration hay web design trước?
- XayWebsite đang xuất bản resources bằng CMS hay qua mã nguồn? Có API quản trị nào được phép sử dụng?
- Pilot LinkedIn bắt đầu bằng tài khoản cá nhân hay Company Page? App developer đã có sản phẩm/quyền nào?
- Có tiếp tục cho khách thấy Facebook browser trong cùng dashboard, hay để thành module riêng trong navigation?

Giả định để tiến hành mà không bị chặn: dùng domain frontend đã cung cấp, bài tự soạn, một brand pilot, nhập URL bài gốc thủ công, DEV API trước và LinkedIn cá nhân ngay khi đủ quyền. Medium/Reddit/Indie Hackers đi theo luồng thủ công. OpenClaw và AI viết bài nằm ngoài MVP.
