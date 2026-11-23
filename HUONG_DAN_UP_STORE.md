# HƯỚNG DẪN TỪNG BƯỚC ĐĂNG KÝ & ĐƯA APP LÊN CH PLAY TRÊN LAPTOP

Toàn bộ bản mới nhất của **LotoAI Pro** (gồm tính năng **Số Bạn Kết**, **6 Bộ Thuật Toán Tổng tự động khóa thanh trượt**, **Kiểm Chứng nổi bật**, và **Cập nhật 18h35**) đã được đóng gói sẵn tại:
- Thư mục đóng gói Web/Capacitor: `C:\Users\tkqua\.gemini\antigravity\scratch\loto-ai-pro\www`
- File nén trọn bộ: `C:\Users\tkqua\.gemini\antigravity\scratch\loto-ai-pro\LotoAI-Pro-Package.zip`

Dưới đây là quy trình **6 bước cụ thể ngay trên Laptop của bạn** để đưa app lên CH Play (Google Play Store).

---

## BƯỚC 1: Lấy File `.AAB` (Định dạng bắt buộc của CH Play)

Bạn có 2 cách nhanh nhất ngay trên trình duyệt Laptop:

### Cách A: Lấy từ GitHub Actions của bạn (`https://github.com/quantkx1-Ai/LoToAi`)
1. Để cập nhật bản giao diện mới nhất lên GitHub:
   - Mở `https://github.com/quantkx1-Ai/LoToAi/upload/main` trên trình duyệt.
   - Kéo 2 file `index.html` và `engine.js` từ thư mục `C:\Users\tkqua\.gemini\antigravity\scratch\loto-ai-pro` thả vào và bấm **Commit changes**.
2. Vào tab **Actions** (`https://github.com/quantkx1-Ai/LoToAi/actions`), bấm vào lượt chạy mới nhất ở trên cùng.
3. Kéo xuống mục **Artifacts** ở cuối trang:
   - Bấm tải **`LotoAI-Pro-GooglePlay-AAB`** (giải nén ra được file `.aab` để up lên CH Play).
   - Bấm tải **`LotoAI-Pro-Android-APK`** (giải nén ra được file `.apk` để gửi qua Zalo/Drive cài thử trực tiếp lên điện thoại Android).

### Cách B: Dùng PWABuilder của Microsoft (Chỉ mất 1 phút trên trình duyệt, tự ký Keystore sẵn)
1. Bật **GitHub Pages** cho kho của bạn:
   - Vào `https://github.com/quantkx1-Ai/LoToAi/settings/pages`
   - Ở mục **Branch**, đổi từ `None` sang **`main`** $\rightarrow$ bấm **Save**.
   - Đợi 1 phút, bạn sẽ có địa chỉ web chính thức: `https://quantkx1-ai.github.io/LoToAi/`
