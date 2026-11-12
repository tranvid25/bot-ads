# Kế hoạch refactor BotAds và hoàn thiện luồng Facebook Groups

Trạng thái: **đã triển khai refactor và luồng Facebook trong mã nguồn; chưa triển khai production hoặc nghiệm thu đăng Facebook thật**. Xem [bàn giao kỹ thuật](FACEBOOK_IMPLEMENTATION.md) và [hướng dẫn khách hàng](FACEBOOK_GUIDE.md).

## 1. Mục tiêu và phạm vi

- Đưa mỗi file source thuộc phạm vi refactor xuống **dưới 200 dòng**, tính trên code đã format bình thường; không nén JSX, bỏ chú thích hoặc tạo file re-export chỉ để đạt số dòng.
- Tái sử dụng các component, contracts, browser runner và cơ chế bảo vệ đang có. Không xây lại ứng dụng hoặc đổi framework.
- Hoàn thiện trải nghiệm Facebook Groups: kết nối máy → tạo nội dung → có danh sách nhóm → chọn nhóm được phép → duyệt/lên lịch → companion thực hiện → kiểm tra kết quả.
- Giao diện thống nhất với trình soạn đa kênh, nhưng giữ đúng phương thức thực thi riêng của Facebook Groups.
- Không gom cùng lượt này các việc billing, phân quyền nhóm người dùng hoặc SEO website khác.

## 2. Kết quả rà soát hiện tại

### Code dài cần xử lý

Số dòng đo từ source tại thời điểm lập kế hoạch, có thể thay đổi ở các commit sau:

| File | Số dòng | Vấn đề chính |
| --- | ---: | --- |
| `apps/web/src/publishing.css` | 5.775 | Nhiều nhóm giao diện và lớp override trong một file |
| `apps/web/src/style.css` | 1.501 | Trộn layout, auth, form, editor và responsive |
| `apps/api/controllers/marketing.controller.mjs` | 1.184 | Trộn dashboard, brand, channel, OAuth, post và publication |
| `apps/web/src/App.jsx` | 1.101 | Trộn khung ứng dụng, điều hướng, tải dữ liệu và nhiều trang |
| `apps/companion/main.cjs` | 596 | Trộn lifecycle Electron, kết nối, polling, job, auth và IPC |
| `apps/api/services/marketing-providers.mjs` | 565 | Nhiều nền tảng và giao thức xác thực trong một file |
| `apps/web/src/components/CampaignEditor.jsx` | 534 | Nội dung, nhóm và lịch trong một component |
| `apps/api/controllers/google-auth.controller.mjs` | 378 | Bắt đầu OAuth, callback, token verification và linking |
| `apps/web/src/marketing.css` | 327 | Styles cho nhiều vùng marketing |
| `apps/api/services/marketing-publisher.mjs` | 304 | Claim, quota, media, gửi và ghi kết quả |
| `apps/api/controllers/device.controller.mjs` | 287 | Claim/heartbeat/reserve/report chung một handler |
| `apps/web/src/components/marketing/ConnectChannelModal.jsx` | 271 | Catalog, OAuth redirect và nhiều form provider |
| `apps/companion/desktop.css` | 204 | Cần tách phần layout hoặc responsive |

Các module automation hiện có phần lớn đã nhỏ; cần tái sử dụng thay vì viết lại.

### Facebook đã có những gì?

| Khả năng | Bằng chứng trong repo | Giới hạn hiện tại |
| --- | --- | --- |
| Tìm nhóm theo từ khóa | `packages/automation/search_groups.js` | Chạy bằng trình duyệt Facebook trên máy, không phải API tìm nhóm cloud |
| Thu thập link nhóm | `packages/automation/group_tools.js` | Phụ thuộc giao diện và nội dung tài khoản đang thấy được |
| Đồng bộ nhóm đã tham gia | `packages/automation/get_groups.js` | Dữ liệu chủ yếu lưu local |
| Đánh giá chủ đề/nội quy | `select_groups.js`, `group_policy.js` | Bộ phân loại không chứng minh quản trị viên đã cho phép quảng cáo |
| Xin tham gia nhóm | `join_groups.js` | Có thể phải chờ duyệt hoặc xử lý câu hỏi thủ công |
| Chạy pipeline | `automation.js` | Hiện nối tìm nhóm và đăng bài trong cùng lượt chạy chiến dịch |
| Nhận chiến dịch từ web | `apps/companion/runner.cjs`, `packages/desktop-state.cjs` | Chuyển keywords, autoDiscover, autoJoin và groupUrls sang config local |
| Chống đăng trùng, quota, đối soát | Runner/history + reserve/report backend | Phải giữ nguyên khi refactor |

