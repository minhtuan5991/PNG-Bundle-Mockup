# PNG Bundle Mockup — lịch sử dự án và tài liệu bàn giao

> Cập nhật: 2026-08-06
> Phiên bản sẵn sàng phát hành: `1.2.0`
> Trạng thái: mã nguồn và tag `v1.2.0` đã lên GitHub; chỉ còn một Release stable ID `366240065`, có đủ ba update asset và release notes đã đồng bộ. Còn cần kiểm thử nâng cấp live `v1.2.0 → v1.2.1` trên máy/VM sạch.

## 1. Mục đích tài liệu

Tài liệu này là điểm bắt đầu cho người tiếp quản dự án sau khi lịch sử làm việc của Codex được dọn dẹp. Nội dung ghi lại chức năng, kiến trúc, dữ liệu được lưu trên máy người dùng, cách đóng gói, cơ chế cập nhật và các giới hạn quan trọng.

Các tài liệu liên quan:

- `docs/RELEASE-GUIDE.md`: quy trình đưa mã nguồn và bản phát hành lên GitHub.
- `docs/REGRESSION-CHECKLIST.md`: danh sách kiểm thử bắt buộc trước mỗi bản phát hành.
- `README.md`: hướng dẫn sử dụng và chạy dự án.

## 2. Thông tin nhanh

| Mục | Giá trị |
| --- | --- |
| Tên sản phẩm | PNG Bundle Mockup |
| Phiên bản hiện tại | `1.2.0` |
| Nền tảng phát hành | Windows x64 |
| Framework | Electron |
| Xử lý ảnh | Sharp |
| Bộ cài | electron-builder, NSIS |
| App ID | `com.pngbundle.mockup` |
| GitHub | `https://github.com/minhtuan5991/PNG-Bundle-Mockup` |
| Kênh cập nhật | GitHub Releases, channel `latest` |
| Thư mục đầu ra | `<thư mục PNG>/Done` |
| File lưu đường dẫn | `<app.getPath('userData')>/path-preferences.json` |

Không đổi `appId`, `productName` hoặc tên shortcut theo từng phiên bản. Các giá trị này phải ổn định để NSIS nhận diện đúng bản nâng cấp và để dữ liệu trong `userData` tiếp tục được sử dụng.

## 3. Chức năng đã có

### 3.1 Chọn và quản lý PNG nguồn

- Chọn một thư mục chứa PNG bằng hộp thoại hệ thống.
- Quét các file PNG trực tiếp trong thư mục đã chọn.
- Hiển thị gallery thumbnail trước khi nạp file vào giao diện chính.
- Tìm theo tên, chọn tất cả, bỏ chọn tất cả và chọn từng file.
- Báo rõ file hỏng hoặc file không thể đọc.
- Tự loại ảnh nền và watermark khỏi danh sách thiết kế nếu chúng nằm trong thư mục nguồn.

### 3.2 Bố cục mockup

- Chia đều số PNG vào số mockup do người dùng chọn.
- Phần dư được phân bổ lần lượt vào các nhóm đầu, ví dụ `31 / 2 = 16 + 15`.
- Tự tìm số hàng và cột phù hợp với vùng khả dụng của ảnh nền.
- Giữ nguyên tỉ lệ từng thiết kế.
- Dùng bounding box của pixel có alpha thay vì toàn bộ canvas trong suốt.
- Cho phép đặt khoảng cách giữa PNG, lề trên, lề dưới, lề ngang và ngưỡng alpha.
- Lề trên và dưới mặc định là `195 px`.
- Không đặt pixel thiết kế ra ngoài vùng lề hợp lệ.

### 3.3 Ảnh nền, preview và đầu ra

