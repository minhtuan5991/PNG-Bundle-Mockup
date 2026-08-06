# PNG Bundle Mockup — lịch sử dự án và tài liệu bàn giao

> Cập nhật: 2026-08-07
> Phiên bản mã nguồn hiện tại: `1.2.1`
> Bản stable hiện có: `v1.2.1`
> Trạng thái: tag và GitHub Release v1.2.1 đã publish stable/public với đúng ba asset; updater v1.2.0 nhận đúng thông báo v1.2.1. Windows CI bị hủy trước khi có runner trong incident GitHub Actions; fresh install và lượt download/cài nâng cấp tương tác vẫn chưa chạy.

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
| Phiên bản mã nguồn | `1.2.1` — đã phát hành stable/public |
| Nền tảng phát hành | Windows x64 |
| Framework | Electron |
| Xử lý ảnh | Sharp |
| Xử lý PDF | pdf-lib |
| Bộ cài | electron-builder, NSIS |
| App ID | `com.pngbundle.mockup` |
| GitHub | `https://github.com/minhtuan5991/PNG-Bundle-Mockup` |
| Kênh cập nhật | GitHub Releases, channel `latest` |
| Thư mục đầu ra | `<thư mục PNG>/Done` |
| Thư mục tài sản bổ sung | `Input` cạnh EXE; khi phát triển là `<project>/Input` |
| File lưu đường dẫn | `<app.getPath('userData')>/path-preferences.json` |
| File lưu vùng in | `<app.getPath('userData')>/single-mockup-regions.json` |

Không đổi `appId`, `productName` hoặc tên shortcut theo từng phiên bản. Các giá trị này phải ổn định để NSIS nhận diện đúng bản nâng cấp và để dữ liệu trong `userData` tiếp tục được sử dụng.

## 3. Chức năng đã có

### 3.1 Chọn và quản lý PNG nguồn

- Chọn một thư mục chứa PNG bằng hộp thoại hệ thống.
- Nhận nhiều PNG kéo trực tiếp từ File Explorer, kể cả từ nhiều thư mục; loại file trùng và chỉ tự chọn file đọc được.
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
- Lưu kết quả bundle vào thư mục `Done` bên trong thư mục PNG nguồn chính. Các output bổ sung của cùng lượt dùng chung thư mục này.
- Không ghi đè kết quả cũ; tên mới được thêm hậu tố khi cần.
- Không giữ file tạm khi thao tác bị hủy hoặc gặp lỗi.

### 3.4 Watermark

- Watermark phải thực sự là PNG, có kênh alpha và có ít nhất một pixel trong suốt.
- Watermark được ghép sau toàn bộ thiết kế nên luôn nằm trên lớp trên cùng của mockup bundle và mockup đơn.
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

### 3.7 Thư mục Input và PDF Download — phạm vi v1.2.1

- Bản đóng gói xác định `Input` cạnh file EXE; bản development dùng `Input` ở project root. App tạo thư mục nếu chưa tồn tại.
- `Input` có thể chứa một PDF mẫu cùng các ảnh mockup đơn. Hai bộ quét tách biệt theo phần mở rộng.
- Khi bật **Tạo PDF Download**, phải có đúng một file `.pdf` trong `Input` và URL nhập phải dùng HTTP hoặc HTTPS.
- Service chọn nhóm annotation cùng URL cũ, nhận diện vùng nút Download và các vùng link hiển thị, cập nhật URI/chuỗi accessibility liên quan rồi vẽ URL mới vừa vùng cũ.
- PDF kết quả giữ tên mẫu và dùng hậu tố `_2`, `_3`, ... khi trùng; file được lưu cùng thư mục `Done` với mockup.
- Runtime PDF dùng `pdf-lib`; không gọi Python hoặc công cụ PDF ngoài ở máy người dùng.
- Mỗi trang mang URL đích phải có đủ vùng nút và vùng link hiển thị; app cập nhật/vẽ lại từng trang hoặc từ chối template không rõ ràng.
- PDF kết quả được ghi vào file tạm cùng thư mục `Done`, `sync` rồi hard-link nguyên tử sang tên chưa tồn tại. Hủy/lỗi dọn cả file tạm và file final vừa commit.

### 3.8 Mockup đơn và vùng in — phạm vi v1.2.1