**Kết luận:** không thiếu hoàn toàn phần “cào nhóm”. Thiếu chính là thư viện nhóm trên web, đồng bộ dữ liệu nhóm có cấu trúc và một job tìm nhóm độc lập để người dùng kiểm tra trước khi đăng.

## 3. Giới hạn nền tảng cần thống nhất

Phải tách **Facebook Page** và **Facebook Group**:

- Page có luồng tích hợp API riêng nếu ứng dụng được cấp đủ quyền; đây không phải luồng companion Groups hiện tại.
- Buffer hiện hỗ trợ Groups bằng nhắc đăng, không tự xuất bản Groups qua API. Vì vậy không thể hứa “giống Buffer” đồng nghĩa với Groups chạy cloud hoàn toàn.
- BotAds hiện dùng trình duyệt trên máy cho Groups. Máy/app phải hoạt động, phiên Facebook còn hiệu lực và tài khoản có quyền phù hợp. Checkpoint, nội quy, quyền đăng và phê duyệt quản trị viên có thể làm pipeline dừng/chờ.
- Thu thập tự động phải phù hợp quyền truy cập và điều khoản Meta; không thiết kế vượt checkpoint, bỏ qua quyền riêng tư hoặc cam kết không bị hạn chế tài khoản.

Nguồn chính thức:

- [Buffer: kết nối và đăng Facebook Groups](https://support.buffer.com/articles/connecting-and-publishing-to-your-facebook-group-with-buffer-VevqG0mHZG).
- [Meta: giới thiệu Graph API v19 và thay đổi Groups API](https://developers.facebook.com/blog/post/2024/01/23/introducing-facebook-graph-and-marketing-api-v19/). Trang Meta bị giới hạn truy cập lúc kiểm tra; hướng dẫn Buffer trực tiếp xác nhận giới hạn hiện hành của sản phẩm Buffer.
- [Meta: automated data collection](https://about.fb.com/news/2021/04/how-we-combat-scraping/amp/).

## 4. Kế hoạch refactor dưới 200 dòng/file

### Nguyên tắc

1. Tách theo trách nhiệm và vòng đời, không theo mỗi 199 dòng bất kỳ.
2. Component UI chỉ render và phát sự kiện; gọi API và điều phối nằm trong hook/service phù hợp.
3. Ưu tiên component đã tồn tại; không tạo bản thứ hai chỉ vì tên hoặc style khác.
4. Không thay endpoint, payload, database, trạng thái đăng bài hoặc nội dung snapshot trong giai đoạn refactor cơ học.
5. Tránh nhiều chục props chạy qua tầng trung gian. Dùng hook tại feature boundary; chỉ dùng Context trong feature khi có nhiều nhánh thực sự cần chung state.
6. CSS chia theo feature/component, giữ thứ tự import rõ ràng, loại override trùng sau khi có ảnh đối chiếu. Không tách thành `part1.css`, `part2.css` vô nghĩa.
7. Không sửa migration đã áp dụng; tính năng mới dùng migration mới.

### Bản đồ tách đề xuất

Tên file sau là định hướng, cần điều chỉnh để không trùng các component sẵn có:

| Hiện tại | Tách trách nhiệm | Tái sử dụng |
| --- | --- | --- |
| `App.jsx` | `AppShell`, sidebar, điều hướng, trang thiết bị, trang chiến dịch, trang kết quả, trang cài đặt; hook auth/dashboard | `UserProfileMenu`, `GoogleAccount`, `LegalLinks`, `MarketingWorkspace`, `Icon`, `Empty` |
| `CampaignEditor.jsx` | Shell editor; bước nội dung; bước nhóm; bước lịch; hook form và save | `Dialog`, controls/composer phù hợp, contract `validateCampaign` |
| `ConnectChannelModal.jsx` | Catalog, trạng thái chuyển hướng, form kết nối provider | `ChannelPicker`, `ChannelAccountForm`, `MetaConnectView`, catalog hiện có nếu cùng hành vi |
| `marketing.controller.mjs` | Controllers brand/channel/post/publication; OAuth LinkedIn/Bluesky riêng; truy vấn dashboard | `body`, `identity`, vault, contracts, database helpers |
| `marketing-providers.mjs` | HTTP/DPoP dùng chung; adapter DEV, LinkedIn, Bluesky riêng | Các hàm hiện có, không viết lại token/publishing trong UI |
| `marketing-publisher.mjs` | Claim/lease; quota; media; submit; ghi kết quả | Cơ chế unknown và khóa tài khoản hiện tại |
| `device.controller.mjs` | Claim, heartbeat, reservation, report | Contracts và scope workspace hiện tại |
| `google-auth.controller.mjs` | OAuth state, token verification, identity linking, session/account routes | `jose`, cookie/session và các bài test hiện có |
| `companion/main.cjs` | Electron window/lifecycle, credential store, IPC, API client, polling/job coordinator | `runner.cjs`, desktop-state, automation modules |
| Các CSS dài | Tokens, shell, auth, composer, calendar, channels, Facebook và responsive theo vùng | Giữ các selectors cần thiết trong giai đoạn chuyển tiếp |

Đích của `App.jsx`: chỉ ghép provider/layout/page và render, dự kiến 80–150 dòng. Các file mới còn lại phải dưới 200 dòng; nếu một file vẫn dài thì xem lại trách nhiệm trước khi chia tiếp.

Thêm kiểm tra độ dài source trong CI sau khi hoàn thành từng phạm vi. Trong giai đoạn chuyển tiếp, dùng baseline rõ ràng cho file cũ chưa xử lý; file mới không được vượt giới hạn. Không tính `dist`, `node_modules`, lockfile, ảnh hoặc migration SQL vào mục tiêu source này. Nếu test fixture cần dài, tách fixture/helper theo chức năng thay vì nén test.

## 5. Luồng Facebook mục tiêu

```text
Đăng nhập BotAds
  → Facebook Groups: kiểm tra máy và phiên Facebook
  → Tạo nội dung/campaign nháp
  → Chọn nguồn nhóm: nhóm đã tham gia / tìm theo từ khóa / nhập URL
  → Job chỉ tìm và đánh giá nhóm
  → Thư viện nhóm trên web
  → Người dùng duyệt danh sách được phép dùng
  → Chọn bài + nhóm đủ điều kiện + lịch
  → Xem trước và xác nhận
  → Backend tạo job/snapshot
  → Companion kiểm tra lại quyền, quota và trạng thái nhóm
  → Gửi bài
  → Ghi trạng thái, bằng chứng và link nếu xác định được
```

Không có nhóm: hiển thị **“Chưa có nhóm đủ điều kiện”** cùng nút **“Tìm nhóm”** hoặc **“Nhập link nhóm”**. Không ghi chiến dịch thành công khi thực tế không có đích đăng.

### Trải nghiệm tạo bài dùng chung

- Dùng chung shell và phần nội dung/media/preview của composer khi tương thích.
- Đích `Facebook Groups` mở phần chọn nhóm, thiết bị và lịch Groups.
- Đích LinkedIn/DEV/Bluesky giữ adapter API tương ứng.
- Facebook campaign adapter chuyển dữ liệu về contract chiến dịch hiện tại; không đẩy Groups vào publication API dành cho các kênh khác nếu backend chưa có adapter thực thi phù hợp.
- Một lần xác nhận chỉ tạo một tập job; không tạo đồng thời marketing publication và Facebook campaign cho cùng đích rồi đăng hai lần.
- Hiển thị phương thức **“Chạy qua máy tính”**, thiết bị/phiên sẵn sàng và các nhóm đang chờ duyệt.

## 6. Thư viện nhóm và job tìm nhóm

### Tìm nhóm độc lập

Tái sử dụng `search_groups`, `get_groups`, `select_groups` nhưng thêm job **discovery-only**: tìm và đánh giá xong phải dừng, không gọi bước đăng bài.

Job tìm nhóm cần keyword, danh sách loại trừ, giới hạn số nhóm, cursor/checkpoint, thiết bị, account scope và deadline. Tái sử dụng execution guard, stop, heartbeat và lease hiện tại. Không dùng polling nhanh hoặc cơ chế vượt hạn chế Facebook.

Hiện bảng `jobs` yêu cầu campaign và campaign hợp lệ cần nội dung. Vì vậy discovery trước khi soạn bài cần mô hình job độc lập hoặc migration job tổng quát được thiết kế rõ; không tạo campaign giả để lách validation. Ưu tiên bảng discovery jobs riêng, dùng chung các helper lease/guard đã có.

### Dữ liệu nhóm đề xuất

- Nhóm chuẩn hóa: ID/URL, tên, nguồn tìm và thời điểm kiểm tra.
- Quan hệ theo workspace và tài khoản Facebook: nhóm đã tham gia của tài khoản A không được suy sang tài khoản B.
- Quan hệ campaign–group: được chọn, loại trừ, lý do, phiên bản duyệt.
- Membership: chưa rõ / chưa tham gia / đang xin / đã tham gia / bị hạn chế.
- Eligibility: chưa duyệt / đã cho phép dùng / loại trừ.
- Posting: có thể đăng / cần duyệt bài / chưa rõ / bị chặn.
- Evidence: nội quy/mô tả đã kiểm tra, lý do phân loại và thời gian; không thu thập nội dung thành viên không cần cho chức năng.
- Lần đăng gần nhất, cooldown và trạng thái cần đối soát.

Không gộp membership, quyền quảng bá và kết quả đăng thành một status duy nhất. “Đã tham gia” không đồng nghĩa “được đăng quảng cáo”. Kết quả bộ phân loại nội quy chỉ là gợi ý; trường hợp chưa rõ cần review.

### Đồng bộ lên web

- Companion gửi batch group upserts có schema/giới hạn kích thước và ID chống trùng.
- Backend xác thực device, scope workspace/account và lease job; không tin workspace ID tùy ý do client gửi.
- Có sequence/checkpoint, retry idempotent và thời điểm quan sát để bản ghi cũ không ghi đè kết quả mới.
- Cookies, mật khẩu, session Facebook và dữ liệu browser vẫn ở kho mã hóa local; không đưa vào bảng nhóm hay log web.
- Web có phân trang, lọc theo nguồn, keyword, membership, eligibility, và lý do bị loại.

## 7. Đăng tự động sau khi đã có nhóm

1. Chỉ lập hàng chờ với nhóm đã được chọn, còn hiệu lực review, tài khoản có quyền và cooldown đã qua.
2. Ghi snapshot nội dung, tập nhóm được duyệt, phiên bản campaign và lịch. Thay đổi nháp không tự sửa job đang chờ.
3. Companion kiểm tra lại điều kiện ngay trước gửi; nhóm mất quyền hoặc yêu cầu tham gia phải chuyển sang chờ/bỏ qua với lý do.
4. Tự xin tham gia là tùy chọn riêng, có giới hạn và cần người dùng bật; không tự trả lời sai câu hỏi hay vượt bước duyệt.
5. Giữ reservation trước submit, giới hạn workspace/campaign, một worker cho một tài khoản và đối soát sau gián đoạn.
6. Phân biệt đã xuất bản, chờ quản trị viên duyệt, lỗi đã rõ, chưa xác định, bỏ qua và hủy. Không coi bấm nút gửi là bằng chứng đã xuất bản.
7. Chưa rõ kết quả: dừng retry tự động của lượt đó; kiểm tra bài/link hoặc yêu cầu người dùng đối soát trước khi gửi lại.
8. Máy offline: hiển thị đang chờ máy, cửa sổ chạy muộn và hạn chót; quá hạn thì đánh dấu lỡ lịch. Không đăng bù hàng loạt khi máy mở lại.
9. Không có nhóm đủ điều kiện: kết thúc bằng kết quả không có đích đăng và số lượng/lý do cụ thể.

## 8. Các màn hình cần có

| Màn hình | Việc người dùng làm được |
| --- | --- |
| Facebook Overview | Thấy thiết bị, phiên, tổng nhóm, nhóm đủ điều kiện và lượt cần xử lý |
| Devices | Tạo mã, liên kết/thu hồi, xem online và trạng thái Facebook |
| Group Library | Import URL, tìm nhóm, theo dõi discovery, duyệt/loại nhóm và xem lý do |
| Composer/Campaign | Soạn bài, chọn danh sách nhóm, đặt lịch và xem phạm vi gửi |
| Queue & Results | Thấy từng nhóm đích, kết quả, link, lý do chờ và thao tác đối soát |

Đây là trải nghiệm theo nhóm tác vụ của công cụ marketing; không sao chép các nút tính năng chưa có backend hoặc hứa tự động hóa tương đương những dịch vụ chưa được kiểm chứng.

## 9. Thứ tự triển khai và điều kiện hoàn thành

| Giai đoạn | Phạm vi | Điều kiện nghiệm thu |
| --- | --- | --- |
| 0 | Chốt baseline và scope | Lưu ảnh/luồng hiện tại, liệt kê component dùng lại, ghi nhận test đang đạt/hỏng trước khi sửa |
| 1 | Refactor frontend | App/editor/styles trong scope dưới 200 dòng/file; điều hướng, nội dung, connect, tạo mã, lưu và lịch hoạt động như trước |
| 2 | Refactor API/companion | Tách controllers/providers/lifecycle; OAuth, tenant isolation, job lease, quota và unknown không đổi hành vi |
| 3 | Group Library + discovery-only | Từ 0 nhóm tìm được danh sách có lý do; job tìm không bao giờ gửi bài; đồng bộ và phân tách tài khoản đúng |
| 4 | Duyệt nhóm + composer dùng lại | Chọn nhóm và nội dung, snapshot, schedule, điều kiện thiết bị và chống tạo job trùng |
| 5 | Chạy tự động và pilot | Chạy thử trên nhóm được phép, kiểm tra pending/unknown/offline/cancel; kết quả có bằng chứng phù hợp |

Không triển khai tính năng mới lẫn refactor controller lớn trong cùng một thay đổi không thể review. Mỗi giai đoạn cần diff nhỏ, kiểm thử và tài liệu cập nhật. Thời gian chỉ ước lượng sau khi chốt discovery scope và có môi trường pilot; không cam kết số ngày khi chưa có các điều kiện đó.

## 10. Kiểm thử và bàn giao

- Kiểm tra source length sau formatter, import cycles, selectors/CSS và ảnh desktop/mobile.
- Giữ các test đăng nhập Google, LinkedIn/Bluesky OAuth, workspace isolation và API publishing hiện có.
- Test campaign → desktop-state → runner: keywords và nhóm phải giữ đúng scope.
- Test discovery-only, dừng giữa chừng, resume, mất lease, duplicate report, đổi tài khoản và 0 kết quả.
- Test nhóm chưa tham gia, nội quy chưa rõ, chờ duyệt, cooldown, hết quota và không có nhóm đủ điều kiện.
- Test crash trước/sau submit, unknown, hủy khi đang chạy và không gửi lại bài đã nhận.
- Browser test từ sidebar/Settings/New đến chọn nhóm, lưu lịch và xem kết quả; không chỉ kiểm thử từng component rời.
- Pilot thực tế chỉ trên tài khoản/nhóm được phép; không dùng số lượng đăng hoặc tốc độ làm bằng chứng duy nhất về độ ổn định.

Hoàn thành phải bàn giao: module map, số dòng, ảnh UI, schema/API mới, trạng thái được hỗ trợ, kết quả test và những phần còn cần cấu hình/quyền nền tảng. Đăng bài thành công không tự chứng minh hiệu quả SEO/GEO.

**Đã triển khai các phần chính của giai đoạn 1–4 và kiểm thử local.** Giai đoạn 5 còn cần phát hành bộ cài mới, deploy migration/API/web và chạy pilot trên tài khoản, nhóm được phép. Chưa có bằng chứng đăng thật cho luồng mới; không coi kiểm thử fixture là nghiệm thu production. Các mở rộng chưa làm: tìm chỉ trong nhóm đã tham gia bằng lựa chọn riêng, tiếp tục tìm từ cursor sau crash và phân trang server cho thư viện trên 500 nhóm.
