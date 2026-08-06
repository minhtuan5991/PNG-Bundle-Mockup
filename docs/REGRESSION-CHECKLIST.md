# Regression checklist — PNG Bundle Mockup

> Dùng checklist này trước mỗi release Windows. Không đánh dấu mục chưa thực sự kiểm tra.

## Trạng thái mốc

- [x] Mốc automated ngay trước khi tích hợp updater: **20/20 test đạt**.
- [x] QA local v1.2.0 ngày 2026-08-06: **26/26 test đạt**, 0 fail, 0 skipped/todo.
- [x] Smoke mã nguồn và payload đóng gói đạt; NSIS build đủ ba update artifact.
- [x] Đã cập nhật cùng số liệu vào `docs/PROJECT-HISTORY.md`.

Môi trường QA local: Windows x64 `10.0.26200`, Node.js `24.13.0`, Electron `43.2.0`. Workflow GitHub dùng Node.js `22.x` theo yêu cầu tối thiểu của Electron 43.

## A. Automated tests

### A1. Môi trường và dependency

- [x] Đã dùng Windows x64 và Node.js tương thích (`24.13.0`, yêu cầu tối thiểu `22.12.0`).
- [ ] `npm ci` hoàn tất từ lockfile, không sửa `package-lock.json` ngoài dự kiến.
- [x] `npm audit --omit=dev --audit-level=high` trả về 0 vulnerabilities.

### A2. Test suite

- [x] `npm test` trả exit code `0`.
- [x] Ghi tổng số: `26 / 26` đạt.
- [x] Không có test skipped/todo ngoài chủ đích đã ghi tài liệu.
- [x] Test chia nhóm xác nhận `30/1`, `30/2`, `31/2`, nhóm dư và giữ thứ tự.
- [x] Test từ chối số mockup lớn hơn số PNG.
- [x] Test lưới xác nhận placement nằm hoàn toàn trong vùng lề.
- [x] Test báo lỗi khi tổng lề chiếm hết vùng xử lý.
- [x] Test alpha bounds loại canvas trong suốt và xử lý ảnh hoàn toàn trong suốt.
- [x] Test output giữ kích thước nền và không ghi đè file cũ.
- [ ] Test hủy/lỗi không để lại file tạm.
- [ ] Test watermark xác nhận thứ tự lớp, căn giữa, resize và alpha.
- [x] Test từ chối watermark giả PNG, opaque hoặc không hợp lệ.
- [x] Test metadata xác nhận Comment, EXIF, XMP, EXIF thumbnail, IPTC và ICC profile đều bị xóa ở bước cuối.
- [x] Test `removeMetadata: false` xác nhận metadata nền được giữ trong khả năng hỗ trợ.

### A3. Path preferences

- [x] Test schema mặc định có `schemaVersion`, `sourceFolder`, `templateFile`, `watermarkFile`.
- [x] Test chỉ chấp nhận đường dẫn tuyệt đối và extension đúng.
- [x] Test source phải là thư mục; template/watermark phải là file.
- [x] Test template hỗ trợ PNG/JPG/JPEG/WEBP/TIF/TIFF.
- [x] Test watermark chỉ nhận PNG.
- [x] Test JSON thiếu, hỏng hoặc sai schema rơi về mặc định an toàn.
- [x] Test đường dẫn file mất nhưng thư mục cha tồn tại trả về thư mục cha cho dialog.
- [ ] Test đường dẫn và thư mục cha đều mất trả về `undefined`.
- [ ] Test ghi nguyên tử và dọn file `.tmp-*` sau thành công/lỗi.
- [x] Test nhiều lệnh remember nối hàng đợi không làm mất giá trị.
- [ ] Test hủy dialog không ghi đè path cũ.

### A4. Update service

- [x] Test updater bị vô hiệu hóa khi `app.isPackaged === false`.
- [x] Test mặc định `autoDownload === false`.
- [x] Test các trạng thái: idle, checking, available, downloading, downloaded, up-to-date, error.
- [x] Test snapshot chỉ chứa dữ liệu tuần tự hóa được.
- [x] Test progress gồm percent, transferred, total và bytesPerSecond khi hợp lệ.
- [x] Test lỗi EventEmitter không trở thành uncaught exception.
- [x] Test lỗi callback gửi IPC không làm main process crash.
- [ ] Test không chạy hai check hoặc hai download đồng thời.
- [x] Test manual check giữ cờ `manual` đúng để renderer quyết định cách thông báo.
- [x] Test `quitAndInstall(false, true)` chỉ được gọi trên bản packaged.

### A5. Renderer/main smoke

