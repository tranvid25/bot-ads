export { legalPagesPlugin } from "./plugin.mjs";

import { LEGAL_PATHS, updated, operator, sections } from "./info.mjs";
export { LEGAL_PATHS } from "./info.mjs";

const privacy = sections([
  [
    "1. Bên vận hành / Operator",
    `BotAds tại <a href='https://bot.salesora.space'>bot.salesora.space</a> được vận hành bởi ${operator}. Chính sách này mô tả dữ liệu được xử lý khi bạn sử dụng công cụ quản lý và phân phối nội dung BotAds. Bạn có thể liên hệ về quyền riêng tư qua <a href='/support?topic=privacy'>biểu mẫu hỗ trợ</a>.`,
    `BotAds at bot.salesora.space is operated by ${operator}. This policy explains how information is handled when you use BotAds to manage and distribute content. Contact the operator using the <a href='/support?topic=privacy'>privacy request form</a>.`,
  ],
  [
    "2. Dữ liệu tài khoản và nội dung / Account and content data",
    "Chúng tôi lưu tên, email và mật khẩu đã băm của tài khoản BotAds; thông tin thương hiệu/website; bài viết, phiên bản đã duyệt, ảnh, lịch và giới hạn do bạn cung cấp. Hệ thống lưu định danh bài, liên kết bài, trạng thái gửi, lỗi và nhật ký phục vụ vận hành. Số lượt truy cập/lead nhập tay là dữ liệu do bạn cung cấp, không phải thống kê nền tảng tự xác nhận.",
    "We store your BotAds name, email and hashed password; your brand and website details; and the posts, approved versions, images, schedules and limits you supply. We retain post identifiers, links, delivery states, errors and operational records. Manually entered visits and leads are supplied by you and are not represented as platform-verified analytics.",
  ],
  [
    "Đăng nhập Google / Google sign-in",
    "Nếu bạn chọn đăng nhập Google, BotAds yêu cầu quyền openid, email và profile để xác minh danh tính. Chúng tôi lưu định danh Google và email đã xác minh để liên kết với tài khoản BotAds; không lưu mật khẩu Google hoặc access/refresh token Google cho đăng nhập. Bạn có thể ngắt liên kết trong Cài đặt nếu tài khoản đã có phương thức đăng nhập bằng mật khẩu. Tài khoản chỉ dùng Google cần giữ phương thức đăng nhập này hoặc gửi yêu cầu xóa dữ liệu.",
    "If you choose Google sign-in, BotAds requests openid, email and profile to verify your identity. We store your Google identifier and verified email to associate your BotAds account. We do not store your Google password or retain Google access/refresh tokens for sign-in. You may unlink Google in Settings when password sign-in is available. Google-only accounts must retain this sign-in method or request account deletion.",
  ],
  [
    "3. Tài khoản kênh được kết nối / Connected accounts",
    "Khi bạn kết nối LinkedIn, chúng tôi nhận định danh và tên tài khoản từ API, quyền đã cấp, thời hạn và access token để gửi bài theo ủy quyền. Với DEV, chúng tôi nhận API key do bạn nhập và xác định tài khoản qua API. Token/API key được mã hóa trên backend và không trả lại qua dashboard. BotAds không yêu cầu mật khẩu LinkedIn hoặc DEV. Việc ghi tên tài khoản Medium, Reddit hoặc Indie Hackers trong luồng thủ công không cấp quyền truy cập vào tài khoản đó.",
    "When you connect LinkedIn, we receive an account identifier and name, granted permissions, token expiry and an access token for authorized publishing. For DEV, we validate the API key you supply and identify the account through its API. Credentials are encrypted on the backend and are not returned through the dashboard. BotAds does not request your LinkedIn or DEV password. Naming a manual Medium, Reddit or Indie Hackers account does not grant access to that account.",
  ],
  [
    "4. Mục đích xử lý / Purposes",
    "Dữ liệu được dùng để xác thực, quản lý nội dung, thực hiện lịch đã duyệt, kiểm tra quyền, hạn chế đăng trùng, ghi kết quả và hỗ trợ người dùng. Thông tin kết nối không được dùng để thực hiện hành động ngoài chức năng bạn cho phép. Bài marketing tự soạn không được tự gửi cho AI để viết lại. Nếu bạn chủ động dùng tính năng Gemini tùy chọn, prompt và ngữ cảnh bạn cung cấp sẽ được gửi tới Google để tạo nội dung.",
    "We use this information for authentication, content management, approved publishing, permission checks, duplicate prevention, delivery records and support. Connected credentials are not used for actions outside the functionality you authorize. Manual marketing content is not automatically sent to AI for rewriting. If you choose an optional Gemini feature, your prompt and supplied context are sent to Google for content generation.",
  ],
  [
    "5. Nhà cung cấp và chia sẻ / Providers and disclosure",
    "Cloudflare cung cấp hạ tầng lưu trữ, cơ sở dữ liệu và xử lý của BotAds. Nội dung/ảnh và thông tin xác thực cần thiết được gửi đến nền tảng bạn chọn khi thực hiện kết nối hoặc xuất bản. Google chỉ tham gia khi dùng tính năng Gemini tùy chọn. Chúng tôi không bán token hoặc dữ liệu tài khoản kênh. Việc xử lý trên LinkedIn, DEV và các nhà cung cấp chịu thêm chính sách riêng của họ; hạ tầng của nhà cung cấp có thể xử lý dữ liệu ở quốc gia khác với nơi bạn ở.",
    "Cloudflare supplies BotAds hosting, database, storage and processing infrastructure. Content, images and necessary authorization information are sent to the selected platform when connecting or publishing. Google is involved when optional Gemini features are used. We do not sell connected-account credentials or account data. LinkedIn, DEV and infrastructure providers also apply their own policies, and their infrastructure may process information outside your country.",
  ],
  [
    "6. Cookie và nhật ký / Cookies and logs",
    "BotAds sử dụng cookie HttpOnly cho phiên đăng nhập, mặc định có thời hạn tối đa 7 ngày; cookie OAuth ngắn hạn tối đa 10 phút để bảo vệ kết nối LinkedIn. Địa chỉ IP và thông tin lỗi có thể được xử lý để giới hạn yêu cầu, bảo mật và chẩn đoán. Nhà cung cấp hạ tầng có thể sử dụng cơ chế bảo mật riêng. Khi bật trên hạ tầng, Cloudflare Web Analytics có thể thu thập số liệu truy cập và hiệu năng website. Bản hiện tại không tích hợp cookie quảng cáo hoặc Google Analytics trong dashboard.",
    "BotAds uses an HttpOnly login session cookie, normally lasting up to seven days, and a short-lived OAuth cookie lasting up to ten minutes to protect LinkedIn connections. IP addresses and error information may be processed for request limits, security and diagnostics. Infrastructure providers may apply their own security mechanisms. When enabled in the infrastructure, Cloudflare Web Analytics may collect website traffic and performance measurements. The current dashboard does not integrate advertising cookies or Google Analytics.",
  ],
  [
    "7. Ảnh và nội dung đã công khai / Public content",
    "Ảnh nguồn được lưu theo không gian của bạn. Khi bạn đồng ý chia sẻ ảnh trong bài API, một bản ảnh được tạo tại URL công khai để nền tảng có thể đọc. Nội dung đã đăng, ảnh công khai và các bản sao do nền tảng hoặc người khác lưu không tự biến mất khi ngắt kết nối. Hãy nêu rõ phạm vi ảnh/bài trong yêu cầu xóa; bài trên nền tảng có thể cần được bạn xóa trực tiếp tại đó.",
    "Original assets are stored within your workspace. When you approve an image for API publishing, a public copy is created so the platform can retrieve it. Published posts, public images and copies retained by platforms or others do not automatically disappear when a connection is removed. Specify affected posts and images in deletion requests; removing posts on the destination platform may require action in that platform.",
  ],
  [
    "8. Thời gian lưu / Retention",
    "Nội dung, cấu hình và lịch sử được giữ để cung cấp dịch vụ, theo dõi kết quả và tránh đăng trùng trong thời gian sử dụng. Khi bạn ngắt kết nối, credential được xóa khỏi bản ghi kết nối và các lượt chưa gửi được hủy; thông tin lịch sử hoặc tên/định danh kênh có thể còn lại đến khi được xử lý theo yêu cầu xóa phù hợp. Yêu cầu hỗ trợ đang mở được giữ để giải quyết; yêu cầu đã đóng được xóa khỏi hệ thống tiếp nhận sau tối đa 180 ngày. Việc xử lý bản sao lưu hoặc dữ liệu phải lưu theo nghĩa vụ áp dụng sẽ được xem xét riêng khi thực hiện yêu cầu.",
    "Content, settings and history are retained to deliver the service, track outcomes and prevent duplicates during use. Disconnecting deletes credentials from the connection record and cancels unsent work; historical records and channel identifiers may remain pending an applicable deletion request. Open support requests are retained for resolution, and closed requests are removed from the intake system after up to 180 days. Backups and information subject to applicable retention obligations are considered separately when a request is processed.",
  ],
  [
    "9. Quyền lựa chọn và yêu cầu / Choices and requests",
    "Bạn có thể sửa nội dung, hủy lượt chưa gửi, ngắt kết nối và thu hồi quyền tại nhà cung cấp. Bạn có thể yêu cầu truy cập, sửa, cung cấp bản sao hoặc xóa dữ liệu bằng <a href='/support?topic=privacy'>biểu mẫu quyền riêng tư</a>. Hướng dẫn riêng có tại <a href='/data-deletion'>Yêu cầu xóa dữ liệu</a>. Chúng tôi xác minh quyền kiểm soát tài khoản và phạm vi trước khi thay đổi hoặc xóa dữ liệu; một yêu cầu từ email chưa xác minh không tự làm mất dữ liệu của khách hàng.",
    "You can edit content, cancel unsent publications, disconnect accounts and revoke permissions at the provider. Request access, correction, a copy or deletion through the <a href='/support?topic=privacy'>privacy form</a>; see the <a href='/data-deletion'>deletion instructions</a>. We verify account control and scope before changing or erasing information. An unverified email request does not automatically erase customer data.",
  ],
  [
    "10. Bảo vệ thông tin / Safeguards",
    "Mật khẩu BotAds được băm và credential kết nối được mã hóa trên backend. Quyền truy cập dữ liệu được phân theo không gian tài khoản. Bạn cần bảo vệ email, phiên đăng nhập, API key và thiết bị của mình; không gửi password, token hoặc dữ liệu nhạy cảm không cần thiết vào biểu mẫu hỗ trợ. Không có hệ thống nào loại bỏ được toàn bộ rủi ro bảo mật.",
    "BotAds passwords are hashed, connected credentials are encrypted on the backend and access is scoped to the account workspace. Protect your email, sessions, API keys and devices. Do not include passwords, tokens or unnecessary sensitive data in support forms. No system eliminates every security risk.",
  ],
  [
    "11. Luồng Facebook trên máy / Local Facebook workflow",
    "Nếu dùng ứng dụng Windows cho Facebook, phiên trình duyệt được lưu trên máy khách; backend nhận trạng thái thiết bị, công việc và kết quả cần thiết. Xóa dữ liệu trên cloud không tự xóa hồ sơ trình duyệt trên thiết bị. Bạn cần xóa liên kết/phiên cục bộ trong ứng dụng hoặc yêu cầu hỗ trợ riêng cho thiết bị.",
    "If you use the Windows Facebook companion, browser sessions are stored on the customer device; the backend receives necessary device, job and outcome information. Cloud deletion does not automatically erase local browser profiles. Remove the local connection/session in the application or request device-specific assistance.",
  ],
  [
    "12. Cập nhật và liên hệ / Updates and contact",
    `Ngày cập nhật: ${updated}. Thay đổi về xử lý dữ liệu sẽ được ghi nhận trên trang này. Bên vận hành: ${operator}. Dùng <a href='/support'>trang liên hệ hỗ trợ</a> để gửi câu hỏi hoặc yêu cầu và giữ lại mã tiếp nhận.`,
    `Last updated: 10 November 2026. Changes to data handling will be reflected on this page. Operator: ${operator}. Use the <a href='/support'>support page</a> to send a question or request and keep the receipt reference.`,
  ],
]);

