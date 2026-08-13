# WrL — Order Management & Fulfillment Automation

Nền tảng quản lý đơn hàng đa sàn (Etsy, Shopify, Amazon, TikTok Shop) — bản dựng đầy đủ gồm
website giới thiệu, dashboard cho người bán, và trang quản trị (admin) hoàn chỉnh.

Được xây dựng để có thể dùng làm **website chính thức khi nộp đơn xin Etsy Developer API**.

---

## 1. Chạy dự án

```bash
npm install
```

```bash
npm run setup
```

```bash
npm run dev
```

Mở http://localhost:3000

`npm run setup` = `prisma db push` + seed dữ liệu mẫu (7 users, 6 shops, 130+ orders).

### Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Người bán | `seller@dkh.io.vn` | `Password123!` |
| Quản trị viên | `admin@dkh.io.vn` | `Admin123!` |

---

## 2. Cấu trúc

```
src/
  app/
    (site)/           Website công khai: home, features, platforms, pricing,
                      docs, faq, support, contact, terms, privacy, security
    (auth)/           Đăng nhập / đăng ký
    dashboard/        Khu vực người bán (12 trang)
    admin/            Khu vực quản trị (12 trang)
    api/
      integrations/etsy/    OAuth 2.0 + PKCE thật với Etsy Open API v3
      v1/                   REST API công khai (orders, shops, products, shipments)
      export/orders         Xuất CSV (GDPR data portability)
      auth/logout
  components/         UI primitives, app shell, charts (SVG thuần)
  lib/
    etsy.ts           Client Etsy API v3: PKCE, token, receipts, listings, tracking
    sync.ts           Đồng bộ dữ liệu marketplace → database
    auth.ts           Session JWT, bcrypt, phân quyền
    demo-data.ts      Sinh dữ liệu mô phỏng khi chưa có API key
prisma/
  schema.prisma       17 model: User, Shop, Order, OrderItem, Shipment,
                      Automation, SyncJob, ApiKey, Ticket, ActivityLog...
```

---

## 3. Tính năng

### Website công khai
- Trang chủ, Features (6 nhóm chi tiết), Platforms (scope API từng sàn), Pricing (lấy từ DB)
- Docs (hướng dẫn kết nối Etsy + tham chiếu REST API), FAQ, Support Center, Contact (tạo ticket thật)
- **Terms & Conditions, Privacy Policy, Security Policy** — bắt buộc phải có khi xin API Etsy

### Dashboard người bán
| Trang | Nội dung |
|---|---|
| Overview | Doanh thu, đơn hàng, biểu đồ 14 ngày, phân bổ trạng thái |
| Orders | Lọc theo trạng thái/shop/từ khóa, phân trang, cập nhật hàng loạt |
| Order detail | Line items, personalization, địa chỉ, timeline, tạo shipment + đẩy tracking |
| Shipping | Danh sách vận đơn, hàng chờ giao, chi phí label |
| Products | Listings đồng bộ, tồn kho, giá trị kho |
| **Shops** | **Kết nối/ngắt kết nối shop, sync thủ công, bật/tắt auto-sync** |
| Automations | Tạo rule trigger → condition → action, lịch sử chạy |
| Analytics | Doanh thu 12 tuần, theo kênh/quốc gia/carrier, top sản phẩm |
| Notifications | Thông báo + nhật ký hoạt động |
| API & webhooks | Tạo/thu hồi API key, đăng ký webhook endpoint |
| Billing | Hạn mức plan, đổi plan, hóa đơn |
| Settings | Hồ sơ, đổi mật khẩu, xuất dữ liệu, **xóa tài khoản** |

### Trang quản trị
| Trang | Nội dung |
|---|---|
| Dashboard | Users, shops, GMV, sync job lỗi, hoạt động gần đây |
| Platform analytics | GMV, MRR ước tính, đăng ký mới, shop bận nhất |
| Users | Tìm kiếm, đổi plan/role/status, khóa, xóa tài khoản |
| Shops | Toàn bộ shop mọi tài khoản, sync/xóa, trạng thái lỗi |
| Orders | Toàn bộ đơn hàng toàn nền tảng |
| Products | Toàn bộ listing |
| Automations | Mọi rule của mọi seller |
| Plans | Tạo/sửa/xóa gói giá — đẩy thẳng ra trang /pricing |
| **Integrations** | **Trạng thái cấu hình Etsy API, callback URL, scope, endpoint đang dùng** |
| Tickets | Trả lời ticket từ form liên hệ |
| Activity log | Nhật ký audit toàn hệ thống + sync jobs |
| Settings | Cấu hình chung, bật/tắt đăng ký, chu kỳ sync |