- Ảnh nền hỗ trợ PNG, JPG/JPEG, WEBP và TIFF.
- Kết quả giữ nguyên kích thước ảnh nền.
- Có preview bố cục trước khi tạo file cuối.
- Hỗ trợ preview và duyệt nhiều trang khi tạo nhiều mockup.
- Hiển thị tiến trình và cho phép hủy an toàn.
- Lưu kết quả vào thư mục `Done` bên trong thư mục PNG nguồn.
- Không ghi đè kết quả cũ; tên mới được thêm hậu tố khi cần.
- Không giữ file tạm khi thao tác bị hủy hoặc gặp lỗi.

### 3.4 Watermark

- Watermark phải thực sự là PNG, có kênh alpha và có ít nhất một pixel trong suốt.
- Watermark được ghép sau toàn bộ thiết kế nên luôn nằm trên lớp trên cùng.
- Watermark lớn hơn nền được thu nhỏ vừa nền, giữ tỉ lệ và căn giữa.
- Watermark nhỏ hơn nền không bị phóng lớn và giữ nguyên alpha/opacity gốc.
- Không cho dùng cùng một file làm ảnh nền và watermark.

### 3.5 Xóa metadata

Tùy chọn **Xóa Metadata** được bật mặc định. Khi bật, việc làm sạch diễn ra ở bước cuối, sau khi bố cục và watermark đã hoàn tất. App mã hóa lại PNG và xác minh không còn sáu nhóm:

1. Comment
2. EXIF
3. XMP
4. EXIF thumbnail
5. IPTC
6. ICC profile

Khi tùy chọn bị tắt, app cố gắng giữ metadata của ảnh nền trong giới hạn định dạng PNG đầu ra hỗ trợ. Metadata của PNG thiết kế và watermark không được trộn vào kết quả.

### 3.6 Trải nghiệm ứng dụng v1.2.0

- Ghi nhớ vị trí gần nhất của thư mục PNG, ảnh nền và watermark.
- Mở hộp thoại lần sau tại vị trí đã nhớ nếu đường dẫn còn hợp lệ.
- EXE và shortcut dùng icon ứng dụng; người dùng không cần `start-app.bat` sau khi cài.
- Tên trên cửa sổ và giao diện hiển thị `PNG Bundle Mockup v<version>` lấy từ `app.getVersion()`.
- Có bộ cài Windows, shortcut Desktop và Start Menu.
- Có nền tảng kiểm tra, tải và cài bản cập nhật từ GitHub Releases.

## 4. Thứ tự xử lý ảnh

Thứ tự này là hợp đồng chức năng và phải được giữ khi sửa engine:

1. Kiểm tra dữ liệu đầu vào và thông số lề.
2. Đọc metadata ảnh nền.
3. Tìm bounding box alpha thực của từng PNG nguồn.
4. Chia PNG thành các nhóm cân bằng.
5. Tính lưới, kích thước và vị trí từng PNG.
6. Composite thiết kế lên ảnh nền.
7. Composite watermark lên lớp trên cùng nếu được bật.
8. Xóa và xác minh sáu nhóm metadata nếu được bật.
9. Đổi tên file tạm sang tên kết quả cuối, không ghi đè file cũ.

## 5. Kiến trúc mã nguồn