const terms = sections([
  [
    "1. Phạm vi / Scope",
    `BotAds là công cụ do ${operator} vận hành để quản lý nội dung, kết nối kênh và phân phối bài theo thao tác hoặc lịch đã duyệt. Khi tạo tài khoản hoặc sử dụng dịch vụ, bạn đồng ý với các điều khoản này và đã có cơ hội đọc <a href='/privacy'>Chính sách quyền riêng tư</a>.`,
    `BotAds is operated by ${operator} to manage content, connect channels and distribute posts through approved actions or schedules. By registering or using the service, you agree to these terms and have the opportunity to read the <a href='/privacy'>Privacy Policy</a>.`,
  ],
  [
    "2. Tài khoản và ủy quyền / Accounts and authorization",
    "Bạn chịu trách nhiệm về thông tin tài khoản, phiên đăng nhập và quyền hợp lệ để sử dụng tài khoản kênh/ảnh/nội dung đã cung cấp. LinkedIn được kết nối qua OAuth; DEV dùng API key. Bạn có thể ngắt kết nối. Không cung cấp mật khẩu của nền tảng cho BotAds hoặc dùng tài khoản của người khác khi chưa được phép.",
    "You are responsible for your account details, sessions and valid authority to use connected accounts, images and content. LinkedIn connections use OAuth; DEV uses API keys. You can disconnect accounts. Do not provide platform passwords to BotAds or use another person's account without permission.",
  ],
  [
    "3. Nội dung và sử dụng phù hợp / Content and acceptable use",
    "Bạn giữ quyền đối với nội dung của mình và cho phép BotAds xử lý, lưu, truyền nội dung/ảnh trong phạm vi cần thiết để thực hiện dịch vụ bạn yêu cầu. Không sử dụng để mạo danh, lừa đảo, xâm phạm quyền riêng tư hoặc bản quyền, vượt hạn chế của nền tảng hay gửi nội dung hàng loạt trái quy định. Bạn cần tuân thủ nội quy cộng đồng, điều kiện API và quyền của người liên quan.",
    "You retain rights to your content and authorize the processing, storage and transmission needed to perform the service you request. Do not use BotAds for impersonation, fraud, privacy or copyright violations, evading platform restrictions or prohibited bulk posting. Follow community rules, API conditions and the rights of affected people.",
  ],
  [
    "4. Duyệt, lịch và kết quả / Approval, schedules and outcomes",
    "Mỗi lượt đăng dùng phiên bản đã duyệt tại thời điểm lên lịch. Sửa bài không tự thay nội dung của lượt cũ. Lịch phụ thuộc hàng đợi, hạn mức, quyền/token, kết nối và nền tảng; không có cam kết chính xác từng giây. Khi kết quả chưa rõ, hệ thống giữ trạng thái để kiểm tra thay vì tự gửi lại. Nút hủy chặn việc chưa gửi, không thu hồi bài nền tảng đã nhận.",
    "Each publication uses the version approved when it was scheduled. Editing a post does not replace an earlier scheduled snapshot. Timing depends on queues, limits, credentials, connectivity and platform availability and is not guaranteed to the second. Ambiguous submissions are held for review rather than blindly repeated. Cancellation prevents unsent work and does not retract a post already accepted by a platform.",
  ],
  [
    "5. Khả năng từng kênh / Channel capabilities",
    "DEV và LinkedIn chỉ tự đăng khi đã có kết nối và quyền phù hợp. Medium, Reddit và Indie Hackers trong bản hiện tại hỗ trợ chuẩn bị bài và xác nhận thủ công. Facebook dùng companion cần máy chạy và có phiên hợp lệ. Nhà cung cấp có thể thay đổi API, giới hạn, việc duyệt hoặc trạng thái bài; BotAds không đại diện cho các nhà cung cấp này.",
    "Automatic DEV and LinkedIn publishing requires valid connections and permissions. The current Medium, Reddit and Indie Hackers workflows assist manual posting and user confirmation. Facebook browser workflows require the companion device and a valid session. Providers may change APIs, limits, review processes or post states. BotAds does not act as those providers.",
  ],
  [
    "6. Đo lường và cam kết / Measurement and promises",
    "Thành công qua API thể hiện kết quả gửi và định danh bài được trả về, không bảo đảm lập chỉ mục, thứ hạng, lượt trích dẫn AI, traffic, doanh thu hoặc số khách. Số liệu nhập tay cần được bạn đối chiếu với nguồn analytics/CRM của mình. Dịch vụ và giới hạn đang cung cấp được thể hiện trong giao diện; nếu có gói trả phí, giá/phạm vi và điều kiện thanh toán phải được thông báo riêng trước khi bạn mua.",
    "API success records the provider response and post identifier; it does not guarantee indexing, ranking, AI citations, traffic, revenue or customers. Check manually entered metrics against your analytics or CRM. Available service limits are shown in the interface. If paid packages are offered, their price, scope and payment conditions must be disclosed separately before purchase.",
  ],
  [
    "7. Ngừng sử dụng và dữ liệu / Stopping use and data",
    "Bạn có thể hủy lịch chưa gửi, ngắt kênh và gửi yêu cầu xóa dữ liệu/tài khoản tại <a href='/data-deletion'>trang hướng dẫn xóa</a>. Nội dung đã xuất bản trên nền tảng, bản sao công khai và dữ liệu cục bộ trên máy cần được xử lý theo phạm vi riêng. Hệ thống có thể hạn chế việc gửi mới khi mất quyền, vượt giới hạn hoặc phát hiện sử dụng trái điều khoản; điều này không tự xóa dữ liệu của bạn.",
    "You can cancel unsent schedules, disconnect channels and request account or data deletion using the <a href='/data-deletion'>deletion page</a>. Published platform content, public copies and local device data require separate handling. New submissions may be restricted when authorization is lost, limits are exceeded or misuse is detected; this does not itself erase your information.",
  ],
  [
    "8. Hỗ trợ và cập nhật / Support and updates",
    `Gửi vấn đề cho ${operator} tại <a href='/support'>trang hỗ trợ</a>, kèm mã yêu cầu hoặc ID bài và mô tả đã loại bỏ secrets. Chúng tôi sẽ kiểm tra thông tin cần thiết để xử lý. Điều khoản có ngày cập nhật ${updated}; thay đổi quan trọng về phạm vi sử dụng sẽ được phản ánh trong dịch vụ và trang này.`,
    `Contact ${operator} through the <a href='/support'>support page</a> with relevant request/post references and a description that excludes secrets. We check information needed to resolve the issue. These terms were updated on 10 November 2026; material changes to use of the service will be reflected in the service and this page.`,
  ],
]);