- [x] Smoke test xác nhận preload API tồn tại.
- [x] Header/title hiển thị đúng `PNG Bundle Mockup v1.2.0`.
- [x] Metadata checkbox được bật mặc định.
- [x] Picker thumbnail mở được với dữ liệu QA.
- [x] Khu vực preview và safe zone render được.
- [x] API chọn watermark, app info và updater có mặt đúng theo thiết kế.
- [x] Smoke test chạy ngoài sandbox hạn chế GPU/cache và trên payload đóng gói.

## B. Kiểm thử chức năng thủ công

### B1. Chọn thư mục và PNG

- [ ] Chọn thư mục có PNG mở gallery trước khi nạp vào app.
- [ ] Thumbnail đúng file, đúng tỉ lệ và tên.
- [ ] Tìm kiếm theo tên hoạt động với chữ hoa/thường và tên tiếng Việt.
- [ ] Chọn tất cả/bỏ chọn tất cả chỉ tác động file đang lọc như thiết kế.
- [ ] Hủy gallery giữ nguyên danh sách trước đó.
- [ ] Xác nhận gallery chỉ nạp các file đã chọn.
- [ ] File hỏng được báo cụ thể và không thể chọn để tạo mockup.
- [ ] PNG hoàn toàn trong suốt được báo rõ khi xử lý.
- [ ] Ảnh nền nằm trong source bị loại khỏi thiết kế.
- [ ] Watermark nằm trong source bị loại khỏi thiết kế.

### B2. Ghi nhớ đường dẫn

- [ ] Lần đầu không có preferences, ba hộp thoại vẫn mở bình thường.
- [ ] Chọn source, đóng app, mở lại: dialog source bắt đầu tại source gần nhất.
- [ ] Chọn template, đóng app, mở lại: dialog template bắt đầu tại file/thư mục gần nhất.
- [ ] Chọn watermark, đóng app, mở lại: dialog watermark bắt đầu tại file/thư mục gần nhất.
- [ ] Hủy một lựa chọn mới không thay đổi vị trí đã nhớ.
- [ ] Di chuyển/xóa file đã nhớ: dialog dùng thư mục cha nếu còn tồn tại.
- [ ] Xóa cả thư mục cha: dialog rơi về vị trí hệ thống, app không lỗi.
- [ ] File `path-preferences.json` hỏng không làm app không khởi động.
- [ ] Đường dẫn có dấu tiếng Việt, khoảng trắng và ký tự Unicode hoạt động.
- [ ] Kiểm tra đường dẫn dài và ổ mạng/network share nếu đây là môi trường sử dụng thực tế.
- [ ] App không tự nạp file cũ hoặc tự bật watermark chỉ vì đã nhớ đường dẫn.

### B3. Layout và phân phối

- [ ] `30 PNG / 1 mockup` tạo một file có 30 thiết kế.
- [ ] `30 PNG / 2 mockup` tạo hai file, mỗi file 15 thiết kế.
- [ ] `31 PNG / 2 mockup` tạo `16 + 15`, không mất/lặp/đổi thứ tự.
- [ ] Số mockup bằng số PNG tạo một thiết kế trên mỗi file.
- [ ] Số mockup lớn hơn số PNG bị từ chối với thông báo rõ.
- [ ] Gap `0` và gap lớn hợp lệ không gây tràn vùng.
- [ ] Lề trên/dưới mặc định là 195 px.
- [ ] Lề tùy chỉnh không đặt pixel ra ngoài safe zone.
- [ ] Tổng lề không hợp lệ bị từ chối trước khi ghi output.
- [ ] PNG có canvas trong suốt lớn vẫn được bố trí theo pixel thực.
- [ ] PNG dọc, ngang, vuông và kích thước hỗn hợp giữ đúng tỉ lệ.

### B4. Template và preview

- [ ] Template PNG hoạt động.
- [ ] Template JPG/JPEG hoạt động.
- [ ] Template WEBP hoạt động.
- [ ] Template TIF/TIFF hoạt động.
- [ ] Kết quả giữ nguyên width/height template.
- [ ] Preview khớp gần như pixel với output cuối.
- [ ] Điều hướng preview nhiều mockup hoạt động.
- [ ] Đổi thiết lập sau preview yêu cầu preview lại hoặc cập nhật trạng thái rõ.
- [ ] Preview/tạo output hiển thị progress hợp lý.
- [ ] Hủy preview/tạo output đưa app về trạng thái có thể tiếp tục dùng.

### B5. Watermark

