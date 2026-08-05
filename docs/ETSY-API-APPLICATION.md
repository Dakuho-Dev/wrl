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
| Callback URL (OAuth redirect) | ✅ `https://<domain>/api/integrations/etsy/callback` |

> **Quan trọng:** phải deploy lên domain public trước. Etsy không duyệt `localhost`.

---

## Bước 1 — Đăng ký app

Vào https://www.etsy.com/developers/register và điền:

**Application name**
```
OwlFlow
```

**Application description** (mô tả app làm gì — đây là phần Etsy đọc kỹ nhất)
```
OwlFlow is an order management and fulfillment automation tool for Etsy sellers who also
sell on other channels. After a seller authorizes their shop through Etsy's OAuth screen,
OwlFlow imports their receipts and active listings into a single operations dashboard,
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

Website: https://<domain-cua-ban>
Privacy Policy: https://<domain-cua-ban>/privacy
Terms: https://<domain-cua-ban>/terms
```

**Website URL**
```
https://<domain-cua-ban>
```

**Callback URL / Redirect URI** — phải khớp tuyệt đối, kể cả dấu `/`
```
https://<domain-cua-ban>/api/integrations/etsy/callback
```

**Do you plan to charge for this application?** → Yes (có trang `/pricing`) hoặc No, tùy bạn.

---

## Bước 2 — Sau khi được cấp key

Etsy trả về **Keystring** (client id) và **Shared secret**.

Đặt vào `.env` trên môi trường production:

```bash
ETSY_CLIENT_ID="keystring"
ETSY_CLIENT_SECRET="shared-secret"
ETSY_REDIRECT_URI="https://<domain-cua-ban>/api/integrations/etsy/callback"
```

Redeploy, rồi vào **Admin → Integrations** để xác nhận mọi biến môi trường đã "ok",
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
