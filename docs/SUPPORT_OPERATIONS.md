# Chính sách, hỗ trợ và LinkedIn App

Cập nhật 10/11/2026. Bên vận hành được chủ dự án xác nhận: **XayWebsite**. Chưa có email hỗ trợ được xác nhận; website dùng biểu mẫu tiếp nhận thật thay vì công bố địa chỉ email chưa tồn tại.

## Các URL sau khi deploy thành công

- Privacy Policy: `https://bot.salesora.space/privacy`
- Terms of Service: `https://bot.salesora.space/terms`
- Contact & Support: `https://bot.salesora.space/support`
- Data Deletion: `https://bot.salesora.space/data-deletion`

Đây là HTML tĩnh được xuất trong `npm run web:build`, có nội dung tiếng Việt và tiếng Anh, không yêu cầu đăng nhập hoặc JavaScript để đọc chính sách. Vite dev cũng phục vụ cùng nội dung. Biểu mẫu gửi yêu cầu cần JavaScript và backend đã áp dụng migration `0003_support.sql`.

Nội dung mô tả đúng các chức năng đang có: phiên đăng nhập, token/API key, lịch và snapshot, ảnh công khai có đồng ý, Gemini tùy chọn trong luồng cũ, companion Facebook cục bộ, ngắt kết nối và xác minh yêu cầu xóa. Không tuyên bố đã được LinkedIn phê duyệt hoặc đạt một chứng nhận pháp lý.

## Tiếp nhận yêu cầu hỗ trợ

Biểu mẫu POST `/api/support/requests` tạo bản ghi D1 và trả mã yêu cầu. Không gửi email tự động và không tự xóa tài khoản. Nếu người gửi đang đăng nhập, ticket gắn với workspace từ phiên; trường workspace do client gửi bị bỏ qua. Email nhập khi chưa đăng nhập không tự được coi là đã xác minh hoặc gắn với tài khoản có cùng email.

**Người vận hành phải kiểm tra hàng đợi thường xuyên.** Bản này chưa có thông báo email hoặc màn hình admin; quản trị qua Cloudflare Dashboard → D1 → database `bot-ads` → Console. Chỉ người được phép quản trị Cloudflare mới thực hiện. Không cấp quyền admin bằng một email tự đăng ký trên website.

Đọc yêu cầu mới:

```sql
SELECT id, workspace_id, requester_name, reply_email, category, message, status, created_at
FROM support_requests
WHERE status IN ('open','processing')
ORDER BY created_at;
```

Đối chiếu mã, xác minh khách qua email/tài khoản kiểm soát được, rồi đánh dấu đang xử lý bằng ID thật:

```sql
UPDATE support_requests SET status='processing' WHERE id='ID_YEU_CAU_THAT' AND status='open';
```

Người gửi có thể đã thay reply email; việc gắn workspace không thay thế xác minh nếu yêu cầu liên quan dữ liệu ngoài quyền tài khoản hiện tại. Không yêu cầu khách gửi password, API key, access token hoặc giấy tờ nhạy cảm không cần thiết.

Khi đã hoàn tất, ghi `closed_at` bằng Unix milliseconds và chọn `completed` hoặc `rejected` theo kết quả thực tế. Không đánh dấu hoàn tất khi mới tiếp nhận hoặc đang chờ xác minh. Cron xóa ticket đã đóng quá 180 ngày, giữ ticket đang mở.

## Xử lý yêu cầu xóa

1. Xác minh người gửi và ghi rõ phạm vi: dữ liệu kênh, bài/ảnh, một thương hiệu hay toàn bộ tài khoản.
2. Ngắt kết nối và dừng các lượt chưa gửi trước; chờ thao tác đang gửi kết thúc/đối soát. Không xóa hàng đợi ngay giữa HTTP request rồi coi là đã thu hồi bài.
3. Xử lý dữ liệu thuộc phạm vi đã xác minh, bao gồm credential, định danh/tên kênh và dữ liệu API liên quan khi yêu cầu áp dụng. Xóa credential là một phần, không mặc định hoàn tất yêu cầu xóa toàn bộ dữ liệu LinkedIn.
4. Kiểm tra quan hệ khóa ngoại của các bảng marketing, Facebook, support và auth; xóa theo thứ tự phụ thuộc và phạm vi workspace. Không chạy lệnh xóa toàn bộ database hoặc xóa hàng loạt chỉ từ email chưa xác minh.
5. Xử lý object R2 nguồn và bản công khai nếu nằm trong phạm vi xóa; lưu ý các bản sao đã được nền tảng lấy không nằm dưới quyền kiểm soát của BotAds.
6. Hồ sơ Facebook trên máy khách cần khách xử lý ở thiết bị; xóa cloud không tự điều khiển thiết bị offline. Bài trên LinkedIn/DEV có thể phải được khách xóa tại nền tảng.
7. Xác nhận với khách kết quả và giới hạn thực tế, sau đó đóng ticket. Với dữ liệu cần giữ theo nghĩa vụ áp dụng hoặc backup, giải thích cụ thể; không hứa thời hạn không được vận hành bảo đảm.

Không có nút xóa toàn bộ tự động trong bản này. Checklist này dành cho người vận hành đã xác minh yêu cầu; không thay thế kiểm tra phạm vi và phụ thuộc dữ liệu trước khi thao tác.

## Hoàn tất LinkedIn App

1. Deploy chính sách trước. Workflow kiểm tra cả bốn URL trên Pages URL và domain chính; chỉ dùng URL Privacy Policy khi trang đã truy cập thật.
2. Trong LinkedIn Developer Portal, tạo app BotAds, chọn Company Page của bên sở hữu/vận hành phù hợp. Liên kết Page với app là lựa chọn phải kiểm tra trước khi tạo.
3. Upload `apps/web/public/brand/logo-512.png`. Điền Privacy Policy URL `https://bot.salesora.space/privacy`.
4. Trong Products bật/yêu cầu **Share on LinkedIn** và **Sign In with LinkedIn using OpenID Connect**. Quyền thực tế phải được LinkedIn cấp; có Client ID không đồng nghĩa đã có đủ quyền.
5. Trong Auth khai báo chính xác callback:

   ```text
   https://bot.salesora.space/api/marketing/linkedin/callback
   ```

6. Tại GitHub → Settings → Secrets and variables → Actions (hoặc environment `production`), thêm **LINKEDIN_CLIENT_ID** và **LINKEDIN_CLIENT_SECRET**. Không gửi giá trị vào chat hoặc commit. Workflow chuyển chúng lên Worker và kiểm tra cặp cấu hình; nếu chưa có app, DEV/manual và các trang chính sách vẫn deploy được.
7. Chạy lại workflow. Đăng nhập BotAds → Marketing đa kênh → Kết nối kênh → LinkedIn để consent tài khoản pilot.
8. Duyệt một bài được phép, đăng thử, kiểm tra tác giả/nội dung/ảnh và permalink trực tiếp trên LinkedIn. Chỉ khi đó mới ghi nhận nghiệm thu thật.

Phần tạo app, chọn Page, chấp thuận quyền và lấy secrets phải thực hiện trong tài khoản LinkedIn/GitHub/Cloudflare của chủ hệ thống. Chưa có Developer App hoặc phiên quản trị kết nối thì mã nguồn không thể tự tạo quyền thay cho chủ tài khoản.

Nguồn đối chiếu: [LinkedIn API Terms](https://www.linkedin.com/legal/l/api-terms-of-use), [App creation](https://www.linkedin.com/help/lms/answer/a1678244), [OAuth setup](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow), [Pages route serving](https://developers.cloudflare.com/pages/configuration/serving-pages/).