- [ ] Bật watermark mở file picker PNG.
- [ ] Hủy picker khi chưa có watermark trả checkbox về trạng thái hợp lý.
- [ ] Thay watermark hiện tại hoạt động.
- [ ] Watermark bằng kích thước nền phủ đúng tại `(0,0)`.
- [ ] Watermark nhỏ hơn nền không bị phóng lớn, được căn giữa.
- [ ] Watermark lớn hơn nền được thu vừa, giữ tỉ lệ và căn giữa.
- [ ] Alpha/opacity gốc được giữ.
- [ ] Watermark nằm trên mọi PNG thiết kế.
- [ ] Watermark opaque bị từ chối.
- [ ] File JPEG đổi đuôi `.png` bị từ chối.
- [ ] Watermark trùng template bị từ chối.
- [ ] Tắt watermark loại watermark khỏi preview và output.

### B6. Metadata và output

- [ ] Metadata checkbox bật mặc định ở profile người dùng mới.
- [ ] Khi bật, output không còn đủ sáu nhóm metadata.
- [ ] Việc xóa metadata xảy ra sau watermark.
- [ ] Khi tắt, metadata nền được giữ theo khả năng định dạng.
- [ ] Output nằm trong `<source>/Done`.
- [ ] Tạo lại không ghi đè output cũ.
- [ ] Tên output theo đúng thứ tự `bundle_001`, `bundle_002`, ... và hậu tố khi trùng.
- [ ] Nút mở thư mục Done mở đúng vị trí.
- [ ] File output mở được bằng ứng dụng ảnh thông thường.

## C. Installer và footprint

### C1. Fresh install

- [ ] Kiểm thử trên Windows 10 x64.
- [x] Cài/chạy/gỡ local thành công trên Windows x64 `10.0.26200` (Windows 11).
- [ ] Cài bằng tài khoản standard user không cần quyền admin ngoài dự kiến.
- [ ] Installer cho phép chọn thư mục cài.
- [ ] Installer hiển thị icon đúng.
- [ ] Tùy chọn chạy app sau cài hoạt động.
- [ ] Add/Remove Programs hiển thị đúng tên và version.

### C2. Shortcut và nhận diện app

- [x] Desktop shortcut được tạo trong lượt cài QA.
- [x] Start Menu shortcut được tạo trong lượt cài QA.
- [ ] Cả hai shortcut có icon rõ ở kích thước thường và DPI cao.
- [x] Hai shortcut trỏ đúng EXE đã cài, dùng EXE làm icon và không gọi `start-app.bat`.
- [ ] Taskbar/window dùng icon đúng.
- [x] App đã cài smoke exit `0`; window title và header hiển thị đúng version.
- [ ] Không tạo shortcut mới theo từng version khi nâng cấp.

### C3. Footprint

- [x] Payload đóng gói có `app.asar` và runtime cần thiết.
- [x] Chỉ native dependency cần thiết như Sharp/@img được unpack.
- [x] Không có thư mục source rời `src/`.
- [x] Không có `scripts/`, `test/`, `.github/`, `node_modules/` phát triển hoặc `start-app.bat` ở gốc payload.
- [x] Chỉ có locale `vi` và `en-US` theo cấu hình.
- [ ] Không upload `win-unpacked` hoặc file builder trung gian cho người dùng.
- [ ] Không xóa thử DLL/resource Electron để giảm dung lượng.

### C4. Upgrade và uninstall

- [ ] Cài N rồi cài N+1 vào cùng app identity, chỉ còn một mục Add/Remove Programs.
- [ ] Chỉ còn một bộ Desktop/Start Menu shortcut.
- [ ] Version thay đổi đúng sau nâng cấp.
- [ ] `path-preferences.json` và layout localStorage được giữ.
- [ ] Thư mục `Done` của người dùng không bị thay đổi.
- [x] Uninstaller QA exit `0`, xóa thư mục app cùng Desktop/Start Menu shortcut.
- [ ] Với `deleteAppDataOnUninstall: false`, userData được giữ đúng chủ đích.
- [ ] Cài lại nhận lại preferences đã giữ.

## D. Cập nhật online

### D1. Điều kiện release test

- [ ] Có một bản installer cũ hơn đã cài trên máy/VM sạch.
- [ ] Có một GitHub Release mới hơn, public, không draft và không prerelease đối với stable channel.
- [ ] Release có installer, blockmap và `latest.yml` cùng version.
- [ ] App test là bản packaged; không dùng `npm start` để kết luận updater hoạt động.

### D2. Auto/manual check

- [ ] App khởi động và vẫn dùng được khi đang kiểm tra update.
- [ ] Có bản mới thì hiện thông báo đúng version.
- [ ] Không có bản mới: auto check không gây phiền; manual check báo đã mới nhất.
- [ ] Chọn “Để sau” không tải hoặc cài ngay.
- [ ] Kiểm tra thủ công có phản hồi trạng thái rõ.
- [ ] Không chạy chồng nhiều lần kiểm tra.

