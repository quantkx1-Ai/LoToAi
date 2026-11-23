# Nối quảng cáo (AdMob) và thanh toán (Google Play Billing) cho LotoAI Pro

Lớp kiếm tiền đã xong ở phần web (`monetization.js`): dùng thử 7 ngày, khóa tính năng, màn hình mua gói, nút xem quảng cáo.
Phần còn lại là nối **quảng cáo thật** và **thanh toán thật** trong app Android. Hai việc này chỉ làm được sau khi tài khoản Google Play Console của bạn được Google duyệt xong (đang chờ xác minh giấy tờ).

## Cách app hiện hoạt động

| Giai đoạn | Quyền | Ghi chú |
|---|---|---|
| 7 ngày đầu | Dùng đủ mọi tính năng | Có banner quảng cáo |
| Sau 7 ngày | Chỉ Xem KQXS | Soi cầu bị khóa |
| Xem 1 quảng cáo thưởng | Mở khóa đến hết hôm nay (giờ VN) | Tắt bằng `ALLOW_AD_PASS_AFTER_TRIAL = false` để bắt buộc đăng ký |
| Đăng ký VIP | Mở khóa theo gói, tắt quảng cáo | 39.000đ/tháng, 99.000đ/3 tháng, 299.000đ/năm |

Giá, số ngày dùng thử và ID quảng cáo chỉnh ở đầu file `monetization.js` (mục `CONFIG`).

## Thử trên máy tính

Mở `http://localhost:8090/?dev=1`. Sẽ có bảng giả lập "Hết trial", "Còn 1 ngày", "Ngày 1", quảng cáo và thanh toán được mô phỏng.
Chế độ này **không bật** trong app đã đóng gói và trên trang web công khai, nên không ai nhận VIP miễn phí từ web.

## Việc 1: Quảng cáo AdMob

1. Tạo tài khoản tại https://admob.google.com (dùng cùng Gmail).
2. Thêm app Android, nhận **App ID** (`ca-app-pub-xxxxxxxx~yyyyyyyy`).
3. Tạo 2 đơn vị quảng cáo: **Banner** và **Rewarded (thưởng)**. Lấy 2 Ad Unit ID.
4. Dán 2 ID vào `CONFIG.ADMOB` trong `monetization.js`, đổi `isTesting` thành `false`.
5. Cài plugin: `npm i @capacitor-community/admob` rồi `npx cap sync android`.
6. **Bắt buộc**: thêm App ID vào `android/app/src/main/AndroidManifest.xml`, trong thẻ `<application>`:
   ```xml
   <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-xxxxxxxx~yyyyyyyy"/>
   ```
   Thiếu dòng này thì app sẽ tự thoát ngay khi mở.
7. Ghi chú: quy trình tự build trên GitHub hiện tạo thư mục `android/` mới mỗi lần, nên cần thêm một bước vá `AndroidManifest.xml` vào workflow, hoặc commit sẵn thư mục `android/`.

Mã đã có sẵn đoạn gọi plugin (`Capacitor.Plugins.AdMob`): hiện banner khi chưa là VIP, gọi quảng cáo thưởng khi người dùng bấm nút mở khóa.

## Việc 2: Gói VIP (Google Play Billing)

1. Trong Play Console, vào **Kiếm tiền → Sản phẩm → Gói đăng ký**, tạo 3 gói với đúng ID:
   `vip_monthly`, `vip_quarterly`, `vip_yearly`.
2. Cài một plugin thanh toán cho Capacitor (ví dụ RevenueCat hoặc plugin native-purchases). Chọn phiên bản hợp với Capacitor 6 trước khi cài.
3. Tạo cầu nối trong app (đặt trước khi trang tải), trả về đúng hình dạng sau:
   ```js
   window.LotoBillingBridge = {
     // Mua gói; trả về { success: true, expiresAt: <mili-giây> } nếu thành công
     purchase: async (planId) => { /* gọi plugin thanh toán */ },
     // Khôi phục giao dịch đã mua
     restore: async () => { /* gọi plugin thanh toán */ }
   };
   ```
4. Khi chạy thật, nên kiểm tra quyền VIP phía máy chủ hoặc dịch vụ như RevenueCat. Quyền VIP chỉ lưu trên máy sẽ dễ bị can thiệp.

## Những điều cần biết trước khi phát hành

- **Chính sách Google Play**: ứng dụng liên quan xổ số và "dự đoán" có thể bị xem xét kỹ hơn, đặc biệt khi thu tiền thuê bao cho phần dự đoán. Không có gì đảm bảo được duyệt. Mô tả cửa hàng nên nói rõ đây là công cụ thống kê, kết quả xổ số là ngẫu nhiên, và không dùng cách nói "chắc thắng", "nổ 100%".
- **Tỷ lệ "% nổ"**: đây là điểm số thống kê trên dữ liệu lịch sử, không phải xác suất thật. Kết quả xổ số độc lập, nên thuật toán nào cũng không dự đoán chính xác được. Nên giữ dòng miễn trừ trong app và trên cửa hàng, vì quảng bá sai lệch có thể bị Google gỡ app hoặc khóa tài khoản.
- **AdMob** cũng có chính sách riêng với nội dung liên quan cờ bạc. Nên đọc kỹ trước khi bật quảng cáo thật.
- **Dùng thử 7 ngày** lưu trên máy nên người dùng xóa dữ liệu app là bắt đầu lại được. Muốn chặt hơn, dùng ưu đãi "dùng thử miễn phí" ngay trong gói đăng ký của Google Play (người dùng phải có phương thức thanh toán).
- **Thuế và đối soát**: Google giữ 15% phí dịch vụ với gói đăng ký. Doanh thu về tài khoản ngân hàng khi đạt ngưỡng thanh toán của Google.