- Ảnh mẫu trực tiếp trong `Input` hỗ trợ PNG, JPG/JPEG, WEBP và TIFF.
- Vùng in được biểu diễn bằng toạ độ normalized và phải có tỷ lệ pixel `42:48` (`7:8`), nằm trọn trong ảnh mẫu.
- Người dùng chỉnh vùng in trên từng ảnh trong Preview và lưu toàn bộ cấu hình bằng nút **Lưu vùng in**.
- Store dùng tên file không phân biệt hoa/thường cùng kích thước ảnh để tra cứu. Nếu kích thước thay đổi, record cũ không được áp dụng và người dùng phải thiết lập lại.
- Mỗi ảnh mẫu sinh một output; PNG nguồn được xáo trộn ngẫu nhiên. Nếu cần nhiều output hơn số PNG duy nhất, service bắt đầu vòng xáo trộn mới và có thể dùng lại PNG.
- Thiết kế được crop theo alpha thật, resize `contain` vào vùng in và composite trên ảnh mẫu. Watermark, nếu bật, được composite cuối cùng.
- JPEG/TIFF được `autoOrient()` và dùng kích thước sau EXIF Orientation cho cả Preview, vùng in và output.
- Lưu lại danh sách template hiện có là batch upsert; record của template tạm vắng khỏi `Input` vẫn được giữ để dùng lại khi file quay lại.
- Output dùng tên `single_<tên ảnh mẫu>.png` và hậu tố tránh ghi đè.

### 3.9 Kéo-thả và quy tắc thư mục nguồn — phạm vi v1.2.1

- Renderer chỉ nhận `.png` có đường dẫn cục bộ từ File Explorer; giới hạn backend là 2.000 file mỗi lần thả.
- Có thể trộn PNG từ nhiều thư mục trong một danh sách. `sourceDirectories` theo dõi các thư mục đóng góp file.
- `sourceDirectory` hiện tại vẫn là nguồn quyết định `<sourceDirectory>/Done`. Nếu bắt đầu hoàn toàn bằng kéo-thả, thư mục của file hợp lệ đầu tiên trở thành nguồn chính.
- Ảnh nền và watermark tiếp tục bị loại khỏi tập thiết kế nếu trùng đường dẫn với PNG trong danh sách.

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

Sau khi bundle hoàn tất, một lượt v1.2.1 có thể tiếp tục theo thứ tự:

1. Tạo mockup đơn từ cùng tập PNG đã chọn; watermark vẫn là lớp cuối nếu được bật.
2. Tạo PDF Download từ PDF mẫu duy nhất trong `Input`.
3. Trả về một kết quả tổng hợp và mở cùng thư mục `Done`.

Nếu một bước bổ sung thất bại hoặc người dùng huỷ, main phải dọn các output đã tạo trong lượt hiện tại theo chính sách tác vụ nguyên tử. Cần kiểm thử hồi quy riêng cho hành vi này trước khi phát hành.

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
| `src/services/input-directory.js` | Xác định/tạo `Input` tại project root hoặc cạnh EXE đóng gói. |
| `src/services/input-backup-service.js` | Snapshot, mirror và khôi phục tài sản `Input` qua update/cài lại bằng marker và staging trong `userData`. |
| `src/services/dropped-png-files.js` | Chuẩn hoá, khử trùng và kiểm tra PNG kéo-thả từ File Explorer. |
| `src/services/pdf-download-service.js` | Tìm PDF mẫu, cập nhật link/annotation, vẽ URL mới và ghi PDF không đè file cũ. |
| `src/services/single-mockup-regions.js` | Kiểm tra vùng `7:8` và lưu cấu hình theo template trong `userData`. |
| `src/services/single-mockup-service.js` | Quét ảnh mẫu, chọn PNG ngẫu nhiên và composite mockup đơn. |
| `test/*.test.js` | Kiểm thử layout, engine ảnh, persistence, updater, Input, kéo-thả, PDF và mockup đơn. |
| `.github/workflows/ci.yml` | Chạy test và đóng gói unpacked trên Windows khi push/PR vào `main`. |
| `.github/workflows/release-windows.yml` | Kiểm tra tag, test, build NSIS và phát hành GitHub Release. |

### Luồng IPC chính