### D3. Download/install

- [ ] Người dùng chủ động bắt đầu download.
- [ ] Tiến trình tải cập nhật hợp lý và không khóa chức năng không liên quan ngoài thiết kế.
- [ ] Mất mạng giữa lúc tải được báo nhưng app không crash.
- [ ] Có thể thử lại sau lỗi.
- [ ] Tải xong hiện lựa chọn khởi động lại/cài.
- [ ] Chọn khởi động lại cài đúng version mới.
- [ ] Sau cập nhật, app khởi động bình thường và hiển thị version mới.
- [ ] Preferences, đường dẫn đã nhớ và dữ liệu `Done` được giữ.
- [ ] Không còn installer/process tạm bị kẹt sau hoàn tất.

### D4. Tình huống lỗi

- [ ] Offline khi khởi động không chặn app.
- [ ] GitHub 404/5xx/rate limit không chặn app.
- [ ] `latest.yml` thiếu được xử lý như lỗi update, không làm app crash.
- [ ] Installer/blockmap thiếu hoặc checksum sai bị báo lỗi.
- [ ] Draft release không được stable client nhận.
- [ ] Prerelease không được stable client nhận.
- [ ] Version bằng hoặc thấp hơn không được đề nghị như update mới.
- [ ] Development build không tự kiểm tra/tải/cài update.

### D5. Chuyển đổi v1.1.0

- [x] Release notes ghi rõ portable v1.1.0 phải cài v1.2.0 thủ công.
- [x] Không tuyên bố portable v1.1.0 có thể tự update.
- [ ] Sau khi cài v1.2.0 NSIS, kiểm thử update lên một patch cao hơn.

## E. Kiểm tra release

- [x] Các commit phát hành/workflow đã được review và push lên `main`.
- [x] `package.json` và `package-lock.json` cùng version `1.2.0`.
- [x] Tag `v1.2.0` đúng định dạng và khớp package version.
- [x] Windows CI trên commit phát hành `971d92d` đạt.
- [x] Release Windows workflow tạo asset đạt; lượt sửa asset `31106763725` cũng đạt.
- [ ] Dọn Release record trùng tag ID `366240066`; lượt `31107747686` build/test và upload đạt nhưng sync notes thất bại vì tag có hai Release record.
- [x] GitHub Release stable/public có đúng ba artifact bắt buộc.
- [x] Tên installer local là `PNG-Bundle-Mockup-Setup-1.2.0.exe`.
- [x] `latest.yml` local tham chiếu đúng installer và checksum/size.
- [x] SHA-256 installer local: `271BDF3030AA2E38E89D3B64550E2954D9A4BB314B09D2A94663189E32087117`.
- [x] SHA-256 installer GitHub CI hiện tại: `505BB85DA584F4003D74D1C687DC13AC2C05145AD20CAC70AA5B6FDD347E52F1`.
- [ ] Tải lại installer từ GitHub Release và cài thành công trên máy sạch.
- [x] File release notes mô tả tính năng, hướng dẫn portable v1.1.0 và giới hạn unsigned.
- [ ] Đồng bộ file release notes vào body Release chính sau khi dọn record trùng tag.
- [x] README và tài liệu trong `docs/` phản ánh đúng version phát hành.
- [x] Mã nguồn không chứa token/chứng thư/dữ liệu người dùng; `.gitignore` loại release, env và chứng thư local.
- [x] Link `/releases/latest` trỏ đúng stable release `v1.2.0`.

## F. Sign-off

| Hạng mục | Người kiểm tra | Ngày | Kết quả/Ghi chú |
| --- | --- | --- | --- |
| Automated tests | Codex local QA | 2026-08-06 | 26/26 đạt; npm audit runtime 0 vulnerabilities. |
| Manual core features |  |  |  |
| Path persistence |  |  |  |
| Installer/shortcut/footprint | Codex local QA | 2026-08-06 | NSIS build, cài/chạy/gỡ local, shortcut target/icon, packaged smoke và footprint đạt; chưa test standard-user/VM sạch. |
| GitHub updater | Codex local QA | 2026-08-06 | Service/mock/UI/provider và metadata remote đạt; live v1.2.0→v1.2.1 còn chờ patch release. |
| Release artifacts | Codex + GitHub Actions | 2026-08-06 | Stable v1.2.0 có đủ Setup, blockmap, latest.yml; remote version/size/digest đã xác minh. |

Chỉ tạo tag stable khi tất cả mục bắt buộc đã hoàn tất hoặc mọi ngoại lệ đã được ghi rõ trong release notes và được chấp thuận.
