# Hướng dẫn nộp đơn xin Etsy Open API v3

Tài liệu này ghi lại chính xác những gì Etsy yêu cầu và nội dung mẫu bạn có thể dùng,
đã khớp với những gì website này thực sự làm.

---

## Bước 0 — Chuẩn bị trước khi nộp

| Yêu cầu | Trạng thái trong dự án này |
|---|---|
| Tài khoản Etsy đã xác minh | Bạn tự chuẩn bị |
| Website công khai mô tả ứng dụng | ✅ `/` , `/features`, `/platforms` |
| Privacy Policy | ✅ `/privacy` — mô tả rõ dữ liệu Etsy API nào được truy cập và vì sao |
| Terms of Service | ✅ `/terms` |
| Security Policy | ✅ `/security` |
| Cách người dùng xóa dữ liệu | ✅ `/privacy#data-deletion` + Dashboard → Settings |
| Ghi chú thương hiệu Etsy | ✅ hiển thị ở footer mọi trang |
| Callback URL (OAuth redirect) | ✅ `https://dkh-io.vercel.app/api/integrations/etsy/callback` |

> Website đã live tại **https://dkh-io.vercel.app** — dùng đúng URL này khi điền đơn.

---

## Bước 1 — Đăng ký app

Vào https://www.etsy.com/developers/register và điền:

**Application name**
```
DKH
```

**Application description** (mô tả app làm gì — đây là phần Etsy đọc kỹ nhất)
```
DKH is an order management and fulfillment automation tool for Etsy sellers who also
sell on other channels. After a seller authorizes their shop through Etsy's OAuth screen,
DKH imports their receipts and active listings into a single operations dashboard,
lets them track each order from payment through production to delivery, and uploads the
tracking number back to Etsy when a shipping label is created — so the buyer is notified
through Etsy automatically.

We use the Etsy Open API v3 exclusively (no scraping, no browser automation) with the
following scopes:
  - shops_r          read the shop profile so we can label the connection
  - listings_r       read active listings, SKUs, price and stock to match order lines
  - transactions_r   read receipts to create the seller's order queue
  - transactions_w   upload tracking numbers and mark receipts as shipped
  - email_r          contact the seller if a sync fails

Buyer data is used only to fulfill the seller's own orders. It is never sold, never used
for advertising, and never shared with other sellers. Sellers can disconnect a shop at any
time, which deletes the stored tokens immediately, and can delete their entire account and
all imported data from their dashboard.

Website: https://dkh-io.vercel.app
Privacy Policy: https://dkh-io.vercel.app/privacy
Terms: https://dkh-io.vercel.app/terms
```

**Website URL**
```
https://dkh-io.vercel.app
```

**Callback URL / Redirect URI** — phải khớp tuyệt đối, kể cả dấu `/`
```
https://dkh-io.vercel.app/api/integrations/etsy/callback
```

**Do you plan to charge for this application?** → Yes (có trang `/pricing`) hoặc No, tùy bạn.

---

## Bước 2 — Sau khi được cấp key

Etsy trả về **Keystring** (client id) và **Shared secret**.

Nạp vào Vercel (`ETSY_REDIRECT_URI` đã đặt sẵn đúng giá trị):

```bash
printf '%s' 'keystring-cua-ban' | vercel env add ETSY_CLIENT_ID production --force
```

```bash
printf '%s' 'shared-secret-cua-ban' | vercel env add ETSY_CLIENT_SECRET production --force
```

```bash
vercel deploy --prod --yes
```

Dùng `printf` chứ đừng dùng `echo` — một số shell thêm ký tự BOM vào đầu giá trị và
Etsy sẽ từ chối `client_id`.

Sau khi redeploy, vào **Admin → Integrations** để xác nhận mọi biến môi trường đã "ok",
và nút Connect Etsy shop trong Dashboard → Shops chuyển sang chế độ live.

---

## Bước 3 — Kiểm tra luồng OAuth

1. Đăng nhập với tài khoản seller
2. Dashboard → Shops → **Connect Etsy shop**
3. Etsy hiện màn hình xin quyền → Allow
4. Quay lại `/dashboard/shops?connected=<tên shop>`
5. Listings và receipts được import; xem log tại Admin → Integrations → Recent sync jobs

Nếu lỗi, thông báo cụ thể hiện ngay trên trang Shops và được ghi vào Activity log.

---

## Những lỗi khiến đơn bị từ chối

| Lỗi | Cách dự án này xử lý |
|---|---|
| Website chỉ là landing page trống | Có 11 trang public + dashboard + admin hoạt động thật |
| Không có Privacy Policy | Có, và nêu đích danh từng scope Etsy |
| Không nói rõ dùng scope nào để làm gì | Nêu ở `/platforms`, `/privacy` §3, và Admin → Integrations |
| Xin quá nhiều scope | Chỉ xin 5 scope cần thiết cho chức năng đã mô tả |
| Không có cách xóa dữ liệu | `/privacy#data-deletion` + nút xóa tài khoản thật trong Settings |
| Thiếu ghi chú thương hiệu Etsy | Có ở footer mọi trang |
| Redirect URI không khớp | Admin → Integrations hiển thị URI chính xác để copy |

---

## Rate limit của Etsy

- 10 requests/giây, 10.000 requests/ngày cho mỗi app
- `src/lib/sync.ts` đồng bộ tuần tự theo từng shop và ghi lại mọi lần chạy vào bảng `SyncJob`
- Khi lên production nên chuyển sync sang hàng đợi nền (cron / queue) thay vì chạy đồng bộ
  trong request, và thêm backoff khi gặp HTTP 429