- Renderer yêu cầu chọn thư mục/file qua preload.
- Main mở hộp thoại với `defaultPath` lấy từ path preferences.
- Main kiểm tra file bằng engine trước khi ghi nhớ đường dẫn.
- Renderer gửi payload preview/generate; main quản lý một job hoạt động trên mỗi renderer.
- Main gửi tiến trình về renderer; renderer có thể yêu cầu hủy.
- Renderer gửi đường dẫn PNG kéo-thả để main kiểm tra bằng filesystem/Sharp trước khi nạp.
- Renderer đọc danh sách tài sản `Input`, gửi toàn bộ vùng in khi lưu và nhận lại trạng thái đã cấu hình theo template.
- Payload generate có thể yêu cầu thêm mockup đơn và PDF Download; main dùng cùng `outputDir` do engine bundle tạo.
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

### 6.3 Vùng in mockup đơn

Vùng in được lưu tại:

```text
path.join(app.getPath('userData'), 'single-mockup-regions.json')
```

Schema version 1 lưu `templateName`, `templateWidth`, `templateHeight` và vùng normalized `{ x, y, width, height }` cho từng template. File được ghi qua file tạm rồi rename. Record JSON hỏng bị bỏ qua an toàn; record không khớp kích thước ảnh hiện tại không được dùng. Cấu hình nằm trong `userData`, không nằm trong `Input` hoặc thư mục cài.

### 6.4 Snapshot tài sản Input

- `Input` vẫn nằm cạnh EXE theo yêu cầu giao diện, còn snapshot bền vững nằm tại `path.join(app.getPath('userData'), 'input-backup')`.
- Marker `.png-bundle-input-marker` cho biết thư mục hiện tại đã sống qua lần chạy trước. Marker còn thì app mirror cả sửa/xóa có chủ ý sang snapshot; marker mất sau update/cài lại thì snapshot được khôi phục đè lên bundled defaults.
- `README.txt` và marker không được coi là tài sản người dùng. Snapshot được thay bằng staging/previous để lần ghi bị gián đoạn không phá hỏng bản tốt trước đó.
- App đồng bộ ở startup, trước quét/lưu vùng in/tạo output bổ sung và ngay trước `quitAndInstall`.
- NSIS gọi chế độ headless `--sync-input-backup` ngay trước khi gỡ/cập nhật; uninstall bị dừng nếu EXE backup thiếu hoặc đồng bộ thất bại.
- App dùng single-instance lock: lần mở tương tác thứ hai chỉ khôi phục/đưa cửa sổ chính lên trước. Tiến trình `--sync-input-backup` thứ hai thoát `3` khi app đang chạy, và NSIS coi mã khác `0` là lỗi để update/uninstall fail-closed thay vì xóa `Input` khi chưa backup được.

## 7. Đóng gói Windows

### 7.1 Cấu hình chính

- Target: NSIS x64.
- Tên artifact: `PNG-Bundle-Mockup-Setup-${version}.exe`.
- Giữ installer assisted/install identity tương thích v1.2.0: `oneClick: false`, `perMachine: false`, `allowElevation: true`; không cho fresh install đổi thư mục (`allowToChangeInstallationDirectory: false`).
- Macro `customInstallMode` ép fresh install theo current-user/fixed writable path để `Input` mutable cạnh EXE có quyền ghi.
- Khi registry đã có v1.2.0, macro giữ nguyên install mode: bản All Users/custom path tiếp tục được nhận diện/nâng cấp tại chỗ thay vì tạo thêm bản HKCU; elevation chỉ còn phục vụ nhánh nâng cấp HKLM đó.
- `customInit` bỏ qua registry per-user stale nếu EXE không còn, từ chối khi cả bản per-user và All Users đều còn sống, và không cho tạo fresh All Users install mới.
- Với bản All Users cũ, installer chạy ACL preflight trước khi gỡ bản hiện tại rồi chỉ cấp nhóm Users quyền Modify cho thư mục `Input`; nếu tạo probe hoặc `icacls` thất bại, cài đặt dừng trước khi thay đổi bản cũ.
- Desktop shortcut luôn được tạo; Start Menu shortcut được tạo.
- Icon installer, uninstaller, EXE và shortcut dùng `assets/app-icon.ico`.
- Chạy app sau khi cài nếu người dùng giữ lựa chọn mặc định.
- Chỉ giữ locale `vi` và `en-US` để giảm dung lượng.

