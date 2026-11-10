# Đăng ký và đăng nhập Google

BotAds dùng OAuth authorization code + OpenID Connect phía backend. Một nút **Tiếp tục với Google** dùng chung cho đăng ký và đăng nhập. Google chỉ nhận quyền `openid email profile`; không yêu cầu Gmail, Drive hay quyền đăng bài.

## Cấu hình Google Cloud

Trong project Google Cloud tương ứng Client ID, vào **Google Auth Platform → Clients** (hoặc **APIs & Services → Credentials**) → chọn OAuth client loại **Web application**.

Thêm chính xác vào **Authorized redirect URIs**:

```text
https://bot.salesora.space/api/auth/google/callback
http://127.0.0.1:5173/api/auth/google/callback
```

Đây là callback phía server, không phải trường JavaScript origins. Không thêm dấu `/` cuối hoặc query string. Google và BotAds phải dùng cùng một Client ID/Secret.

Cấu hình consent screen: tên BotAds, bên vận hành XayWebsite, liên kết trang chủ, `/privacy` và `/terms` đã xuất bản. Nếu app đang ở trạng thái Testing, thêm các email cần thử trong Test users khi áp dụng. Cấu hình đối tượng người dùng phù hợp trước khi mở cho khách hàng. Không cần đưa Client Secret vào frontend hoặc biến `VITE_*`.

## Cấu hình BotAds

Local: `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET` trong `.dev.vars` ở gốc repo, đã được Git bỏ qua. `PUBLIC_APP_URL` local trong Wrangler là `http://127.0.0.1:5173`. Dùng đúng host này để thử; không đổi qua lại giữa localhost và 127.0.0.1 trong một lần OAuth.

Production: hai secrets nằm trên Worker **bot-ads-production**. Khi dùng CI, thêm hai tên tương ứng trong GitHub Actions Secrets; workflow tự upload và giữ secret hiện có nếu GitHub không cung cấp giá trị mới.

```powershell
npx wrangler secret put GOOGLE_CLIENT_ID --env production
npx wrangler secret put GOOGLE_CLIENT_SECRET --env production
```

Migration `apps/api/migrations/0004_google_auth.sql` tạo trạng thái đăng nhập và liên kết danh tính Google. Local chạy `npm run cloud:setup`; workflow hiện tại tự áp dụng migration production trước khi deploy.

## Chạy local

Yêu cầu Node.js 22 và npm. Trong `D:\botAds`:

```powershell
npm ci
npm run cloud:setup
```

Terminal 1:

```powershell
npm run cloud:dev
```

Terminal 2:

```powershell
npm run web:dev
```

Mở **http://127.0.0.1:5173**, bấm **Tiếp tục với Google**. Khởi động lại backend sau khi thay `.dev.vars`. Local dùng D1 riêng, không tự có dữ liệu/tài khoản production.

## Hành vi tài khoản

- Google lần đầu với email chưa có: tạo user và workspace khi đăng ký đang mở. Tài khoản này không được cấp mật khẩu giả; đăng nhập bằng Google.
- Google đã liên kết: đăng nhập vào user/workspace hiện có, dựa vào Google `sub`, không dựa vào tên hay email có thể đổi.
- Email trùng tài khoản mật khẩu: không tự ghép. Khách đăng nhập bằng mật khẩu rồi vào **Cài đặt → Đăng nhập Google → Liên kết tài khoản Google**. Phiên bắt đầu liên kết phải còn hiệu lực ở callback.
- Google đã thuộc tài khoản khác: từ chối liên kết. Không thể dùng luồng này để chuyển quyền sở hữu.
- Có mật khẩu: có thể ngắt Google trong Cài đặt. Google-only: chặn ngắt để tránh tự khóa tài khoản. Thiết lập mật khẩu mới/khôi phục tài khoản chưa nằm trong thay đổi này.
- Khi tắt đăng ký, Google đã liên kết vẫn đăng nhập được; Google chưa có tài khoản không được tạo user mới.

Backend kiểm tra state dùng một lần, cookie trình duyệt HttpOnly/SameSite=Lax, PKCE, nonce, chữ ký RSA qua Google JWKS, issuer, audience, thời hạn và email_verified. Thư viện `jose` kiểm tra JWT; không dùng tokeninfo để xác thực production. Token Google không được lưu lâu dài hay gửi về dashboard. Phiên BotAds dùng cookie HttpOnly hiện tại.

## Kiểm thử và giới hạn nghiệm thu

`node --test tests/google-auth.test.mjs` dùng chữ ký RSA/JWKS và HTTP fixture trong Workers runtime, không dùng tài khoản Google thật. Bộ browser smoke cũng kiểm tra nút Google qua nhà cung cấp giả lập. Việc này không xác nhận app Google Cloud đã được thêm callback hoặc publish đúng audience: cần một lượt đăng nhập thật sau cấu hình/deploy.

Nếu Google báo `redirect_uri_mismatch`, đối chiếu callback trên màn hình Google với hai URL ở trên. Nếu BotAds báo lỗi cấu hình, kiểm tra hai secrets cùng app. Không dán authorization code, ID token hoặc secret vào log hỗ trợ.

Tài liệu chính thức: [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [jose](https://github.com/panva/jose).
