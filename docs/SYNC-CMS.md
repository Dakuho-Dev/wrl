# Đồng bộ Etsy → WrL → CMS Dakuho

WrL là trung gian: nó giữ token Etsy và tài khoản tra vận đơn, còn CMS chỉ nhận
một dòng đã xử lý sẵn cho mỗi đơn hàng.

```
Etsy Open API v3 ───────┐
USPS API (đơn USPS) ────┼── WrL (Next.js, Vercel + Neon) ── POST /order-info/sync ──> apiserver.dakuho.com ──> CMS /order-info
Track17 Agent (còn lại) ┘
```

## 1. Vì sao phải tự tra vận đơn

Etsy **không** trả về trạng thái vận chuyển qua API. Kiểm tra trực tiếp trong
OpenAPI spec chính thức (`https://www.etsy.com/openapi/generated/oas/3.0.0.json`):

- `ShopReceiptShipment` chỉ có 4 trường: `receipt_shipping_id`,
  `shipment_notification_timestamp`, `carrier_name`, `tracking_code`.
- `ShopReceipt.status` chỉ nhận: `paid`, `completed`, `open`,
  `payment processing`, `canceled`, `fully refunded`, `partially refunded`.
- Ngoài ra chỉ có hai cờ `is_paid` / `is_shipped`.

Chữ "Pre-transit" mà seller thấy trên etsy.com là do Etsy tự tra hãng vận chuyển
rồi hiển thị, không nằm trong API công khai. Nên WrL lấy `carrier_name` +
`tracking_code` từ Etsy, rồi tự tra trạng thái.

### Hai làn tra vận đơn

Đo trên dữ liệu thật (467 đơn đã có mã): USPS 376 mã (80,5%), còn lại 91 mã chia
cho 9 hãng — DHL 67, Yanwen 12, YunExpress 4, UniUni 3, UPS 2, OnTrac / UDS / SPX
mỗi hãng 1. Hai nhóm này được xử lý khác nhau:

| Làn | `Shipment.trackerProvider` | Ai tra | Chạy khi nào |
|---|---|---|---|
| USPS | `USPS` | **Track17 Agent** đọc trạng thái Etsy tự hiển thị trên trang đơn của người bán | Khi có người mở app |
| Còn lại | `MANUAL` | **Track17 Agent** dán mã vào ô tìm kiếm của 17track.net, 40 mã một lượt | Khi có người mở app |

Code gọi API của USPS (`src/lib/usps.ts`) vẫn còn và chạy được — chỉ cần điền
`USPS_CLIENT_ID` / `USPS_CLIENT_SECRET` là làn USPS quay về máy chủ, chạy 24/7,
và làn Etsy thành phương án dự phòng. Chưa điền thì bước đó tự bỏ qua.

Làn nào lo một vận đơn được quyết định **một lần**, lúc ghi shipment
(`trackerProviderFor()` trong `src/lib/shipment-status.ts`): hình dạng mã vận đơn
xét trước, vì người bán hay chọn "Other" rồi tự gõ tên hãng.

Không dùng API của 17TRACK nữa: họ từ chối đăng ký mọi mã USPS
(`-18019823: due to the policy restrictions of the carrier 'USPS'`) nếu chưa mua
gói trả phí — mà USPS lại là 80% số đơn.

### Đã đo: USPS chặn hết đường miễn phí (28/09/2026)

Kiểm chứng trực tiếp bằng hai mã USPS thật (`9214…5691142`, `9214…5689798`):

| Đường | Kết quả |
|---|---|
| API 17TRACK | `-18019823` — từ chối đăng ký mã USPS, đòi mua gói |
| **Trang web** 17track.net | `Not found` + *"Access Restricted — Due to incomplete tracking of the USPS policy change, please upgrade your account"* |
| parcelsapp.com | *"No information about your package."* |
| tools.usps.com/tracking/ | Akamai Bot Manager — trình duyệt tự động chỉ nhận trang trắng, `document.body` rỗng, không có ô nhập nào |

