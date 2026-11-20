# Plan tách đăng chiến dịch khỏi tìm/tham gia nhóm

Trạng thái bàn giao: 20/11/2026, theo giờ Việt Nam. Người dùng yêu cầu dừng sửa code để giao AI khác tiếp tục. Có thay đổi runtime làm dở trong working tree; CHƯA kiểm thử hoặc build bản mới cho các thay đổi này. Không coi đây là bản sẵn sàng production.

## Giao việc cho AI tiếp theo

Đọc tài liệu này, `git status` và `git diff` trước khi làm. Hoàn thiện luồng đơn giản dưới đây, dùng lại component và cơ chế có sẵn. Không tự thiết kế thêm pipeline marketing tổng hợp, không gộp tìm nhóm vào đăng bài. Không xóa bản nháp, nhóm, lịch sử hoặc bằng chứng gửi để làm sạch trạng thái. Không tự commit/push/deploy khi người dùng chưa giao thao tác đó.

### Luồng chính xác người dùng đã chốt

**Luồng A — Tìm nhóm riêng**

1. Web → Facebook Groups/Tìm nhóm.
2. Nhập từ khóa, số lượng → bấm chạy lượt tìm.
3. Desktop đang kết nối mở Chrome/Edge bằng phiên Facebook đã lưu, tìm nhóm và lưu vào thư viện.
4. Hiện tiến độ, số kết quả và lỗi; khách có thể chọn tất cả, kiểm tra/duyệt nhóm để dùng.
5. Nếu cần xin tham gia nhóm, dùng thao tác riêng tại thư viện. Không đăng bài trong lượt tìm hoặc lượt tham gia.

**Luồng B — Tạo chiến dịch và đăng riêng**

1. Tạo chiến dịch, soạn bài.
2. Chọn nhóm đã tìm trong thư viện.
3. Thiếu nhóm thì bấm nút đi tìm thêm; giữ nguyên bản đang soạn. Tìm xong quay lại tải/chọn các nhóm vừa tìm, không phải nhập lại nội dung.
4. Chọn đăng ngay hoặc giờ chạy, lưu và chạy chiến dịch.
5. Desktop mở đúng các nhóm đã chọn để đăng; lấy trạng thái và link từng bài.
6. Không tìm thêm, không tự tham gia, không dùng nhóm ngoài danh sách khi đang chạy chiến dịch. Nhóm không đăng được thì ghi lý do theo chính sách hiện có.

Không bắt khách tắt/ghép lại app giữa hai luồng. Không tự thêm nhóm mới vào chiến dịch đã lưu. Nhóm cho tạo bài khi chưa tham gia không bị chặn chỉ vì chưa là thành viên.

### Giữ UX đơn giản

- Tái sử dụng `ApprovedGroupSelector`, `DiscoveryForm`, `GroupLibrary`, `CampaignEditor` và `RunFacebookButton`.
- Selector hiện đã có nút mở thư viện ở tab riêng và nút tải lại danh sách, giúp giữ form gốc. Có thể cải thiện cách đặt nút/nhãn và tải lại khi quay về; không bắt buộc xây cơ chế modal ẩn/draft persistence mới.
- Nếu dùng cùng tab, phải chứng minh giữ được tên, bài, ảnh, lựa chọn và lịch đang soạn khi đi tìm nhóm rồi quay lại.
- Đặt tên theo tác vụ, ví dụ “Chạy tìm nhóm” và “Chạy chiến dịch”, để khách biết Chrome đang làm việc gì.

## Yêu cầu

- Bấm Chạy chiến dịch: chỉ đăng nội dung đã chọn vào danh sách nhóm đã lưu và duyệt.
- Bấm Tìm nhóm: chỉ tìm/đọc và lưu nhóm vào thư viện.
- Bấm Xin tham gia: chỉ xử lý các nhóm khách chọn và xác nhận.
- Không có nhóm đích thì báo thiếu nhóm; không chuyển sang tìm nhóm.
- Giữ kết nối một lần; không yêu cầu khách ngắt/ghép lại máy.

## Những điểm đã xác nhận trước khi sửa dở

