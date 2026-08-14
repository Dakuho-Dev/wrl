# Nộp lại đơn xin Etsy Open API v3

Lần một bị từ chối. Tài liệu này ghi lại nguyên nhân, những gì đã sửa, và nội dung
để điền khi nộp lại.

---

## Vì sao lần một trượt

Thư từ chối của Etsy nêu ba khả năng: mô tả use case không rõ, trông như nộp hộ sản
phẩm của bên thứ ba, hoặc không đáp ứng yêu cầu. Đối chiếu website với
[API Terms of Use](https://www.etsy.com/legal/api/), nguyên nhân thực chất là **website
mô tả một sản phẩm không tồn tại đúng như mô tả**:

| Vấn đề | Điều khoản bị vi phạm |
|---|---|
| Trang chủ ghi 4.6M đơn, 12.400 shop, 99.95% uptime — đều bịa | §2 "accurate, true and complete" |
| Quảng cáo Shopify/Amazon/TikTok, chưa hề xây | §3 "fully functional", §5 Quality Standards |
| 10 tính năng không có trong code (mua label, so giá cước, packing slip, trang tracking cho người mua, SLA countdown, team accounts, sandbox, dry-run, chứng từ hải quan, in label hàng loạt) | §5 "operate as described to Etsy or as advertised" |
| Docs mô tả webhook có ký HMAC và retry — chưa có dòng code nào gửi | §5 Quality Standards |
| Quảng cáo gửi email/thông báo cho người mua | §5 Prohibited: cấm dùng API để gửi order/shipping/tracking cho Etsy member |
| Xin 7 scope nhưng chỉ dùng 4 | §5 Prohibited: "Request more than the minimum amount of data needed" |
| Thiếu DISCLAIMER bắt buộc trong Terms | §3 Application Terms |
| Câu tuyên bố thương hiệu diễn đạt lại, không đúng nguyên văn | §1 Etsy's Trademarks |
| Email hỗ trợ, số điện thoại, địa chỉ đều không có thật | §3 "monitored email address" |

---

## Đã sửa những gì

- Xoá toàn bộ số liệu bịa
- Bỏ Shopify/Amazon/TikTok khỏi website, dashboard và dữ liệu mẫu — WrL chỉ còn Etsy
- Bỏ 10 tính năng không tồn tại; thêm hẳn mục **"Not built yet"** ở `/features` liệt kê
  công khai những gì chưa làm được
- Đánh dấu webhook là chưa triển khai thay vì mô tả như đang chạy
- Bỏ mọi tuyên bố nhắn tin cho người mua và bỏ action `EMAIL_BUYER`
- Rút scope từ 7 xuống **4**: `shops_r listings_r transactions_r transactions_w`
- Thêm DISCLAIMER nguyên văn vào `/terms` §8
- Câu trademark dùng **đúng nguyên văn của Etsy**, hiển thị ở banner ngay đầu trang chủ
  (trên màn hình đầu tiên, không cần cuộn) và ở footer mọi trang
- Thay số điện thoại/địa chỉ bịa bằng biến môi trường; không hiển thị nếu chưa đặt

---

## Đã xong

- [x] Tên miền `wearelucky.io.vn` — apex và `www` đều 200, SSL hợp lệ, sitemap đúng host
- [x] `SITE_DOMAIN`, `NEXT_PUBLIC_APP_URL`, `ETSY_REDIRECT_URI` trỏ tên miền mới
- [x] Khoá API còn sống — `openapi-ping` không còn báo *key not found*
- [x] `x-api-key` gửi dạng `keystring:shared_secret`, đúng thứ app này đòi
- [x] Etsy chấp nhận callback `https://wearelucky.io.vn/api/integrations/etsy/callback`
- [x] 15 trang công khai đều 200, không còn tham chiếu tên miền cũ
- [x] Gỡ `dkh.io.vn`, `www.dkh.io.vn`, `wrl.dkh.io.vn` khỏi Vercel (đã 404)

## ⚠️ Chỉ chủ tài khoản làm được

**1. Thêm callback vào app Etsy.** Không có URL này trong danh sách thì OAuth trượt:

```
https://wearelucky.io.vn/api/integrations/etsy/callback
```

Xoá luôn các callback cũ trỏ `dkh.io.vn`, `wrl.dkh.io.vn`, `dkh-io.vercel.app` — tất cả
đều đã 404, để lại chỉ khiến reviewer bấm trúng chỗ chết.

**2. Kết nối thử một shop thật.** Đây là bằng chứng duy nhất cho §3 "fully functional".
Toàn bộ chuỗi trước đó đã kiểm chứng được từ bên ngoài; riêng bước đổi token và đọc shop
thì cần token của chính chủ.

**3. Hòm thư `support@wearelucky.io.vn`.** §3 bắt buộc công bố "a monitored email address".
Zoho bản miễn phí, hoặc forwarding của iNET. MX đặt trên `@`:

| Host | Type | Priority | Value          |
|------|------|----------|----------------|
| `@`  | MX   | 10       | `mx.zoho.com`  |
| `@`  | MX   | 20       | `mx2.zoho.com` |
| `@`  | MX   | 50       | `mx3.zoho.com` |
| `@`  | TXT  | —        | `v=spf1 include:zohomail.com ~all` |

Thư tới nơi rồi thì chạy:

```bash
vercel env add SUPPORT_EMAIL production --force -y --project owlflow --value "support@wearelucky.io.vn"
```

`privacy@` / `security@` / `legal@` tự dùng lại `SUPPORT_EMAIL` nếu không đặt riêng — một
hòm thư hoạt động tốt hơn bốn hòm thư bounce.

**4. Xoá `dkh-io.vercel.app`** trong dashboard: vercel.com → owlflow → Settings → Domains.
CLI không có lệnh gỡ project domain dạng `.vercel.app`.

**5. Tạo lại shared secret** bên Etsy — giá trị cũ đã lộ khi trao đổi. Rồi tự set:

```bash
vercel env add ETSY_CLIENT_SECRET production --force -y --project owlflow --value "<giá trị mới>"
```

Có thể đặt thêm `BUSINESS_PHONE` và `BUSINESS_ADDRESS` nếu có thật — bỏ trống thì trang
sẽ không hiển thị, tốt hơn là bịa.

---

## Nội dung điền khi nộp lại

**Application name**
```
WrL
```

**Application description** — bản ngắn, dùng bản này trước

```
WrL is a third-party tool that helps Etsy sellers view and organize their shop data in a clear production queue. The app uses the Etsy API to securely read shop details, active listings, and orders for tracking and daily fulfilment, and to submit a tracking number back to Etsy when the seller records a shipment. WrL never messages buyers — Etsy sends that notification. All data access is transparent to users.

Disclaimer: The term "Etsy" is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc.
```

Hai điểm cố ý khác với mô tả của các app tương tự: **nêu rõ quyền ghi** (`transactions_w`), vì
giấu nó rồi vẫn xin scope đó là đúng loại mâu thuẫn đã làm trượt lần một; và **nói thẳng WrL
không nhắn người mua**, điều §5 cấm rất gắt.

**Application description** — bản dài, dùng khi ô nhập cho phép

```
WrL is an order management tool for a single marketplace: Etsy. It is aimed at sellers
who make items to order and need a production queue that their whole workshop can work
from, rather than the Etsy seller dashboard alone.

After a seller authorises their shop on Etsy's own OAuth screen, WrL:
  - imports their receipts (buyer name, shipping address, line items, personalisation
    text, totals, payment state) into a filterable order queue;
  - reads their active listings so order lines can be matched to a SKU, price and stock
    level;
  - lets them move orders through their own production stages with internal status,
    priority, tags and notes that exist only inside WrL;
  - submits the carrier and tracking number back to Etsy when a shipment is recorded,
    so the order is marked shipped on Etsy;
  - reports on their own revenue, order volume and time-to-ship, with CSV export.

We request exactly four scopes, which is the complete set the features above need:
  shops_r         read shop id, name and currency to label the connection
  listings_r      read active listings to match order lines to products
  transactions_r  read receipts — this is the order data being managed
  transactions_w  submit a tracking number against a receipt

WrL does not create or edit listings, does not change shop settings or prices, and does
not contact buyers. Uploading a tracking number is the only action with any buyer-visible
effect, and the resulting notification is sent by Etsy, not by us. We do not scrape Etsy:
every call is to the documented Open API v3 using a token the seller granted.

Buyer data is used solely to fulfil that seller's own orders. It is never sold, never used
for advertising or model training, and never shared with other sellers. Tokens are
encrypted at rest and deleted the moment a shop is disconnected. Sellers can export or
erase everything from their dashboard.

WrL integrates with Etsy only. Features we have not built are listed publicly at
https://wearelucky.io.vn/features so nobody signs up expecting them.

Website: https://wearelucky.io.vn
Privacy Policy: https://wearelucky.io.vn/privacy
Terms (incl. required Etsy disclaimer): https://wearelucky.io.vn/terms
Scopes and endpoints in detail: https://wearelucky.io.vn/platforms
```

**Website URL**
```
https://wearelucky.io.vn
```

**Callback URL**
```
https://wearelucky.io.vn/api/integrations/etsy/callback
```

**App type** → Seller Tools (không tick Buyer Tools)
**Users** → The general public
**Commercial** → Yes
**Will your app do any of the following?** → chỉ tick **Read sales data**

---

## Nếu bị từ chối lần nữa

Trả lời thư từ chối và hỏi thẳng điều gì chưa đạt — địa chỉ `developer@etsy.com`. §2 cho
phép Etsy yêu cầu thêm thông tin, nên hỏi lại là hợp lệ.

Phương án dự phòng: giữ **Personal Access** đang có, dùng cho chính shop của bạn, tích luỹ
sử dụng thật rồi xin commercial sau — lúc đó có dữ liệu vận hành thật để chứng minh, thay
vì chỉ có lời hứa.

---

## Rate limit

App `dkh-order-manager-application` (Personal Access) đang ở **5 QPS / 5K QPD** — thấp hơn
mức 10/10K của tài liệu công khai. `src/lib/sync.ts` đồng bộ tuần tự theo từng
shop và ghi mọi lần chạy vào bảng `SyncJob`. Khi có nhiều seller nên chuyển sync sang hàng
đợi nền và thêm backoff khi gặp HTTP 429.