Nói cách khác, USPS đã cắt nguồn của các trang tra cứu trung gian, còn trang của
chính USPS thì chặn tự động hoá. Ba mã DHL thật (`GFUS…`) tra cùng lúc thì trả về
`Delivered` đầy đủ — **làn không phải USPS vẫn chạy tốt**.

**Đã chốt:** làn USPS đọc trạng thái từ **trang đơn của chính Etsy**. Chữ
"Pre-transit" người bán thấy ở
`https://www.etsy.com/your/shops/me/orders/completed` chính là kết quả Etsy đã tự
tra hãng vận chuyển — nó chỉ không có trong API công khai. Đây cũng là đúng những
chữ mà CMS đang được đối chiếu với.

## 2. Luồng chạy theo lịch

`GET /api/cron/sync` — Vercel cron chạy 1 lần/ngày lúc 01:00 UTC (giới hạn gói Hobby), cộng server NestJS của CMS gọi mỗi giờ (xem mục 7):

1. **Kéo đơn** — với mỗi shop Etsy đang bật `autoSync`: `syncShop(shop, "ORDERS")`.
   Dùng `min_last_modified` nên chỉ đọc các receipt thay đổi kể từ lần chạy trước
   (lùi lại 1 giờ để không sót receipt đổi ngay trong lúc chạy).
   Shipment được ghi vào bảng `Shipment` với `status = LABEL_CREATED`.
2. **Tra vận đơn USPS** — `refreshTracking()`: lấy các shipment
   `trackerProvider = USPS` chưa ở trạng thái cuối, cũ nhất trước, hỏi API của
   USPS từng mã một rồi cập nhật `status`, `subStatus`, `lastEvent`,
   `deliveredAt`. Mã bị USPS trả 400/404 được chuyển sang làn `MANUAL` — gần như
   luôn là vận đơn không phải USPS lọt qua bộ phân loại. Kết quả trả về cũng kèm
   `manualQueue`: số vận đơn đang chờ app local.
3. **Đẩy về CMS** — `pushOrdersToCms()`: gửi các đơn có `cmsPushedAt = null`
   theo lô 200 dòng tới `POST /order-info/sync`.

**Ngân sách thời gian.** Vercel cắt function ở giây 300, và một lượt bị cắt thì
không kịp ghi kết quả (shop sẽ kẹt ở SYNCING). Vì vậy mỗi lượt tự dừng sớm:
kéo đơn tới giây 170, tra vận đơn tới giây 240, phần còn lại để đẩy CMS. Receipt
được xử lý theo thứ tự cũ → mới, và vị trí đã xử lý tới được lưu vào
`Shop.receiptsCursor` (cứ 20 đơn lưu một lần), nên lượt sau chạy tiếp đúng chỗ
đó chứ không làm lại từ đầu. Kết quả trả về có `complete: false` khi một shop
chưa xong trong lượt này. Job `RUNNING` quá 6 phút được coi là đã chết và tự
đánh dấu `FAILED`.

Lượt sync đầu tiên khi kết nối shop chạy nền (`after()`) sau khi đã chuyển trang,
nên người bấm Allow không phải chờ và không gặp lỗi 504.

`cmsPushedAt` đóng vai trò hộp thư đi: cả bước kéo đơn lẫn bước tra vận đơn đều
set lại `null` mỗi khi đơn thay đổi, nên CMS luôn nhận được trạng thái mới nhất.

Chạy tay — endpoint trả lời ngay (`202`, `"started": true`) rồi chạy nền, vì
một lượt mất vài phút mà proxy Oneshield trước tên miền chỉ chờ khoảng 1 phút:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://wearelucky.io.vn/api/cron/sync
```

Xem kết quả lượt chạy gần nhất (vài phút sau):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://wearelucky.io.vn/api/cron/sync?status=1"
```

Mỗi lần chỉ một lượt chạy (khoá trong bảng `Setting`, key `cron.sync.lock`, tự
hết hạn sau 6 phút). Gọi trong lúc đang chạy sẽ nhận `"started": false`.
Kết quả có mục `db` gồm `functionRegion`, `dbRegion`, `roundTripMs`. Nếu hai vùng
khác nhau, mỗi truy vấn mất hàng trăm ms và sync chậm đi hàng chục lần.