1. `apps/companion/runtime/jobs.cjs` gọi `ctx.discovery.tick()` trước `/claim` chiến dịch. Lượt tìm hoặc membership đã chờ được lấy trước lượt đăng. Nếu discovery đang chạy, scheduler tiếp tục phục vụ nó và chưa nhận chiến dịch.
2. `apps/companion/runner_campaign.cjs` vẫn gọi `automation.main()`, là pipeline chung gồm search, sync, selection, join rồi posting. Đây chưa phải executor chỉ đăng độc lập.
3. `packages/desktop-state.cjs` chỉ ép search/sync/join thành false với `workflowVersion === 2`; chiến dịch cũ vẫn kế thừa autoDiscover/autoJoin và dữ liệu discovery cũ.
4. `packages/contracts/campaign.mjs` mặc định thiếu workflowVersion thành 1; autoDiscover/autoJoin mặc định true nếu không truyền false.
5. `apps/api/services/facebook-campaign.mjs` bỏ qua kiểm tra nhóm đã duyệt đối với workflow khác 2. Jobs lấy snapshot dữ liệu chiến dịch nên dữ liệu cũ có thể đi tới desktop.
6. Form mới đặt workflowVersion 2 và tắt autoDiscover/autoJoin; nút Chạy chỉ gọi endpoint run, không gọi discover. Vì vậy không thể kết luận mọi lần bấm Chạy trực tiếp tạo một lượt tìm. Hai nhánh phía trên cần sửa; muốn quy chính xác lần chạy trên production cần đối chiếu jobId/taskId và phiên bản app.

## 1. Khóa ranh giới thực thi chiến dịch

- Tạo entry thực thi publish riêng, không gọi pipeline CLI `automation.main()`.
- Chỉ nhận snapshot nhóm đích của campaign từ API và danh sách bài đã chọn.
- Không gọi search_groups, get_groups, select_groups hay join_groups trong executor đăng chiến dịch.
- Giữ kiểm tra tài khoản, lease/hủy, hạn mức, cooldown, đối soát lần gửi chưa rõ, chống trùng, ảnh, bình luận và ghi bằng chứng/link bài.
- Kiểm tra quyền tạo bài trên đúng nhóm đích vẫn cần giữ. Đây không phải tìm nhóm mới.
- Không lấy nhóm từ cache discovery hoặc tự thêm nhóm khác khi nhóm đích không đăng được.
- Giữ pipeline CLI riêng cho chức năng CLI được chủ động gọi, không dùng làm executor của web.

## 2. Chặn cấu hình cũ ở API và desktop

- Save/enqueue/prepare đều chuẩn hóa chiến dịch web thành publish-only; không dựa riêng cờ của form.
- Nhóm đích phải được xác thực đúng workspace, tài khoản, trạng thái duyệt và snapshot.
- Rà chiến dịch cũ: ánh xạ URL sang nhóm đã duyệt phù hợp nếu đã có; không tự duyệt nhóm chưa kiểm tra.
- Chiến dịch cũ thiếu nhóm hợp lệ hiện thông báo chọn/duyệt nhóm, giữ nội dung và lịch để khách chỉnh sửa.
- Rà lượt queued với snapshot cũ: chuẩn hóa khi hợp lệ; chặn và ghi lý do nếu thiếu nhóm. Không âm thầm chạy lại pipeline tìm nhóm.
- Giữ lịch sử, permalink và các lần gửi unknown/submitting; không xóa hoặc tự gửi lại để chuyển đổi.
- Có kiểm tra capability/protocol để app cũ không nhận tác vụ theo cách có thể bật lại pipeline tìm nhóm.

## 3. Điều phối các hàng chờ theo đúng ý định

- Khi thiết bị rảnh và lượt đăng đã đến hạn: ưu tiên nhận publish trước discovery/membership đang queued.
- Việc nhận job phải được bảo vệ tại API bằng điều kiện nguyên tử, kể cả nhiều thiết bị cùng claim; chỉ đổi thứ tự gọi ở client là chưa đủ.
- Không tự giết lượt đang chạy hoặc đổi công việc giữa lúc đã gửi thao tác sang Facebook.
- Nếu đang tìm/tham gia nhóm, web báo rõ chiến dịch đang chờ tác vụ nào; khách dùng thao tác hủy lượt nhóm hiện có khi muốn dừng.
- Discovery/membership chỉ xuất phát từ thao tác riêng của khách. Bấm Chạy, nối lại Facebook hoặc bật nhận việc không tạo thêm lượt tìm mới.
- Lượt tìm cũ còn queued/running vẫn là tác vụ độc lập, phải hiển thị được, không gộp tên vào nhật ký chiến dịch.

## 4. Làm rõ trạng thái trên web và desktop