const deletion = sections([
  [
    "1. Dừng việc đăng và ngắt kết nối / Stop publishing and disconnect",
    "Trong BotAds, hủy các lượt chưa gửi tại Lịch & kết quả. Vào Kết nối kênh → Ngắt kết nối để xóa credential trong hệ thống và hủy công việc chưa gửi của kênh. Sau đó thu hồi quyền ứng dụng trong cài đặt LinkedIn hoặc thu hồi API key tại DEV nếu bạn không muốn tiếp tục cấp quyền.",
    "Cancel unsent items in the publishing results view. Use Connected channels → Disconnect to remove stored credentials and cancel unsent work for that connection. Also revoke the app permission in LinkedIn settings or the API key in DEV if you no longer wish to grant access.",
  ],
  [
    "2. Nêu phạm vi cần xóa / Specify the scope",
    "Bạn có thể yêu cầu xóa dữ liệu kết nối LinkedIn/DEV, một thương hiệu/bài/ảnh hoặc toàn bộ tài khoản BotAds. Dùng email đã đăng ký và mô tả phạm vi, website/thương hiệu, ID bài hoặc tài khoản kênh liên quan. Không gửi mật khẩu, access token, API key hoặc giấy tờ không cần thiết.",
    "You may request deletion of LinkedIn/DEV connection data, specific brand/content/images or your entire BotAds account. Use your registered email and describe the scope, brand/site and relevant post/account references. Do not send passwords, access tokens, API keys or unnecessary identity documents.",
  ],
  [
    "3. Xác minh và xử lý / Verification and processing",
    "Gửi biểu mẫu bên dưới hoặc <a href='/support?topic=deletion'>biểu mẫu hỗ trợ</a>. Bạn sẽ nhận mã tiếp nhận. XayWebsite kiểm tra quyền kiểm soát tài khoản và phạm vi trước khi xóa; có thể cần đối chiếu qua email/tài khoản đang đăng nhập. Việc gửi biểu mẫu chưa phải xác nhận dữ liệu đã được xóa. Dữ liệu liên quan yêu cầu hợp lệ sẽ được xử lý theo phạm vi đã xác minh và nghĩa vụ áp dụng, không giữ quyền sử dụng token sau khi yêu cầu xóa kết nối đã được thực hiện.",
    "Use the form below or the <a href='/support?topic=deletion'>support form</a> and retain the receipt reference. XayWebsite verifies account control and scope before erasure, which may require email or signed-in account confirmation. Submission alone is not a deletion confirmation. Information covered by a valid request is handled according to the verified scope and applicable obligations; connection erasure does not retain authority to use its token.",
  ],
  [
    "4. Những nơi cần xử lý riêng / Separate locations",
    "Xóa dữ liệu BotAds không tự xóa bài trên LinkedIn/DEV hoặc bản sao bên ngoài; bạn có thể cần xóa bài ngay trên nền tảng. Với ảnh công khai do BotAds lưu, nêu link/ID ảnh để xử lý bản sao của chúng tôi. Hồ sơ trình duyệt Facebook trên máy Windows cần được xóa trong ứng dụng/thiết bị; việc xóa cloud không điều khiển thiết bị đang offline. Chúng tôi sẽ làm rõ giới hạn liên quan bản sao lưu, nhật ký hoặc dữ liệu cần giữ theo nghĩa vụ áp dụng khi xử lý.",
    "Deleting BotAds data does not automatically remove LinkedIn/DEV posts or external copies; you may need to delete posts on the platform. Include public BotAds image links/IDs when requesting removal of our copies. Windows Facebook browser profiles require local application/device action, and cloud erasure cannot control an offline device. Relevant backup, log or required-retention limitations are explained when handling a request.",
  ],
]);