---

## 4. Kết nối Etsy API thật

Khi chưa có `ETSY_CLIENT_ID`, hệ thống chạy **demo mode** — vẫn kết nối được shop mô phỏng để
demo toàn bộ luồng. Khi đã có key Etsy:

```bash
# .env
ETSY_CLIENT_ID="keystring-cua-ban"
ETSY_CLIENT_SECRET="shared-secret-cua-ban"
ETSY_REDIRECT_URI="https://ten-mien-cua-ban.com/api/integrations/etsy/callback"
ETSY_SCOPES="email_r shops_r shops_w listings_r listings_w transactions_r transactions_w"
NEXT_PUBLIC_APP_URL="https://ten-mien-cua-ban.com"
AUTH_SECRET="chuoi-ngau-nhien-dai-it-nhat-32-ky-tu"
```

Khởi động lại → nút **Connect Etsy shop** sẽ chuyển hướng tới màn hình ủy quyền thật của Etsy.

Luồng đã được cài đặt đầy đủ:
1. `GET /api/integrations/etsy/connect` — sinh PKCE verifier/challenge, lưu state, redirect tới `etsy.com/oauth/connect`
2. `GET /api/integrations/etsy/callback` — xác thực state, đổi code lấy token (`/v3/public/oauth/token`)
3. Lấy shop: `GET /v3/application/users/{user_id}/shops`
4. Import listings: `GET /v3/application/shops/{shop_id}/listings/active`
5. Import đơn: `GET /v3/application/shops/{shop_id}/receipts`
6. Đẩy tracking: `POST /v3/application/shops/{shop_id}/receipts/{receipt_id}/tracking`
7. Refresh token tự động 5 phút trước khi hết hạn

Xem trạng thái cấu hình tại **Admin → Integrations**.

---

## 5. Deploy

**Đã deploy:** https://dkh-io.vercel.app — Vercel project `tu99s-projects/dkh`.

Redeploy sau khi sửa code:

```bash
vercel deploy --prod --yes
```

Biến môi trường production đã cấu hình sẵn trên Vercel (`vercel env ls production`):
`AUTH_SECRET`, `ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL`, `ETSY_REDIRECT_URI`, `ETSY_SCOPES`,
`ETSY_CLIENT_ID`, `ETSY_CLIENT_SECRET`, `SUPPORT_EMAIL`, `DEMO_*`.

### Database

Dùng Neon (Vercel → Storage → Neon). Sau khi tạo xong, kéo biến về máy và khởi tạo schema:

```bash
vercel env pull .env.production.local --environment production
```

```bash
npx dotenv -e .env.production.local -- npx prisma db push
```

Hoặc đơn giản hơn — đặt tạm `DATABASE_URL` trong shell rồi chạy `npx prisma db push` và
`npx tsx prisma/seed.ts`.

### Database local (tuỳ chọn)

```bash
npm run db:up
```

Container Postgres ở cổng 5433, khớp `DATABASE_URL` trong `.env.example`.

---

## 6. Nộp đơn xin Etsy API

Xem hướng dẫn chi tiết kèm nội dung mẫu để điền: [`docs/ETSY-API-APPLICATION.md`](docs/ETSY-API-APPLICATION.md)

---

## 7. Trạng thái bảo mật

Đã làm:

- [x] `AUTH_SECRET` / `ENCRYPTION_KEY` sinh ngẫu nhiên 48 byte trên production
- [x] Token OAuth marketplace mã hoá AES-256-GCM khi lưu DB (`src/lib/crypto.ts`)
- [x] PostgreSQL (Neon) thay cho SQLite
- [x] Rate limiting theo IP cho `/api/v1/*`, `/login`, `/register` + security headers (`src/middleware.ts`)
- [x] Mật khẩu demo sinh ngẫu nhiên, nạp qua biến môi trường
- [x] HTTPS + HSTS

Còn lại khi có người dùng thật:

- [ ] Xoá 2 tài khoản demo khỏi cơ sở dữ liệu (trang login không còn công bố chúng)
- [ ] Chuyển rate limit sang Redis/Upstash nếu cần giới hạn toàn cục (hiện đếm theo từng instance)
- [ ] Chuyển sync sang hàng đợi nền thay vì chạy trong request

### Rebuild dữ liệu demo

Đặt `SEED_RESET=true` trên Vercel rồi deploy một lần — seed sẽ xoá sạch và tạo lại.
Nhớ gỡ biến này ngay sau đó.