### 7.2 Footprint sau khi cài

- `asar: true` đóng gói mã ứng dụng vào `app.asar`.
- Chỉ `sharp` và các binary `@img` cần thiết được unpack để native module hoạt động.
- `Input` được đóng gói bằng `extraFiles` và đặt cạnh EXE; marker runtime bị loại khỏi payload. Snapshot `userData` tự khôi phục tài sản nếu NSIS thay thế thư mục cài đặt.
- `pdf-lib` là dependency JavaScript runtime nằm trong ASAR, không cần unpack native binary.
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
4. `autoInstallOnAppQuit` là `false`; chỉ thao tác cài đặt rõ ràng mới gọi `quitAndInstall`, sau khi snapshot `Input` hoàn tất.
5. Khi có bản mới, giao diện hiển thị phiên bản và lựa chọn tải hoặc để sau.
6. Trong lúc tải, giao diện hiển thị tiến trình.
7. Khi tải xong, người dùng chọn khởi động lại để gọi `quitAndInstall`.
8. Có thể kiểm tra thủ công; trạng thái “đã mới nhất” chỉ cần hiện rõ cho kiểm tra thủ công.
9. Không cài trong lúc có tác vụ tạo ảnh hoặc ghi snapshot/vùng in; bản nháp vùng in phải được lưu hoặc đóng trước khi restart.
10. Nếu người dùng đóng cửa sổ khi một job đang chạy, main process đánh dấu hủy, đợi rollback hoàn tất rồi mới cho cửa sổ đóng.

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

Các số liệu dưới đây là mốc đã chốt của v1.2.0. Không dùng chúng làm bằng chứng QA cho v1.2.1. Số lượng test, checksum, installer, smoke và kết quả nâng cấp của v1.2.1 phải được ghi mới sau khi root xác minh.

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

### v1.2.1 — phát hành stable/public

- Thêm `Input` cạnh EXE cho PDF mẫu và ảnh mockup đơn.
- Thêm kéo-thả PNG từ nhiều thư mục.
- Thêm PDF Download với URL mới gắn vào nút và link hiển thị.
- Thêm mockup đơn, vùng in `42:48` lưu theo template và chọn PNG nguồn ngẫu nhiên.
- Dùng watermark trên lớp trên cùng cho cả bundle và mockup đơn; lưu mọi output vào cùng `Done`.
- Thêm dependency `pdf-lib` và mở rộng payload installer.
- QA local đạt 66/66 test sau `npm ci`; source/package basic và region-editor smoke, headless Input backup và bộ cài NSIS cuối đều đạt sau các bản vá hardening. Tag/Release đã public và updater v1.2.0 nhận đúng thông báo; cài mới tương tác và lượt download/cài nâng cấp hoàn chỉnh còn chờ.

Mốc QA local v1.2.1 ngày 2026-08-07:

- `npm test`: **66/66 đạt**, 0 fail, 0 skipped/todo.
- `npm audit --omit=dev --audit-level=high`: **0 vulnerabilities**.
- PDF mẫu thật đã render trực quan; 3/3 annotation dùng URL mới, link Drive cũ không còn và text extraction của output chỉ còn URL mới.
- Source final basic/region smoke và packaged basic/region smoke trên payload `win-unpacked` cuối đều PASS; title/header đúng v1.2.1.
- Chế độ headless `--sync-input-backup` đồng bộ snapshot và thoát `0`; một tiến trình headless thứ hai khi app đang giữ single-instance lock bị chặn và thoát `3`. NSIS dừng update/uninstall với mọi mã khác `0`; kiểm thử hook trong lượt gỡ/cập nhật tương tác hoàn chỉnh vẫn đang chờ.
- `app.asar` có PDF service, single-mockup service và `pdf-lib`; không chứa test/script/Input. `Input` nằm cạnh EXE với README và PDF sanitized.
- NSIS local tạo đủ `PNG-Bundle-Mockup-Setup-1.2.1.exe`, blockmap và `latest.yml`; size/SHA-512 trong metadata khớp.
- SHA-256 installer local: `6723EF04ACE0595DEAD7C606A5F66C39F9608D2DFDE470ED73FA24ED775AC9C0`; trạng thái Authenticode: **NotSigned**.
- Kích thước installer final local: 104,334,512 byte; blockmap: 109,600 byte. Version/path/size và SHA-512 trong `latest.yml` khớp file thực tế.
- Release ID `366371391` đã public với đúng ba asset. Cả ba asset được tải ngược từ GitHub và khớp từng byte với bản local; installer remote có SHA-256 `6723EF04ACE0595DEAD7C606A5F66C39F9608D2DFDE470ED73FA24ED775AC9C0`.
- `latest.yml` public có SHA-256 `64407FAE9A0EEF3041C6BEA1BC031499F941C962DA0C94DBA5BFC84BBAD9911B`; version/path/size/SHA-512 khớp installer public.
- Bản cài v1.2.0 trên máy QA đã tự hiện **Có phiên bản mới**, `v1.2.0 → v1.2.1`, với action `download`. Không bấm tải/cài để không thay đổi app và dữ liệu thật.
- Windows CI run `31125907971` kết thúc failure vì job bị GitHub hủy sau khoảng 15 phút mà chưa cấp runner hoặc chạy step nào. GitHub Status lúc đó là Partial System Outage, incident Actions mức critical. Webhook tag sau đó được giao trễ thành Release Windows run `31126661713`, nhưng vẫn queued không có runner tại 02:15 ngày 2026-08-07; cancel trả 500 và force-cancel trả 502. Bản public dùng fallback thủ công đã xác minh ở trên; workflow fail-closed trước Release public nên không thể ghi đè asset hiện có.

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
- [ ] Hoàn tất download/restart/cài live từ v1.2.0 lên v1.2.1; phần phát hiện và thông báo version mới đã đạt ngày 2026-08-07.

## 13. Trạng thái phát hành v1.2.1

- [x] Root review đầy đủ code và luồng UI của Input, kéo-thả, PDF Download, mockup đơn và vùng in.
- [x] Chạy toàn bộ automated test suite từ lockfile sạch: 66/66 đạt, 0 fail/skipped/todo.
- [ ] Kiểm tra kéo-thả PNG từ ít nhất hai thư mục, file trùng, file lỗi và quy tắc thư mục `Done`.
- [x] Kiểm tra PDF mẫu thật: URL cũ không còn, URL hiển thị đúng và cả ba vùng annotation dùng URL mới.
- [x] Kiểm tra mockup đơn: random nguồn, alpha crop, vùng `42:48`, hậu tố tên, watermark topmost và metadata cuối luồng.
- [x] Kiểm tra lưu/nạp lại vùng in và invalidation khi kích thước template thay đổi bằng automated tests.
- [x] Chạy renderer smoke cho màn hình chính, trạng thái Input, trình chỉnh vùng in và payload đóng gói.
- [x] Build NSIS; xác nhận `Input` nằm cạnh EXE, `pdf-lib` có trong ASAR và payload không thiếu dependency.
- [x] Push commit `2dfc7a3`, tạo tag `v1.2.1` đúng package version và publish một GitHub Release stable/public duy nhất.
- [x] Xác minh Release ID `366371391`, `/releases/latest`, đúng ba asset và checksum/metadata sau khi tải ngược.
- [x] Bản installer v1.2.0 nhận đúng thông báo `v1.2.1` và chỉ ở action `download`; không tự tải/cài.
- [ ] Cài mới trên Windows x64 bằng tài khoản phù hợp và kiểm tra toàn bộ output vào `Done`.
- [ ] Cài/nâng cấp live `v1.2.0 → v1.2.1`; xác nhận preferences, localStorage, `Done`, app identity và các chức năng v1.2.1 sau nâng cấp.
- [ ] Kiểm tra persistence riêng từ v1.2.1: lưu vùng in và tài sản `Input`, sau đó gỡ/cài lại hoặc nâng lên patch kế tiếp để xác nhận snapshot/hook khôi phục đúng.
- [ ] Windows CI đạt; run `31125907971` bị hủy trước khi có runner do sự cố GitHub Actions, không phải kết quả test code.
- [ ] Release Windows workflow đạt; run giao trễ `31126661713` vẫn queued không có runner trong outage và API hủy trả 500/502. Bản phát hành đã dùng fallback thủ công; workflow không ghi đè Release public.
- [x] Thay placeholder trong `docs/RELEASE-NOTES-1.2.1.md` bằng kết quả QA, GitHub Release, updater và ngoại lệ CI thực tế.