## 3. Bảng trạng thái

| Mã trong DB | USPS `statusCategory` | 17track | Hiển thị trên CMS |
|---|---|---|---|
| `LABEL_CREATED` | (chưa tra) | (chưa tra) | Đã tạo nhãn |
| `PRE_TRANSIT` | `Pre-Shipment` | `InfoReceived` | Chờ lấy hàng (Pre-transit) |
| `IN_TRANSIT` | `In Transit` | `InTransit` | Đang vận chuyển (In-transit) |
| `AVAILABLE_FOR_PICKUP` | `Available for Pickup` | `AvailableForPickup` | Chờ nhận tại điểm |
| `OUT_FOR_DELIVERY` | `Out for Delivery` | `OutForDelivery` | Đang giao |
| `DELIVERY_FAILURE` | `Alert` (giao hụt) | `Undelivered` | Giao thất bại |
| `DELIVERED` | `Delivered` | `Delivered` | Đã giao |
| `EXCEPTION` | `Alert` | `Exception` | Sự cố |
| `EXPIRED` | — | `Expired` | Quá hạn theo dõi |
| `NOT_FOUND` | (404) | `NotFound` | Chưa có dữ liệu |

Cả hai nguồn đều dùng chung `statusFromText()` trong `src/lib/shipment-status.ts`,
nên hai làn không bao giờ nói hai thứ tiếng khác nhau.

`DELIVERED` và `EXPIRED` là trạng thái cuối — không tra tiếp.

## 4. Biến môi trường

Trên WrL (Vercel):

| Biến | Ý nghĩa |
|---|---|
| `USPS_CLIENT_ID` / `USPS_CLIENT_SECRET` | Đăng ký app ở https://developer.usps.com → thêm API "Tracking" → lấy Consumer Key / Secret |
| `MANUAL_TRACKING_TOKEN` | Mật khẩu chung cho Track17 Agent (header `x-agent-token`) |
| `MANUAL_RECHECK_HOURS` | Tra lại một mã sớm nhất sau bao nhiêu giờ. Mặc định 6 |
| `CMS_BASE_URL` | Mặc định `https://apiserver.dakuho.com` |
| `CMS_SYNC_TOKEN` | Phải trùng `ORDER_SYNC_TOKEN` của server CMS |
| `CMS_ORDERS_DRY_RUN` | Đặt `1` để chỉ *báo cáo* sẽ đẩy gì, không gửi và không đánh dấu gì. Dùng một lần để đối chiếu luật lọc personalization với tab Etsy trước khi tạo dòng thật |
| `CMS_ORDERS_BASE_URL` | Chỉ đặt khi endpoint `/order/sync` còn nằm ở server khác (ví dụ máy dev qua tunnel). Bỏ trống thì đi theo `CMS_BASE_URL`. **Đừng** đổi `CMS_BASE_URL` để test, vì nó kéo cả luồng `/order-info` đang chạy tốt sang theo |
| `CRON_SECRET` | Vercel gửi kèm `Authorization: Bearer ...` khi chạy cron |
| `SYNC_BACKFILL_DAYS` | Lần sync đầu của một shop chỉ kéo đơn trong N ngày gần nhất. Mặc định 30 |
| `TRACK_WINDOW_DAYS` | Chỉ tra vận đơn gửi trong N ngày gần nhất. Mặc định 30 |

Trên server CMS (`Dakuho.com/server`):

| Biến | Ý nghĩa |
|---|---|
| `ORDER_SYNC_TOKEN` | Bắt buộc. Chưa đặt thì `/order-info/sync` trả 401 với mọi request. |
| `WRL_CRON_SECRET` | Trùng `CRON_SECRET` của WrL. Bật lượt đồng bộ mỗi giờ. |
| `WRL_SYNC_URL` | Tuỳ chọn, mặc định `https://wearelucky.io.vn/api/cron/sync` |