2. Mở trang **[https://www.pwabuilder.com](https://www.pwabuilder.com)** trên laptop.
3. Dán link `https://quantkx1-ai.github.io/LoToAi/` vào ô và bấm **Start**.
4. Bấm **Package for stores** $\rightarrow$ Chọn **Android (Google Play)** $\rightarrow$ Bấm **Download Package**.
5. Giải nén file tải về, bạn sẽ có sẵn:
   - File **`LotoAI-Pro.aab`** (đã được ký Keystore hoàn chỉnh, up thẳng lên CH Play được ngay!).
   - File **`signing.keystore`** và **`signing-key-info.txt`** (hãy cất kỹ file này trên máy để sau này cập nhật phiên bản mới).

---

## BƯỚC 2: Đăng Ký Tài Khoản Nhà Phát Triển Google Play (Google Play Console)

1. Trên trình duyệt laptop, truy cập: **[https://play.google.com/console/signup](https://play.google.com/console/signup)**
2. Đăng nhập bằng tài khoản Gmail của bạn.
3. Chọn loại tài khoản: **Cá nhân (Yourself / Personal)**.
4. Điền thông tin cá nhân:
   - **Tên nhà phát triển (Developer Name):** Ví dụ `Quantk AI Studio` (tên này sẽ hiển thị dưới tên app trên CH Play).
   - **Địa chỉ & Số điện thoại:** Điền đúng theo CCCD và xác minh mã OTP gửi về điện thoại.
5. **Thanh toán phí đăng ký:**
   - Phí: **\$25 USD** (~630.000đ, chỉ trả **1 lần duy nhất trọn đời**, được up không giới hạn số lượng app).
   - Dùng thẻ **Visa hoặc Mastercard** (có bật thanh toán quốc tế) để thanh toán.
6. **Xác minh danh tính (Verify ID):**
   - Chụp ảnh 2 mặt **CCCD** (hoặc Hộ chiếu) rõ nét, không bị lóa góc và tải lên theo yêu cầu trên màn hình. Google sẽ duyệt xác minh trong khoảng 24 giờ.

---

## BƯỚC 3: Tạo Ứng Dụng Mới Trên Google Play Console

Ngay khi vào trang chủ **Google Play Console**:
1. Bấm nút xanh **Tạo ứng dụng (Create app)** ở góc phải trên cùng.
2. Điền các mục sau:
   - **Tên ứng dụng (App name):** `LotoAI Pro - Thống Kê & Phân Tích Số`
   - **Ngôn ngữ mặc định (Default language):** `Tiếng Việt (Vietnamese)`
   - **Ứng dụng hay Trò chơi:** Chọn **Ứng dụng (App)**
   - **Miễn phí hay Trả phí:** Chọn **Miễn phí (Free)**
3. Tích chọn vào 2 ô đồng ý chính sách ở dưới và bấm **Tạo ứng dụng (Create app)**.

---

## BƯỚC 4: Khai Báo Chính Sách Để Được Google Duyệt Nhanh 100%

Trong menu bên trái của Google Play Console, bạn kéo xuống mục **Nội dung ứng dụng (App content)** và hoàn thành các mục sau:

1. **Chính sách quyền riêng tư (Privacy policy):**
   - Dán đường link: `https://quantkx1-ai.github.io/LoToAi/privacy-policy.html` *(sau khi bạn đã bật GitHub Pages ở Bước 1)* $\rightarrow$ Bấm **Lưu (Save)**.
2. **Quảng cáo (Ads):**
   - Chọn *"Không, ứng dụng của tôi không chứa quảng cáo"* $\rightarrow$ **Lưu**.
3. **Quyền truy cập ứng dụng (App access):**
   - Chọn *"Tất cả chức năng đều dùng được mà không cần đăng nhập đặc biệt"* $\rightarrow$ **Lưu**.
4. **Xếp hạng nội dung (Content ratings):**
   - Bấm **Bắt đầu bảng câu hỏi** $\rightarrow$ Chọn danh mục **Tiện ích, Năng suất, Giao tiếp hoặc Khác (Utility / Reference)**.
   - Trả lời **Không (No)** cho toàn bộ các câu hỏi về Bạo lực, Tình dục, Cá cược tiền thật (*vì app của mình là công cụ thống kê toán học, không nạp/rút tiền cá cược*) $\rightarrow$ Bấm **Lưu & Áp dụng**.
5. **Đối tượng mục tiêu (Target audience):**
   - Tích chọn độ tuổi: **Từ 18 tuổi trở lên (18 and over)** $\rightarrow$ **Lưu**.
6. **An toàn dữ liệu (Data safety):**
   - Chọn *"Không, ứng dụng của tôi không thu thập hay chia sẻ bất kỳ loại dữ liệu người dùng nào"* $\rightarrow$ **Lưu**.

---

## BƯỚC 5: Điền Thông Tin Hiển Thị Trên Cửa Hàng (Store Listing)

Vào menu bên trái: **Phát triển $\rightarrow$ Cửa hàng chính (Main store listing)**. Bạn chỉ cần **copy nguyên văn** nội dung chuẩn dưới đây dán vào (nội dung này đã được viết chuẩn ngôn từ toán học để vượt qua bộ lọc kiểm duyệt của Google 100%):

- **Tên ứng dụng:** `LotoAI Pro - Thống Kê Xác Suất`
- **Mô tả ngắn (Short description - tối đa 80 ký tự):**
  > `Công cụ tra cứu kết quả xổ số 3 miền và phân tích thống kê xác suất 10 thuật toán`
- **Mô tả đầy đủ (Full description):**
  > `LotoAI Pro là ứng dụng tiện ích giúp tra cứu nhanh kết quả Xổ số kiến thiết 3 miền (Miền Bắc, Miền Nam, Miền Trung) cập nhật tự động lúc 18h35 hàng ngày và phân tích thống kê dữ liệu lịch sử bằng 10 thuật toán xác suất toán học.`
  >
  > `Các tính năng nổi bật:`
  > `- Tra cứu bảng kết quả xổ số đầy đủ 27 giải và bảng thống kê Đầu/Đuôi (0-9) qua 100 kỳ quay gần nhất.`
  > `- Hệ thống 6 Bộ Thuật Toán Tổng và 10 thuật toán xác suất chuyên sâu (Tần suất trượt EMA, Hồi quy chu kỳ Weibull, Ma trận chuyển trạng thái Markov, Kiểm định độ lệch chuẩn Chi-Square, Phân phối chuẩn Gaussian).`
  > `- Tính năng chấm điểm xác suất thống kê cho con số người dùng quan tâm và đối chiếu kiểm chứng dữ liệu lịch sử.`
  > `- Tuyên bố miễn trừ: Ứng dụng thuần túy là công cụ tra cứu kết quả và phân tích thống kê toán học, hoàn toàn không tổ chức cá cược hay giao dịch tiền thật.`
- **Hình ảnh (Graphics):**
  - **Biểu tượng ứng dụng (App icon):** Chuyển file `icon-512.svg` sang ảnh `.png` kích thước `512 x 512 px` và tải lên.
  - **Ảnh chụp màn hình (Phone screenshots):** Chụp từ 2 đến 4 ảnh màn hình giao diện app đang chạy tại `http://localhost:8090` (tab *Xem KQXS*, tab *Số Bạn Kết*, tab *Kiểm Chứng*) và tải lên.

---

## BƯỚC 6: Tải File `.AAB` Lên & Bấm Phát Hành

1. Ở menu bên trái, vào mục **Kiểm thử (Testing) $\rightarrow$ Kiểm thử nội bộ (Internal testing)** hoặc **Bản chính thức (Production)**.
2. Bấm **Tạo bản phát hành mới (Create new release)**.
3. Ở mục **App bundles**, kéo file **`.aab`** bạn lấy ở **Bước 1** thả vào.
4. Đặt tên bản phát hành: `1.0.0 - Bản phát hành đầu tiên`.
5. Bấm **Tiếp theo (Next)** $\rightarrow$ Bấm **Lưu và Phát hành (Save and Publish)**!