- Nhật ký ghi loại tác vụ và mã tương quan: campaign/jobId hoặc discovery/membership taskId.
- Trước khi đăng hiện tên chiến dịch, số nhóm đích và số bài được chọn.
- Phân biệt: chờ máy, chờ lượt tìm/tham gia đang chạy, đang đăng, không có nhóm đủ điều kiện, cần đối soát.
- Lỗi nhóm nào hiển thị đúng nhóm đó và tiếp tục theo chính sách hiện có; không tự tìm nhóm thay thế.
- Nhóm mới chỉ được lưu trong thư viện. Khách chọn/duyệt rồi thêm vào chiến dịch; lượt đã xếp hàng giữ snapshot của nó.

## 5. Kiểm thử bắt buộc

1. Campaign mới: Chạy chỉ mở nhóm đã chọn, nhập đúng nội dung, gửi và lấy bằng chứng; không gọi bất kỳ module tìm/sync/join nào.
2. Campaign cũ có autoDiscover/autoJoin true vẫn không được tìm hay tham gia khi chạy từ web.
3. Thiếu nhóm, hết hạn duyệt hoặc sai tài khoản: báo đúng lý do và không fallback tìm nhóm.
4. Có cả lượt đăng và tìm đang queued: publish được nhận trước khi thiết bị rảnh.
5. Discovery đang chạy: campaign hiển thị chờ đúng task; không claim chồng, không làm mất kết quả khi hủy.
6. Nhiều thiết bị claim đồng thời: không chạy trùng và không chạy hai loại tác vụ cùng lúc trong workspace.
7. Nối lại/khởi động lại app: đồng bộ kết quả trước, không nhân bản publish hoặc tự tạo discovery.
8. Lượt tìm riêng vẫn thu thập nhóm; lượt tham gia riêng vẫn giữ trạng thái joined/requested/manual_required.
9. Đối soát, hạn mức, ảnh, bình luận, lịch đăng và hủy/xóa chiến dịch giữ đúng hành vi.
10. Smoke UI và bản đóng gói thực tế, sau đó nghiệm thu một nhóm thật được phép đăng; không dùng kết quả fixture để khẳng định đã đăng Facebook thật.

## Thứ tự triển khai

1. Test tái hiện scheduler ưu tiên discovery và nhánh legacy pipeline.
2. Executor publish-only và guard API cho dữ liệu mới/cũ.
3. Claim/scheduler, trạng thái chờ và nhật ký tương quan.
4. Chuyển đổi dữ liệu có kiểm tra, chạy regression và đóng gói desktop mới nếu thay runtime.
5. Deploy API/web tương thích, cập nhật desktop, nghiệm thu tìm riêng và đăng riêng trên cùng thiết bị.

## Tiêu chí chốt

Bấm Chạy chiến dịch chỉ đăng vào nhóm đã chọn hoặc báo rõ lý do chưa đăng. Mọi thao tác tìm hoặc xin tham gia đều có tác vụ riêng do khách khởi tạo. Chưa được coi là đạt chỉ vì form mới có autoDiscover=false.

## Working tree đang làm dở — phải đọc trước khi tiếp tục

Các thay đổi sau đã được ghi vào file nhưng CHƯA chạy test cho đợt sửa này:

| File | Thay đổi đã làm | Việc còn phải kiểm tra |
| --- | --- | --- |
| `packages/desktop-state.cjs` | Bỏ cache discoveredGroups khỏi config chiến dịch; luôn tắt search/sync/join, kể cả legacy | Legacy có URL đích vẫn chạy đúng; không vô tình lấy nhóm từ cache |
| `packages/automation/publish_only.cjs` (file mới) | Guard thiếu nhóm/cờ tìm, gọi trực tiếp `post_runner.runPosting({config})` | Chưa có test; rà lại đối soát và deadline trước đây do `automation.main()` thực hiện |
| `apps/companion/runner_campaign.cjs` | Guard thiếu nhóm; gọi publish_only thay automation | Kiểm tra legacy, account binding, reservation, ảnh, bình luận, kết quả |
| `apps/companion/runtime/jobs.cjs` | Claim chiến dịch trước; chỉ gọi discovery khi không có job và không bị blocked | Tác vụ đang chạy không bị đổi giữa chừng; tái kết nối không tạo lượt tìm |
| `apps/api/controllers/facebook-device.controller.mjs` | SQL discovery claim không nhận lượt tìm khi còn publish queued hợp lệ; thêm bind thời gian 2 giờ | Chưa test SQL, số bind, race claim nhiều máy, stale/canceled queue và nguy cơ starvation |
| `apps/api/services/facebook-campaign.mjs` | Legacy tắt autoDiscover/autoJoin; thiếu URL đích thì chặn khi requireTargets | Legacy vẫn giữ workflow 1 và chưa bắt buộc nhóm thư viện/duyệt; cần quyết định chuyển đổi an toàn |
| `scripts/verify-package.cjs` | Bắt buộc ASAR có publish_only.cjs | Bản build 1.1.14 cũ chưa chứa file mới này, chưa được build lại |