Không có `USPS_CLIENT_ID` / `USPS_CLIENT_SECRET` thì bước tra USPS tự bỏ qua (có
ghi lý do trong kết quả trả về của cron), đơn hàng vẫn được kéo và đẩy về CMS
bình thường, chỉ thiếu cột trạng thái vận chuyển. Không có
`MANUAL_TRACKING_TOKEN` thì hai endpoint của app local trả 401 với mọi request.

## 5. Điều kiện để một shop chảy dữ liệu

- Shop phải được kết nối OAuth trong WrL (`Dashboard → Shops → Connect Etsy shop`).
  Mỗi shop Etsy phải kết nối riêng một lần.
- `autoSync` bật, `status` khác `DISCONNECTED`.
- Token Etsy tự refresh trước hạn 5 phút; nếu người bán thu hồi quyền thì shop
  chuyển sang `ERROR` và cron bỏ qua shop đó, các shop còn lại vẫn chạy.

## 6. Ghi đè dữ liệu ở CMS

`POST /order-info/sync` upsert theo `orderId` (chính là Etsy `receipt_id`, cũng
là số đơn seller nhìn thấy). Service chỉ ghi đè bằng **giá trị khác rỗng**, nên
hai nguồn không xoá dữ liệu của nhau: Chrome extension có số điện thoại người mua
(CSV của Etsy có, API thì không), WrL có tracking — cùng ghi vào một dòng.

## 7. Giới hạn đã biết

- **Số điện thoại người mua**: Etsy API không trả về. Muốn có thì vẫn phải dùng
  Chrome extension tải CSV như hiện nay.
- **Lịch cron**: gói Hobby của Vercel chỉ cho cron chạy 1 lần/ngày, nên
  `vercel.json` đặt `0 1 * * *` (08:00 giờ VN). Lượt mỗi giờ do server NestJS của
  CMS kích hoạt: `WrlSyncTriggerService` (`server/src/modules/order-info/`) chạy
  `@Cron` phút thứ 5 mỗi giờ, gọi `GET /api/cron/sync` với `WRL_CRON_SECRET`
  (trùng `CRON_SECRET` của WrL). Chưa đặt biến đó thì job tự tắt.
  Nâng lên Vercel Pro thì có thể đổi lịch Vercel thành `0 * * * *` và bỏ
  `WRL_CRON_SECRET` khỏi server.
- **Đơn không phải USPS cần có người mở app**: làn `MANUAL` chỉ chạy khi Track17
  Agent đang mở. Hàng đợi không mất đi — số chờ hiện trong `manualQueue` của mỗi
  lượt cron. Muốn tự động hoàn toàn thì mua gói trả phí của 17TRACK rồi chuyển
  làn đó về máy chủ.
- **Tốc độ USPS**: API của USPS chỉ nhận một mã mỗi lần gọi, cách nhau 150ms, nên
  mỗi lượt cron giới hạn 200 mã. Với ~376 mã USPS và lịch chạy mỗi giờ thì thừa sức.

## 8. Hai bảng ở CMS, hai đường đẩy

WrL nuôi **hai** bảng khác nhau trong CMS, mỗi bảng một dấu hộp thư đi riêng nên
một bên hỏng không kéo bên kia theo:

| Trang CMS | Bảng | Endpoint | Dấu hộp thư |
|---|---|---|---|
| `/order-info` — Thông tin chi tiết đơn hàng | `order_info` | `POST /order-info/sync` | `Order.cmsPushedAt` |
| `/order` — Danh sách đơn hàng | `order` + `product` | `POST /order/sync` | `Order.cmsOrderPushedAt` |

Trang `/order` trước đây do Chrome extension điền tay. Giờ WrL lấy thẳng từ Etsy
API, **chỉ đơn có personalization** — đúng phần việc xưởng phải đọc rồi làm, bỏ
qua đơn "New" thường.

### Đối chiếu trường với extension

Payload gửi lên giữ nguyên hình dạng extension vẫn gửi, để trang CMS không phải sửa:

| Trường CMS | Nguồn Etsy API |
|---|---|
| `shopInfo.shopName` / `shopTitle` | Tên shop trong WrL |
| `shopInfo.shopImgSrc` | Icon kênh Etsy (extension cũng để cố định) |
| `orderCode` | `#` + `receipt_id` |
| `customerName` | `receipt.name` |
| `customerNote` | `receipt.message_from_buyer` |
| `customerImgSrc` | **Không có** — Etsy API không trả avatar người mua |
| `products[].productName` | `transaction.title` |
| `products[].productImgSrc` | `Product.imageUrl` nối theo `listingId` (từ lượt sync listing) |
| `products[].etsyLink` | `etsy.com/listing/{listing_id}` (extension còn không gửi) |
| `products[].sku` | `transaction.sku` |
| `products[].quantity` | `transaction.quantity` |
| `products[].personalization` | `OrderItem.detailBlock` — mọi `variations` dạng `Label: value`, mỗi dòng một field |
| `products[].productDescription` | `""` (extension cũng để trống) |

`detailBlock` được lưu nguyên khối lúc sync chứ không ghép lại từ hai cột
`variation` / `personalization`, vì phép tách kia làm mất nhãn Etsy đặt
("Size (inches)", "Please enter"…) — mà chính những nhãn đó là thứ trang CMS hiển thị.

### Đơn nào được coi là "Personalization"

Đơn có ít nhất một transaction mang variation tên khớp `personali[sz]` hoặc
`please enter`, giá trị khác rỗng và **không phải** "Not requested on this item."
(xem `hasPersonalization()` và `isPersonalizedOrder()`). Đây đúng là luật mà
extension đang áp: nó bỏ qua sản phẩm có personalization ghi "Not requested".

Đơn được kéo về nhưng không có personalization vẫn bị đánh dấu đã đẩy, để lượt sau
không phải đọc lại — số lượng báo trong `cmsOrders.notPersonalized`.

## 9. Track17 Agent (app local, cả hai làn)

Mã nguồn: `C:/Users/PC/Projects/track17-agent` (Electron, xem README trong đó).
Cả 4 endpoint xác thực bằng header `x-agent-token` (= `MANUAL_TRACKING_TOKEN`).

**Làn 17track** — hãng không phải USPS:

| Endpoint | Việc |
|---|---|
| `GET /api/tracking/manual/pending?limit=40` | Trả tối đa 40 mã và **giữ chỗ** 10 phút (`Shipment.trackerClaimedAt`) |
| `POST /api/tracking/manual/results` | Nhận `{ results: [{ trackingNumber, status?, statusText?, lastEvent?, lastEventAt?, carrier? }] }` |

App đọc kết quả bằng cách chép lại đúng phản hồi mà trang 17track tự gọi
(`POST t.17track.net/track/restapi`, qua kênh DevTools của cửa sổ), và chỉ đọc chữ
trên trang khi không bắt được phản hồi nào.

Giữ chỗ hết hạn sau 10 phút nên nếu nhân viên tắt app giữa chừng thì không phải
dọn gì; mã tự quay lại hàng đợi.

**Làn Etsy** — phần còn lại, gồm USPS:

| Endpoint | Việc |
|---|---|
| `GET /api/tracking/etsy/plan` | Trả danh sách shop kèm số vận đơn đang chờ, để app biết cần mở cửa sổ Etsy nào |
| `POST /api/tracking/etsy/results` | Nhận `{ orders: [{ orderId, statusText, trackingNumber?, carrier? }] }`, khớp theo `Order.externalId` |

Mỗi shop một phiên đăng nhập Etsy riêng (một `persist:` partition riêng trong
app), nhân viên tự đăng nhập một lần cho mỗi shop. App không bao giờ tự gõ mật khẩu.

**Hai làn không tranh nhau.** Làn Etsy bỏ qua vận đơn `trackerProvider = MANUAL`
đã có trạng thái thật, vì Etsy chỉ cho một nhãn tổng còn 17track cho cả hành
trình — và mỗi lần ghi lại đẩy vận đơn xuống cuối hàng đợi của làn kia.

Áp một kết quả vào DB (làn nào cũng vậy) sẽ xoá `cmsPushedAt` của đơn, nên lượt
cron kế tiếp tự đẩy sang CMS — app không bao giờ nói chuyện trực tiếp với CMS.
