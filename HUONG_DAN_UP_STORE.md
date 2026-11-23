# Hướng Dẫn Đóng Gói & Đưa App LotoAI Pro Lên CH Play (Android) & App Store (iOS)

Toàn bộ dự án tại `C:\Users\tkqua\.gemini\antigravity\scratch\loto-ai-pro` đã được cấu hình sẵn sàng với **Ionic Capacitor** (`package.json`, `capacitor.config.json`, thư mục đóng gói `www/`, icon chuẩn `512x512`, trang `privacy-policy.html` và workflow tự động build trên đám mây).

---

## PHẦN 1: 2 Cách Đóng Gói Ra File Cài Đặt (`.AAB` / `.APK` / `.IPA`)

### Cách 1: Tự động Build miễn phí trên Đám Mây bằng GitHub Actions (Không cần cài Android Studio hay máy Mac)
Tôi đã tạo sẵn file cấu hình tự động tại `.github/workflows/build-mobile.yml`.
1. Tạo 1 repository mới trên GitHub và đẩy thư mục `loto-ai-pro` này lên.
2. Vào tab **Actions** trên GitHub $\rightarrow$ Bấm chạy workflow **Build Android (.AAB/.APK) & iOS App**.
3. Sau khoảng 3 phút, GitHub sẽ tự động xuất ra 3 gói tải về ở mục **Artifacts**:
   * `LotoAI-Pro-Android-APK`: File `.apk` để cài thử trực tiếp vào điện thoại Android.
   * `LotoAI-Pro-GooglePlay-AAB`: File `.aab` để upload lên Google Play Console (CH Play).
   * `LotoAI-Pro-iOS-Xcode-Project`: Thư mục project Xcode hoàn chỉnh cho iOS.

### Cách 2: Build trực tiếp trên máy tính của bạn bằng Capacitor CLI
Mở Terminal tại thư mục `C:\Users\tkqua\.gemini\antigravity\scratch\loto-ai-pro` và chạy:

```bash
# 1. Cài đặt thư viện Capacitor
npm install

# 2. Đóng gói web vào thư mục www/ và tạo project Android
npm run android:add

# 3. Mở bằng Android Studio để ký Keystore và xuất file .AAB / .APK
npm run android:open
```
Trong **Android Studio**: Vào menu **Build $\rightarrow$ Generate Signed Bundle / APK $\rightarrow$ Chọn Android App Bundle (.aab)** $\rightarrow$ Tạo mới 1 file Keystore (`.jks`) và lưu mật khẩu lại $\rightarrow$ Bấm **Create** để lấy file `app-release.aab`.

---

## PHẦN 2: Cách Đưa Lên CH Play (Google Play Store)

1. **Đăng ký tài khoản Developer:**
   * Truy cập [Google Play Console](https://play.google.com/console).
   * Phí đăng ký: **\$25 USD** (trả 1 lần duy nhất bằng thẻ Visa/Mastercard).
   * Xác minh danh tính bằng CCCD/Hộ chiếu.

2. **Tạo ứng dụng mới:**
   * Bấm **Create app (Tạo ứng dụng)**.
   * **Tên ứng dụng:** `LotoAI Pro - Thống Kê Xổ Số`
   * **Ngôn ngữ mặc định:** Tiếng Việt.
   * **Loại:** Ứng dụng (App) $\rightarrow$ Miễn phí (Free).

3. **Khai báo Chính sách & Nội dung (Rất quan trọng để được duyệt nhanh):**
   * **Privacy Policy (Chính sách quyền riêng tư):** Upload file `privacy-policy.html` lên GitHub Pages (hoặc hosting của bạn) và dán đường link vào.
   * **Data Safety (An toàn dữ liệu):** Chọn *"Không, ứng dụng của tôi không thu thập hay chia sẻ bất kỳ dữ liệu cá nhân nào của người dùng"*.
   * **App Category (Danh mục):** Chọn **Công cụ (Tools)** hoặc **Giải trí (Entertainment)** — **TUYỆT ĐỐI KHÔNG** chọn danh mục *"Cờ bạc / Casino (Gambling)"*.
   * **Target Audience (Độ tuổi mục tiêu):** Chọn **18 tuổi trở lên (18+)** vì có liên quan đến tra cứu kết quả xổ số.

4. **Tải file `.aab` lên và Phát hành:**
   * Vào mục **Testing $\rightarrow$ Closed testing** (hoặc **Production / Bản chính thức**).
   * Bấm **Create new release** $\rightarrow$ Kéo thả file `app-release.aab` vào $\rightarrow$ Bấm **Save & Publish**.

---

## PHẦN 3: Cách Đưa Lên Apple App Store (iOS)

Vì bạn đang dùng máy **Windows**, để đưa lên App Store có 2 bước:

1. **Đăng ký tài khoản Apple Developer:**
   * Truy cập [Apple Developer Program](https://developer.apple.com/programs/).
   * Phí duy trì: **\$99 USD / năm**.

2. **Xuất file `.ipa` và đẩy lên App Store Connect (Từ máy Windows):**
   * Dùng dịch vụ Cloud Build liên kết với GitHub như **Codemagic.io** hoặc **Ionic Appflow / VoltBuilder** (hỗ trợ gói miễn phí/dùng thử máy ảo Mac trên đám mây).
   * Kết nối tài khoản Apple Developer của bạn vào Codemagic $\rightarrow$ Chọn nhánh GitHub chứa dự án này $\rightarrow$ Codemagic sẽ tự chạy `npx cap sync ios`, ký chứng chỉ Apple (`Provisioning Profile`) và đẩy thẳng bản build lên **App Store Connect / TestFlight** mà bạn không cần mua máy Mac.

---

## PHẦN 4: Mẹo Vượt Qua Kiểm Duyệt (Review Guidelines) Cho App Xổ Số
Cả Google và Apple đều kiểm duyệt rất kỹ các app có chữ "Xổ số / Loto". Để đậu 100% ngay lần đầu:
1. **Mô tả trên Store:** Dùng thuật ngữ **"Tra cứu kết quả Xổ số kiến thiết & Phân tích thống kê xác suất toán học (Tần suất, Chuỗi Markov, Kiểm định Chi-Square)"**.
2. **Tránh từ nhạy cảm:** Trong phần mô tả trên Store, không viết các từ mang tính chất rủ rê cá cược tiền thật như *"đánh lô đề chắc thắng 100%"*, *"nhà cái"*, *"nạp rút"*.
3. **Giữ nguyên phần Footer miễn trừ trách nhiệm:** Trong file `index.html` và `privacy-policy.html` tôi đã gắn sẵn dòng tuyên bố tuân thủ chuẩn Google Play & App Store (Điều khoản 5.3).