`git diff` hiện tương ứng 6 file tracked và 1 module mới; tài liệu này cũng là file mới chưa commit. Không tự rollback toàn bộ working tree. Nếu giữ hoặc thay cách sửa, phải rà từng diff để tránh mất thay đổi của người dùng.

### Các phần CHƯA làm

- Chưa thay UI, chưa hoàn thiện nút đi tìm nhóm/giữ nháp/quay lại.
- Chưa thêm metadata discovery đang chạy vào dashboard/job-wait để giải thích chính xác lý do chờ.
- Chưa chặn đầy đủ app desktop cũ: app 1.1.14 có thể dùng pipeline cũ với chiến dịch legacy, kể cả backend đã tắt search/join, vì sync của legacy còn bật. Phải xử lý tương thích/capability hoặc chặn rõ và yêu cầu cập nhật, không chỉ sửa client mới.
- Chưa chuyển đổi campaign cũ và job snapshot cũ; không tự duyệt URL legacy chưa được kiểm tra.
- Chưa rà việc bỏ gọi `reconcile_posts` vốn có trong pipeline tổng. Chống trùng/đối soát phải được giữ, không tự gửi lại lần chưa xác định.
- Chưa viết/chạy test mới, chưa chạy regression, chưa bump version, chưa build/cài/nghiệm thu/deploy cho đợt này.

## Thông tin môi trường và lỗi liên quan

- Repo: `D:\botAds`; PowerShell; web React/Vite trên Pages, backend Worker riêng, desktop Electron. Nguồn trong `apps`/`packages` cần dưới 200 dòng/file; dùng `npm run check:source`.
- `package.json` hiện 1.1.14. Bản cài local `release/lite/BotAds-Setup-1.1.14-Lite.exe` có từ trước các diff làm dở, không dùng nó để xác nhận sửa tách luồng.
- Khi đổi version dùng `npm version <version> --no-git-tag-version`; sửa DOWNLOAD_URL đúng vị trí nếu cần. Không replace toàn bộ chuỗi version trong lockfile. Lỗi trước đã làm hỏng `@peculiar/json-schema`; đã sửa về 1.1.12 và kiểm tra npm ci sạch qua.
- Các kết quả 187 SaaS/45 automation trước đó thuộc baseline, KHÔNG chứng minh các diff làm dở hiện tại đã đúng.
- Kiểm tra API/browser fixture không được tạo lượt tham gia/đăng bài thật để nghiệm thu thay khách. Dùng tài khoản/nhóm thật chỉ khi được phép và ghi rõ kết quả thực tế.
- Trước khi chuyển sang vấn đề này, người dùng báo CSS nhận MIME text/html. Đã đọc production: tại thời điểm kiểm tra, cả custom domain và Pages trả URL CSS `index-BmTB2HGw.css` với 200 text/css. Chưa chứng minh nguyên nhân lịch sử; chưa sửa CSS, cache hoặc CI health-check assets. Nếu xử lý tiếp, kiểm tra asset thực tế và cache; không đổi header thành text/css cho một body HTML để che lỗi.
- Không đọc/in/commit `.dev.vars`, cookie, token hoặc dữ liệu riêng trong `.worker-build/private`/`user_data` khi rà lỗi. Không cần thêm secrets cho việc tách hai luồng.

## Nội dung AI tiếp theo cần báo sau khi hoàn thành

1. Hai luồng cuối cùng và các nút khách dùng, minh họa tạo chiến dịch thiếu nhóm → tìm → quay lại chọn → đăng.
2. Legacy/job cũ/app cũ được xử lý ra sao, có cần migration và cập nhật desktop không.
3. Kết quả test và bản build thực tế; phân biệt rõ đã build local với đã deploy/phát hành.
4. Những điểm chưa nghiệm thu Facebook thật. Không khẳng định “chuẩn hết” chỉ dựa vào test giả lập hoặc việc tắt cờ ở form.