function requestForm(category = "support") {
  return `<section class="request-panel" id="request"><h2>${category === "deletion" ? "Gửi yêu cầu xóa dữ liệu / Request deletion" : "Gửi yêu cầu / Contact support"}</h2>
  <p>Yêu cầu được tiếp nhận bởi XayWebsite. Chúng tôi dùng email bạn cung cấp để liên hệ và xác minh khi cần. / XayWebsite uses your reply email to respond and verify requests where needed.</p>
  <form data-support-form method="post" action="/api/support/requests">
    <div class="form-grid"><label>Tên / Name<input name="name" autocomplete="name" required maxlength="100"></label><label>Email phản hồi / Reply email<input name="email" type="email" autocomplete="email" required maxlength="254"></label></div>
    <label>Loại yêu cầu / Request type<select name="category"><option value="support" ${category === "support" ? "selected" : ""}>Hỗ trợ sử dụng / Support</option><option value="privacy">Quyền riêng tư / Privacy</option><option value="deletion" ${category === "deletion" ? "selected" : ""}>Xóa dữ liệu / Data deletion</option></select></label>
    <label>Mô tả / Description<textarea name="message" rows="7" required minlength="20" maxlength="5000" placeholder="Website/thương hiệu, phạm vi yêu cầu, ID bài hoặc các bước gặp lỗi. Không gửi mật khẩu/API key."></textarea></label>
    <label class="consent"><input name="acknowledged" type="checkbox" required> <span>Tôi đã đọc <a href='/privacy' target="_blank" rel="noreferrer">Chính sách quyền riêng tư</a> và hiểu việc gửi yêu cầu không tự xóa dữ liệu. / I have read the privacy policy and understand submission is not automatic erasure.</span></label>
    <button type="submit" disabled>Gửi yêu cầu / Submit request</button><noscript><p>Biểu mẫu cần JavaScript để gửi an toàn. Vui lòng bật JavaScript và tải lại trang. / Enable JavaScript and reload to submit this form.</p></noscript>
    <p class="form-status" data-form-status role="status" aria-live="polite"></p>
  </form><p class="muted">Giữ mã yêu cầu sau khi gửi. Bản hiện tại không tự gửi email xác nhận. / Keep your receipt reference; automatic confirmation emails are not enabled.</p></section>`;
}
const pages = {
  "/privacy": {
    title: "Privacy Policy",
    subtitle: "Chính sách quyền riêng tư",
    description:
      "How XayWebsite-operated BotAds processes account, publishing and connected-channel information.",
    body: privacy,
  },
  "/terms": {
    title: "Terms of Service",
    subtitle: "Điều khoản sử dụng",
    description:
      "Terms for BotAds accounts, connected channels, approved publishing and support.",
    body: terms,
  },
  "/support": {
    title: "Contact & Support",
    subtitle: "Liên hệ và hỗ trợ",
    description:
      "Contact XayWebsite about BotAds support, privacy or data deletion.",
    body: `<section class="document-section"><h2>XayWebsite · Bên vận hành BotAds / Operator</h2><p>Gửi câu hỏi về kết nối kênh, lịch đăng, lỗi, quyền riêng tư hoặc xóa dữ liệu bằng biểu mẫu bên dưới. Nêu đúng thương hiệu và email tài khoản để chúng tôi kiểm tra. Không cần gửi mật khẩu hoặc API key.</p><p class="english" lang="en">Use this form for connection, scheduling, delivery, privacy or deletion questions. Include the relevant brand and account email. Do not include passwords or API credentials.</p><p>Hướng dẫn riêng: <a href='/data-deletion'>Xóa dữ liệu</a> · <a href='/privacy'>Quyền riêng tư</a>.</p></section>${requestForm()}`,
  },
  "/data-deletion": {
    title: "Data Deletion",
    subtitle: "Hướng dẫn yêu cầu xóa dữ liệu",
    description:
      "Disconnect channels and request verified removal of BotAds account and connected-platform data.",
    body: deletion + requestForm("deletion"),
  },
};