| Thành phần | Trách nhiệm |
| --- | --- |
| `src/main.js` | Vòng đời Electron, BrowserWindow, IPC, hộp thoại hệ thống, thông tin app, điều phối tác vụ và dịch vụ nền. |
| `src/preload.js` | Cầu IPC giới hạn cho renderer; giữ `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. |
| `src/renderer/index.html` | Cấu trúc giao diện. |
| `src/renderer/styles.css` | Bố cục và giao diện trực quan. |
| `src/renderer/app.js` | State giao diện, picker thumbnail, preview, tạo mockup, trạng thái updater và thông báo người dùng. |
| `src/engine/layout.js` | Chia nhóm, chọn lưới và tính placement. |
| `src/engine/image-engine.js` | Alpha crop, resize, composite, watermark, metadata, file tạm và đầu ra. |
| `src/services/path-preferences.js` | Xác thực, đọc và ghi nguyên tử các đường dẫn gần nhất. |
| `src/services/update-service.js` | Bao bọc `electron-updater` thành state machine độc lập với renderer. |
| `test/*.test.js` | Kiểm thử layout, engine ảnh, persistence và updater. |
| `.github/workflows/ci.yml` | Chạy test và đóng gói unpacked trên Windows khi push/PR vào `main`. |
| `.github/workflows/release-windows.yml` | Kiểm tra tag, test, build NSIS và phát hành GitHub Release. |

### Luồng IPC chính

- Renderer yêu cầu chọn thư mục/file qua preload.
- Main mở hộp thoại với `defaultPath` lấy từ path preferences.
- Main kiểm tra file bằng engine trước khi ghi nhớ đường dẫn.
- Renderer gửi payload preview/generate; main quản lý một job hoạt động trên mỗi renderer.
- Main gửi tiến trình về renderer; renderer có thể yêu cầu hủy.
- Updater chạy ở main process; renderer chỉ nhận snapshot trạng thái tuần tự hóa được và gửi yêu cầu kiểm tra/tải/cài.

## 6. Persistence

### 6.1 Đường dẫn được ghi nhớ

File được lưu tại:

```text
path.join(app.getPath('userData'), 'path-preferences.json')
```

Schema hiện tại:

```json
{
  "schemaVersion": 1,
  "sourceFolder": "D:\\PNG Source",
  "templateFile": "D:\\Templates\\background.png",
  "watermarkFile": "D:\\Watermarks\\watermark.png"
}
```

Quy tắc:

- Chỉ lưu đường dẫn tuyệt đối và đúng loại file được hỗ trợ.
- Chỉ cập nhật sau khi người dùng chọn thành công và file/thư mục vượt qua kiểm tra.
- Hủy hộp thoại không thay đổi giá trị cũ.
- Nếu file đã bị di chuyển nhưng thư mục cha còn tồn tại, hộp thoại mở tại thư mục cha.
- Nếu file JSON thiếu, hỏng, sai schema hoặc đường dẫn không hợp lệ, app dùng mặc định an toàn và vẫn tiếp tục chạy.
- Ghi file theo cơ chế file tạm rồi rename để hạn chế file cấu hình dở dang.
- File này không được lưu trong thư mục cài đặt vì installer/update có thể thay thế nội dung thư mục cài.
- `deleteAppDataOnUninstall` đang là `false`, do đó tùy chọn được giữ khi nâng cấp hoặc cài lại. Không được xóa file này khi update.
- Việc nhớ đường dẫn chỉ đặt vị trí mở picker; app không tự nạp ảnh cũ và không tự bật watermark.

### 6.2 Thiết lập bố cục

Các giá trị `gap`, `topMargin`, `bottomMargin`, `sideMargin` và `alphaThreshold` được renderer lưu bằng localStorage với key `png-bundle-settings`. Đây là dữ liệu riêng với `path-preferences.json`.

## 7. Đóng gói Windows

### 7.1 Cấu hình chính

- Target: NSIS x64.
- Tên artifact: `PNG-Bundle-Mockup-Setup-${version}.exe`.
- Installer dạng assisted: `oneClick: false`.
- Cài theo người dùng: `perMachine: false`; không yêu cầu quyền admin trong trường hợp thông thường.
- Người dùng được đổi thư mục cài đặt.
- Desktop shortcut luôn được tạo; Start Menu shortcut được tạo.
- Icon installer, uninstaller, EXE và shortcut dùng `assets/app-icon.ico`.
- Chạy app sau khi cài nếu người dùng giữ lựa chọn mặc định.
- Chỉ giữ locale `vi` và `en-US` để giảm dung lượng.

### 7.2 Footprint sau khi cài

- `asar: true` đóng gói mã ứng dụng vào `app.asar`.
- Chỉ `sharp` và các binary `@img` cần thiết được unpack để native module hoạt động.
- `scripts`, `test`, `start-app.bat`, source tree rời, package lock và dependency phát triển không được đưa vào bộ cài.
- Các DLL, resource và file locale còn lại thuộc runtime Electron; không được tự ý xóa hoặc đặt thuộc tính Hidden vì có thể làm app, uninstaller hoặc updater hỏng.
- `win-unpacked`, `builder-debug.yml`, `builder-effective-config.yaml` và `*.nsis.7z` là file trung gian, không phải tài sản phát hành.

## 8. Cập nhật online qua GitHub

Provider được cấu hình là repository public:

```text
minhtuan5991/PNG-Bundle-Mockup
```

Một GitHub Release hợp lệ cho Windows updater cần tối thiểu:

- `PNG-Bundle-Mockup-Setup-<version>.exe`
- `PNG-Bundle-Mockup-Setup-<version>.exe.blockmap`
- `latest.yml`

Luồng dự kiến:

1. Chỉ kiểm tra update khi `app.isPackaged === true`.
2. Kiểm tra tự động sau khi app sẵn sàng; lỗi mạng không được chặn chức năng chính.
3. `autoDownload` là `false` để người dùng quyết định.
4. Khi có bản mới, giao diện hiển thị phiên bản và lựa chọn tải hoặc để sau.
5. Trong lúc tải, giao diện hiển thị tiến trình.
6. Khi tải xong, người dùng chọn khởi động lại để gọi `quitAndInstall`.
7. Có thể kiểm tra thủ công; trạng thái “đã mới nhất” chỉ cần hiện rõ cho kiểm tra thủ công.

Không nhúng `GH_TOKEN` vào ứng dụng. Repository public không cần token ở máy người dùng. `GH_TOKEN` chỉ được GitHub Actions dùng lúc upload release.

## 9. Giới hạn và lưu ý an toàn

### 9.1 Chưa ký code-signing

Bản phát hành hiện chưa có chứng thư code-signing thương mại:

- Windows SmartScreen có thể cảnh báo khi tải/cài.
- Publisher có thể hiển thị là Unknown Publisher.
- HTTPS và GitHub Releases không thay thế chữ ký mã cho chuỗi tin cậy của EXE.
- Khi có chứng thư, phải giữ publisher ổn định qua các bản cập nhật và kiểm thử lại updater.

Không được mô tả bản unsigned là đã được Windows xác thực.

### 9.2 Chuyển từ portable v1.1.0

`PNG-Bundle-Mockup-1.1.0-portable.exe` không chứa updater nên không thể tự nâng cấp sang NSIS v1.2.0. Người dùng v1.1.0 phải tải và chạy bộ cài v1.2.0 thủ công một lần. Cập nhật online chỉ có hiệu lực từ bản installer có updater trở đi.

Nếu tiếp tục cung cấp portable như tài sản phụ trong tương lai, phải ghi rõ portable không phải kênh auto-update chính.

### 9.3 Tính tương thích

- Bản phát hành chính hiện chỉ nhắm Windows x64.
- Không xóa runtime Electron khỏi thư mục cài để “làm gọn”.
- Không đổi app ID khi phát hành patch/minor.
- Không hạ version để rollback; updater dùng so sánh semver và không phải cơ chế downgrade.

## 10. Mốc kiểm thử

- Mốc automated ngay trước khi tích hợp updater: **20/20 đạt**.
- QA local cuối ngày 2026-08-06: **26/26 automated tests đạt**, không có skipped/todo.
- Renderer smoke trên mã nguồn đạt; smoke trên `win-unpacked` đạt cả màn hình chính và gallery chọn PNG.
- Smoke xác nhận title/header `PNG Bundle Mockup v1.2.0`, metadata bật mặc định, watermark API, updater API/UI, preview và picker.
- `npm audit --omit=dev --audit-level=high`: **0 vulnerabilities**.
- Build NSIS thành công và sinh đủ installer, blockmap, `latest.yml`; payload có `app-update.yml` đúng GitHub provider.
- Cài thử im lặng vào thư mục QA riêng đạt; shortcut Desktop/Start Menu trỏ đúng EXE và icon; app đã cài smoke exit `0`; uninstaller xóa sạch app cùng hai shortcut.
- SHA-256 installer build local: `271BDF3030AA2E38E89D3B64550E2954D9A4BB314B09D2A94663189E32087117`.
- SHA-256 installer hiện tại trên GitHub Release (CI build): `505BB85DA584F4003D74D1C687DC13AC2C05145AD20CAC70AA5B6FDD347E52F1`.
- Commit phát hành: `971d92d`; Windows CI và Release Windows đều đạt. Workflow publish được gia cố tại commit `6076701` và chạy lại thành công cho tag hiện có.
- Lượt workflow `31107747686` đã build/test đạt và thay đủ bộ asset đồng bộ, nhưng bước sửa metadata thất bại do GitHub có hai Release record cùng tag. Record trùng ID `366240066` đã được xóa theo phê duyệt; workflow an toàn tại commit `06a99a1` chuẩn bị notes trước publish, không ghi đè asset công khai và tách chế độ `sync-notes`. Lượt đồng bộ `31109541690` đạt; `/releases/latest`, tiêu đề và body đều trỏ/khớp Release chính ID `366240065`.
- Installer và app hiện **NotSigned**; vẫn nên kiểm thử giao diện installer bằng tài khoản standard trên máy/VM sạch và live update hai phiên bản trước khi phân phối rộng.

## 11. Lịch sử phiên bản

### v1.0.0

- Bản desktop nền tảng.
- Chọn PNG, ảnh nền, chia nhóm, tự bố trí lưới và xuất vào `Done`.
- Có bản portable Windows.

### v1.1.0

- Thêm gallery thumbnail để chọn PNG trước khi nạp.
- Thêm watermark PNG trong suốt trên lớp trên cùng.
- Thêm tùy chọn xóa sáu nhóm metadata ở bước cuối.
- Bổ sung kiểm thử watermark và metadata.

### v1.2.0

- Ghi nhớ đường dẫn của thư mục PNG, ảnh nền và watermark trong `userData`.
- Hiển thị phiên bản trong tên cửa sổ/giao diện.
- Chuyển kênh phát hành chính từ portable sang NSIS installer.
- Tạo Desktop và Start Menu shortcut với icon ứng dụng.
- Thu gọn nội dung đóng gói bằng ASAR, file filter và giới hạn locale.
- Thêm `electron-updater` và provider GitHub Releases.
- Thêm GitHub Actions cho CI và phát hành theo tag.
- Thêm tài liệu bàn giao, release guide và regression checklist.

## 12. Trạng thái chốt v1.2.0

- [x] Tích hợp update service với main/preload/renderer.
- [x] Chạy toàn bộ automated tests và ghi số lượng cuối.
- [x] Chạy renderer smoke test ngoài sandbox và trên payload đóng gói.
- [x] Kiểm tra version, icon metadata và footprint của payload `win-unpacked`.
- [x] Xác nhận installer, `latest.yml` và blockmap local cùng version.
- [x] Cập nhật README, tài liệu và SHA-256 installer.
- [x] Cài/chạy/gỡ NSIS local trong thư mục QA riêng; xác nhận hai shortcut và icon target.
- [ ] Lặp lại cài đặt tương tác bằng tài khoản standard user trên máy hoặc VM sạch.
- [x] Push source, tag `v1.2.0` và tạo GitHub Release stable công khai.
- [x] Xác minh Release có installer, blockmap và `latest.yml`; version, size và provider khớp.
- [x] Xóa đúng Release record trùng ID `366240066` (giữ tag và Release chính ID `366240065`) rồi chạy `sync-notes` thành công.
- [ ] Kiểm tra live update từ v1.2.0 lên một bản patch cao hơn; cần phát hành v1.2.1 để chạy end-to-end.