export function renderLegalPage(pathname) {
  const normalized = pathname.replace(/\/$/, "").replace(/\.html$/, "");
  const page = pages[normalized];
  if (!page) return null;
  const nav = LEGAL_PATHS.map(
    (route) =>
      `<a href='${route}'${route === normalized ? ' aria-current="page"' : ""}>${pages[route].title}</a>`,
  ).join("");
  return `<!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${page.title} — BotAds</title><meta name="description" content="${page.description}"><meta name="theme-color" content="#112f29"><link rel="canonical" href='https://bot.salesora.space${normalized}'><link rel="icon" type="image/png" sizes="32x32" href='/brand/logo-32.png'><link rel="apple-touch-icon" href='/brand/logo-180.png'><link rel="stylesheet" href='/legal.css'>${normalized === "/support" || normalized === "/data-deletion" ? '<script src="/legal.js" defer></script>' : ""}</head><body><a class="skip-link" href='#main'>Đến nội dung / Skip to content</a><header class="site-header"><a class="brand" href='/' aria-label="BotAds — Trang chủ"><img src="/brand/logo-128.png" alt="" width="40" height="40"><span>botads<span class="dot">.</span></span></a><a class="app-link" href='/'>Mở BotAds / Open app ↗</a></header><div class="document-layout"><aside><p class="eyebrow">BOTADS · XAYWEBSITE</p><nav aria-label="Chính sách và hỗ trợ">${nav}</nav><p class="muted">Cập nhật / Updated<br>${updated}</p></aside><main id="main"><div class="page-intro"><p class="eyebrow">THÔNG TIN DỊCH VỤ / SERVICE INFORMATION</p><h1>${page.title}</h1><p class="subtitle">${page.subtitle}</p><p class="muted">Bên vận hành / Operator: ${operator} · ${updated}</p></div>${page.body}</main></div><footer><p>BotAds · Vận hành bởi / Operated by ${operator}</p><nav aria-label="Liên kết cuối trang">${nav}</nav></footer></body></html>`;
}
