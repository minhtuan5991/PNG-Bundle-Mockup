# Regression checklist — PNG Bundle Mockup

> Dùng checklist này trước mỗi release Windows. Không đánh dấu mục chưa thực sự kiểm tra.

## Trạng thái mốc

- [x] QA local v1.2.3 ngày 2026-08-07: **73/73 test đạt**; build sạch tạo đủ installer/blockmap/`latest.yml`, version/checksum/Input payload đạt. Kiểm thử cài mới custom path và nâng cấp tại chỗ trên máy/VM sạch còn chờ.
- [x] QA local v1.2.2 ngày 2026-08-07: **73/73 test đạt**; source CDP kiểm tra chọn mockup đơn, kéo vùng `42:48`, ổn định viewport và đóng cửa sổ đều đạt; packaged basic/region smoke trên `win-unpacked` đạt, title/header đúng v1.2.2.
- [x] QA/release v1.2.1 ngày 2026-08-07: **66/66 test đạt**; Windows CI thử lại, source/package basic+region smoke, headless Input backup exit `0`, single-instance lock exit `3`, NSIS final, GitHub Release/asset và thông báo updater v1.2.0 đều đạt. Cài mới và download/cài nâng cấp tương tác còn chờ.
- [x] Mốc automated ngay trước khi tích hợp updater: **20/20 test đạt**.
- [x] QA local v1.2.0 ngày 2026-08-06: **26/26 test đạt**, 0 fail, 0 skipped/todo.
- [x] Smoke mã nguồn và payload đóng gói đạt; NSIS build đủ ba update artifact.
- [x] Đã cập nhật cùng số liệu vào `docs/PROJECT-HISTORY.md`.

Môi trường QA local: Windows x64 `10.0.26200`, Node.js `24.13.0`, Electron `43.2.0`. Workflow GitHub dùng Node.js `22.x` theo yêu cầu tối thiểu của Electron 43.

Các mục `[x]` hiện có là bằng chứng lịch sử của phiên bản được ghi rõ. Không kế thừa dấu đạt cũ cho tính năng mới hoặc bản phát hành mới.

## A. Automated tests

### A1. Môi trường và dependency

- [x] Đã dùng Windows x64 và Node.js tương thích (`24.13.0`, yêu cầu tối thiểu `22.12.0`).
- [x] `npm ci` hoàn tất từ lockfile, không sửa `package-lock.json` ngoài dự kiến.
- [x] `npm audit --omit=dev --audit-level=high` trả về 0 vulnerabilities.

### A2. Test suite

- [x] `npm test` trả exit code `0`.
- [x] Ghi tổng số: `26 / 26` đạt.
- [x] Ghi tổng số v1.2.1 sau `npm ci`: `66 / 66` đạt, 0 fail, 0 skipped/todo.
- [x] Không có test skipped/todo ngoài chủ đích đã ghi tài liệu.
- [x] Test chia nhóm xác nhận `30/1`, `30/2`, `31/2`, nhóm dư và giữ thứ tự.
- [x] Test từ chối số mockup lớn hơn số PNG.
- [x] Test lưới xác nhận placement nằm hoàn toàn trong vùng lề.
- [x] Test báo lỗi khi tổng lề chiếm hết vùng xử lý.
- [x] Test alpha bounds loại canvas trong suốt và xử lý ảnh hoàn toàn trong suốt.
- [x] Test output giữ kích thước nền và không ghi đè file cũ.
- [ ] Test hủy/lỗi không để lại file tạm.
- [x] Test watermark xác nhận thứ tự lớp, căn giữa, resize và alpha cho bundle lẫn mockup đơn.
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
- [x] Test mặc định `autoInstallOnAppQuit === false`; cài update chỉ đi qua thao tác rõ ràng sau khi snapshot `Input`.
- [x] Test packaging giữ installer assisted tương thích v1.2.0 (`oneClick === false`, `perMachine === false`, `allowElevation === true`), kiểm tra macro mode/ACL/headless và loại marker runtime khỏi payload.
- [x] Test các trạng thái: idle, checking, available, downloading, downloaded, up-to-date, error.
- [x] Test snapshot chỉ chứa dữ liệu tuần tự hóa được.
- [x] Test progress gồm percent, transferred, total và bytesPerSecond khi hợp lệ.
- [x] Test lỗi EventEmitter không trở thành uncaught exception.
- [x] Test lỗi callback gửi IPC không làm main process crash.
- [ ] Test không chạy hai check hoặc hai download đồng thời.
- [x] Test manual check giữ cờ `manual` đúng để renderer quyết định cách thông báo.
- [x] Test `quitAndInstall(false, true)` chỉ được gọi trên bản packaged.
- [x] Test install trả `false` khi update chưa ở trạng thái downloaded hoặc `quitAndInstall` phát lỗi đồng bộ.

### A5. Renderer/main smoke

- [x] Smoke test xác nhận preload API tồn tại.
- [x] Header/title hiển thị đúng `PNG Bundle Mockup v1.2.0`.
- [x] Metadata checkbox được bật mặc định.
- [x] Picker thumbnail mở được với dữ liệu QA.
- [x] Khu vực preview và safe zone render được.
- [x] API chọn watermark, app info và updater có mặt đúng theo thiết kế.
- [x] Source basic smoke và source region-editor smoke đều PASS ngoài sandbox hạn chế GPU/cache.
- [x] Smoke v1.2.1 xác nhận API kéo-thả, đọc `Input`, lưu vùng in, PDF Download và mockup đơn có mặt.
- [x] Smoke v1.2.1 xác nhận checkbox/ô URL/trạng thái Input và trình chỉnh vùng in `42:48` render đúng trên ảnh mẫu thật.
- [x] Source final basic/region smoke PASS; packaged basic/region smoke PASS trên payload cuối.
- [x] Packaged basic smoke và packaged region-editor smoke trên `win-unpacked` đều PASS; title/header lấy version `1.2.1` từ package.

### A6. Service mới v1.2.1

- [x] Test `input-directory` xác nhận development dùng `<project>/Input`, packaged dùng `Input` cạnh EXE và tạo thư mục an toàn.
- [x] 7 test backup xác nhận mirror sửa/xóa, restore sau update/cài lại, snapshot rỗng, staging lỗi và phục hồi snapshot bị gián đoạn.
- [x] Test PDF xác nhận nhiều trang, layout link tách trang bị từ chối, commit nguyên tử và cleanup ở ba thời điểm hủy.
- [x] Test mockup đơn xác nhận JPEG EXIF Orientation, ảnh hỏng bị bỏ qua/cảnh báo và cấu hình template tạm vắng không bị xóa.
- [x] Test kéo-thả xác nhận nhiều thư mục, khử trùng không phân biệt hoa/thường trên Windows, chỉ nhận PNG và dùng thư mục của PNG đọc được đầu tiên làm nguồn `Done`.
- [x] Test PDF xác nhận URL chỉ nhận HTTP(S), phải có đúng một PDF mẫu, cập nhật mọi annotation liên quan và không ghi đè output.
- [x] Test PDF trên mẫu thật xác nhận link Drive cũ không còn, ba annotation dùng URL mới, file mở/render được và text extraction chỉ còn URL mới sau khi tạo.
- [x] Test vùng in xác nhận normalized bounds, tỷ lệ pixel `42:48`, ghi nguyên tử và invalidation khi kích thước template đổi.
- [x] Test mockup đơn xác nhận quét đúng định dạng ảnh, random nguồn, crop alpha, `contain`, hậu tố output và dọn file tạm.
- [x] Test mockup đơn xác nhận watermark được composite sau thiết kế, nằm trên lớp trên cùng và metadata được xóa ở bước cuối khi bật.
- [x] Test tích hợp xác nhận bundle, mockup đơn và PDF Download cùng được lưu vào một thư mục `Done`.
- [x] Chạy `--sync-input-backup` headless trên payload và xác nhận đồng bộ/exit `0`; giữ app chạy rồi gọi tiến trình headless thứ hai, xác nhận single-instance lock chặn với exit `3`. NSIS coi mã khác `0` là lỗi để update/uninstall fail-closed; lượt hook tương tác hoàn chỉnh vẫn để ở mục C1.
- [x] Ghi tổng số test v1.2.1 thực tế: **66/66 đạt**.

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
- [ ] Kéo một PNG từ File Explorer vào vùng danh sách sẽ tự thêm và chọn file hợp lệ.
- [ ] Kéo đồng thời PNG từ ít nhất hai thư mục giữ đủ đường dẫn và thumbnail.
- [ ] File trùng không được thêm lần hai; file không phải PNG bị bỏ qua với thông báo rõ.
- [ ] PNG hỏng được thêm ở trạng thái lỗi nhưng không được tự chọn để tạo output.
- [ ] Khi bắt đầu hoàn toàn bằng kéo-thả, thư mục của file hợp lệ đầu tiên trở thành source chính và quyết định `Done`.

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
- [ ] Khi tạo mockup đơn, watermark cũng nằm trên thiết kế và là lớp composite cuối.
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
- [ ] Khi bật các output bổ sung, bundle, mockup đơn và PDF cùng nằm trong một thư mục `Done`.
- [ ] Nếu bước mockup đơn/PDF lỗi hoặc bị hủy, không để lại một bộ kết quả dở dang ngoài chính sách đã thiết kế.

### B7. PDF Download

- [ ] Nút **Mở Input** mở đúng thư mục cạnh EXE của app đã cài.
- [ ] Không có PDF: bật PDF Download và tạo sẽ bị từ chối rõ ràng.
- [ ] Có từ hai PDF trở lên: app yêu cầu chỉ giữ đúng một PDF mẫu.
- [ ] URL trống, sai định dạng hoặc không dùng HTTP(S) bị từ chối trước khi tạo.
- [ ] Với PDF mẫu thật, URL nhìn thấy được thay đầy đủ, không chồng chữ, không cắt dòng và giữ bố cục trang.
- [ ] Click nút Download mở URL mới.
- [ ] Click từng vùng của link hiển thị mở cùng URL mới.
- [ ] Kiểm tra text/accessibility/outline liên quan không còn URL đích cũ ngoài nội dung không thể thay theo thiết kế.
- [ ] PDF mới nằm trong `Done`, giữ tên mẫu và dùng `_2`, `_3`, ... khi trùng.
- [ ] Mở PDF bằng ít nhất hai trình đọc phổ biến và xác nhận không có cảnh báo file hỏng.

### B8. Mockup đơn và vùng in

- [ ] `Input` nhận template PNG, JPG/JPEG, WEBP và TIF/TIFF; PDF không bị quét như ảnh.
- [ ] Trình chỉnh lần lượt hiển thị mọi ảnh mẫu trong Preview.
- [ ] Vùng chọn luôn giữ tỷ lệ `42:48`, kéo/resize được và không ra ngoài ảnh.
- [ ] Nút **Lưu vùng in** chỉ hoàn tất khi mọi template có cấu hình hợp lệ.
- [ ] Đóng/mở app vẫn tải lại đúng vùng in đã lưu.
- [ ] Giữ tên/kích thước template dùng lại cấu hình; đổi kích thước làm cấu hình cũ hết hiệu lực.
- [ ] Mỗi template tạo đúng một output `single_<tên template>.png`.
- [ ] Số PNG được chọn ngẫu nhiên bằng số template; một chu kỳ không lặp khi đủ PNG nguồn.
- [ ] Khi template nhiều hơn PNG nguồn, app có thể tái sử dụng ở chu kỳ kế tiếp nhưng không treo hoặc thiếu output.
- [ ] Thiết kế được crop theo alpha và nằm trọn trong vùng in theo kiểu `contain`.
- [ ] Watermark topmost, kích thước output bằng template và file trùng không bị ghi đè.

## C. Installer và footprint

### C1. Fresh install

- [ ] Kiểm thử trên Windows 10 x64.
- [x] Lịch sử v1.2.0: cài/chạy/gỡ local thành công trên Windows x64 `10.0.26200` (Windows 11); chưa dùng kết quả này để đánh dấu fresh install v1.2.1.
- [ ] Cài bằng tài khoản standard user không cần quyền admin ngoài dự kiến.
- [ ] `customInstallMode` ép fresh install theo current-user; trang chọn thư mục xuất hiện, tự thêm thư mục con `PNG Bundle Mockup`, và thư mục đích/`Input` ghi được bằng tài khoản hiện tại.
- [ ] Khi nâng cấp bản đã cài, trang chọn thư mục bị bỏ qua và installer giữ nguyên `InstallLocation`, không tạo thêm bản cài hoặc shortcut trùng.
- [ ] Nâng cấp bản v1.2.0 All Users/custom path hiện có đúng tại chỗ, không tạo thêm bản HKCU hoặc shortcut trùng.
- [ ] Installer hiển thị icon đúng.
- [ ] Tùy chọn chạy app sau cài hoạt động.
- [ ] Add/Remove Programs hiển thị đúng tên và version.
- [ ] Bản v1.2.1 tạo/đặt `Input` cạnh EXE và nút **Mở Input** mở đúng vị trí thực tế.
- [ ] Tài khoản cài đặt có thể thêm/sửa PDF và ảnh mẫu trong `Input` mà không cần quyền ngoài dự kiến.
- [ ] Gỡ/cập nhật chạy đồng bộ headless `Input` trước khi NSIS xóa thư mục cài; nếu đồng bộ thất bại thì quy trình dừng để không làm mất tài sản.
- [ ] Mở app tương tác lần thứ hai và xác nhận không tạo phiên làm việc song song mà khôi phục/đưa cửa sổ đang chạy lên trước. Hành vi headless lock/exit `3` đã được xác minh tự động ở mục A6.
- [ ] Đóng cửa sổ khi đang tạo output sẽ yêu cầu hủy, đợi rollback/file tạm được dọn xong rồi mới thoát.
- [ ] Nút cài cập nhật bị khóa khi đang tạo output, quét/lưu `Input` hoặc còn mở trình chỉnh vùng in chưa lưu.

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
- [x] `app.asar` có service PDF/mockup đơn và dependency `pdf-lib`; packaged smoke không báo thiếu module.
- [x] `Input` được đóng gói đúng một lần cạnh EXE, không nằm nhầm trong `app.asar` hoặc thư mục resource khó truy cập.
- [x] `Input` trong payload chỉ có README và PDF mẫu đã làm phẳng/sanitized; không có file QA hoặc link Drive cũ.

### C4. Upgrade và uninstall

- [ ] Cài N rồi cài N+1 vào cùng app identity, chỉ còn một mục Add/Remove Programs.
- [ ] Chỉ còn một bộ Desktop/Start Menu shortcut.
- [ ] Version thay đổi đúng sau nâng cấp.
- [ ] `path-preferences.json` và layout localStorage được giữ.
- [ ] `single-mockup-regions.json` được giữ và vẫn khớp template sau nâng cấp.
- [x] Chính sách đã được khóa bằng service/test: tài sản `Input` được snapshot trong `userData`, khôi phục khi marker mất và mirror các xóa có chủ ý khi marker còn.
- [ ] Thư mục `Done` của người dùng không bị thay đổi.
- [x] Uninstaller QA exit `0`, xóa thư mục app cùng Desktop/Start Menu shortcut.
- [ ] Với `deleteAppDataOnUninstall: false`, userData được giữ đúng chủ đích.
- [ ] Cài lại nhận lại preferences đã giữ.

## D. Cập nhật online

### D1. Điều kiện release test

- [ ] Có một bản installer cũ hơn đã cài trên máy/VM sạch.
- [x] Có một GitHub Release mới hơn, public, không draft và không prerelease đối với stable channel: `v1.2.1`, Release ID `366371391`.
- [x] Release có installer, blockmap và `latest.yml` cùng version; cả ba asset public đã được tải ngược và xác minh.
- [x] App test là bản packaged: installer v1.2.0 tại máy QA; không dùng `npm start` để kết luận updater hoạt động.

### D2. Auto/manual check

- [x] App packaged v1.2.0 khởi động, renderer phản hồi và hoàn tất auto-check update.
- [x] Có bản mới thì hiện đúng **Có phiên bản mới**, `v1.2.0 → v1.2.1`, nút **Tải cập nhật** và action `download`.
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
- [ ] Nâng cấp live từ installer `1.2.0` lên `1.2.1` qua GitHub updater hoàn tất.
- [ ] Sau nâng cấp lên v1.2.1, kéo-thả, PDF Download và mockup đơn hoạt động trong bản packaged.

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

## E. Kiểm tra release v1.2.0 — lịch sử

- [x] Các commit phát hành/workflow đã được review và push lên `main`.
- [x] `package.json` và `package-lock.json` cùng version `1.2.0`.
- [x] Tag `v1.2.0` đúng định dạng và khớp package version.
- [x] Windows CI trên commit phát hành `971d92d` đạt.
- [x] Windows CI trên commit workflow an toàn `06a99a1` đạt (`31108982161`).
- [x] Release Windows workflow tạo asset đạt; lượt sửa asset `31106763725` cũng đạt.
- [x] Dọn Release record trùng tag ID `366240066`; chỉ còn Release chính ID `366240065`. Lượt `sync-notes` `31109541690` đạt.
- [x] GitHub Release stable/public có đúng ba artifact bắt buộc.
- [x] Tên installer local là `PNG-Bundle-Mockup-Setup-1.2.0.exe`.
- [x] `latest.yml` local tham chiếu đúng installer và checksum/size.
- [x] SHA-256 installer local: `271BDF3030AA2E38E89D3B64550E2954D9A4BB314B09D2A94663189E32087117`.
- [x] SHA-256 installer GitHub CI hiện tại: `505BB85DA584F4003D74D1C687DC13AC2C05145AD20CAC70AA5B6FDD347E52F1`.
- [ ] Tải lại installer từ GitHub Release và cài thành công trên máy sạch.
- [x] File release notes mô tả tính năng, hướng dẫn portable v1.1.0 và giới hạn unsigned.
- [x] File release notes đã đồng bộ và khớp body Release chính.
- [x] README và tài liệu trong `docs/` phản ánh đúng version phát hành.
- [x] Mã nguồn không chứa token/chứng thư/dữ liệu người dùng; `.gitignore` loại release, env và chứng thư local.
- [x] Link `/releases/latest` trỏ đúng stable release `v1.2.0`.

## E2. Kiểm tra release v1.2.1

- [x] `package.json` và `package-lock.json` cùng version `1.2.1`; dependency `pdf-lib` có trong cả manifest và lockfile.
- [x] `docs/RELEASE-NOTES-1.2.1.md` không còn placeholder biên tập; URL placeholder trong PDF mẫu là dữ liệu an toàn có chủ đích.
- [x] README, changelog, project history, release guide và checklist phản ánh đúng chức năng thực tế ở mốc QA local.
- [x] Review tài sản `Input` sẽ commit/đóng gói trước tag: chỉ README và PDF mẫu flattened dùng placeholder an toàn; marker runtime bị ignore và loại khỏi payload.
- [x] Commit/tag phát hành chỉ chứa thay đổi chủ đích; không có token, chứng thư, output `Done`, file tạm hoặc cache.
- [x] Windows CI trên đúng tag/commit phát hành đạt tại run [`31126793200`](https://github.com/minhtuan5991/PNG-Bundle-Mockup/actions/runs/31126793200): checkout, Node 22, `npm ci`, regression tests và package unpacked đều success. Run đầu `31125907971` bị hủy trước runner trong outage, không phải lỗi code.
- [x] Tag `v1.2.1` trỏ đúng commit `2dfc7a3219d80c5f29f6a2eb8be5247efa25e1a3` và khớp tuyệt đối package version.
- [ ] Release Windows workflow đạt. Tag event được giao trễ thành run [`31126661713`](https://github.com/minhtuan5991/PNG-Bundle-Mockup/actions/runs/31126661713), rồi kết thúc failure với job cancelled trước runner/step trong outage. Dùng fallback publish thủ công từ đúng ba artifact local đã QA và xác minh tải ngược; asset public không thay đổi.
- [x] GitHub Release `v1.2.1` ID `366371391` stable/public, không draft/prerelease và chỉ có một Release record cho tag.
- [x] Release có đủ Setup, `.exe.blockmap`, `latest.yml` cùng version và checksum/size khớp.
- [x] SHA-256 installer local v1.2.1 đã ghi vào release notes: `6723EF04ACE0595DEAD7C606A5F66C39F9608D2DFDE470ED73FA24ED775AC9C0`.
- [x] Sau khi publish, đã tải lại cả ba asset công khai và tính checksum độc lập; installer remote SHA-256 `6723EF04ACE0595DEAD7C606A5F66C39F9608D2DFDE470ED73FA24ED775AC9C0`.
- [ ] Tải installer từ chính GitHub Release và cài/nâng cấp thành công trên máy/VM sạch.
- [x] `/releases/latest` trỏ đúng `v1.2.1` sau khi publish.
- [x] Body GitHub Release được đồng bộ từ `docs/RELEASE-NOTES-1.2.1.md`; commit hậu phát hành sẽ ghi lại trạng thái công khai/updater/CI cuối.

## E3. Kiểm tra release v1.2.2

- [x] `package.json`, `package-lock.json` và package root trong lockfile cùng version `1.2.2`.
- [x] 73/73 automated tests đạt; 0 fail, 0 skipped/todo; `node --check` và `git diff --check` đạt.
- [x] `npm audit --omit=dev --audit-level=high` đạt: 0 vulnerabilities.
- [x] Có test riêng xác nhận `Done` đã có PDF thì bỏ qua trước URL/PDF mẫu và không sửa file hiện có.
- [x] Có test vòng đời cửa sổ xác nhận handler `closed` chỉ dùng `windowWebContentsId` đã chụp, không đọc `window.webContents` sau destruction.
- [x] Source CDP: bật mockup đơn nhận đủ 4 template; Advanced mở; Preview `1/4`; kéo vùng `42:48` và trạng thái dirty/save đạt.
- [x] Source CDP: toggle PDF không cuộn root, không có vùng tối; đóng cửa sổ exit `0`, stderr không có `Object has been destroyed`.
- [x] Build NSIS local đạt; packaged basic/region smoke đạt và title/header đúng v1.2.2.
- [x] Bốn JPG người dùng trong `Input` được giữ nguyên ở trạng thái untracked, không stage/commit/tag.
- [x] Tag `v1.2.2` trỏ đúng commit `fcd9e15487697264810d52ba00d39566fae86c54`, package version khớp.
- [ ] Windows CI và Release Windows workflow trên tag/commit v1.2.2 đạt. GitHub Actions đang `major_outage` và chưa tạo run; dùng fallback thủ công từ `git archive v1.2.2` sạch.
- [x] GitHub Release ID `366391357` của v1.2.2 là stable/public, không prerelease, có đúng Setup, blockmap và `latest.yml`; `/releases/latest` trỏ đúng Release này.
- [x] Tải lại ba asset và xác minh độc lập: installer 104,334,963 byte, SHA-256 `BF99CAD9F7BBB405C5ECFD8A5FF5DAD970562619E71FB9E70523CB32C9FB1F13`; `latest.yml` khớp version/path/size/SHA-512.

## E4. Kiểm tra release v1.2.3

- [x] `package.json`, `package-lock.json` và package root trong lockfile cùng version `1.2.3`.
- [x] Cấu hình NSIS giữ assisted installer và bật `allowToChangeInstallationDirectory: true`.
- [x] Kiểm thử cấu hình xác nhận template NSIS có trang `MUI_PAGE_DIRECTORY`, bỏ qua trang này khi update và tự thêm thư mục con `${APP_FILENAME}`.
- [x] Chạy toàn bộ automated tests: 73/73 đạt; 0 fail, 0 skipped/todo.
- [x] Build sạch từ source đã track, không đưa bốn JPG người dùng trong `Input` vào payload.
- [x] Installer 104.341.579 byte, blockmap 109.625 byte và `latest.yml` 363 byte cùng version; size/SHA-512 khớp. SHA-256 installer `72F630F927D86DF7ABDA8748759A546B5A2492E6BF12597176BCA19C86FF02DA`; Authenticode NotSigned.
- [ ] Kiểm thử tương tác trên máy/VM sạch: trang chọn thư mục xuất hiện và cài đúng vị trí tùy chọn.
- [ ] Kiểm thử nâng cấp tại chỗ từ v1.2.2: giữ nguyên `InstallLocation`, `Input` và shortcut.
- [x] Push commit `16d802c` và tag `v1.2.3`; GitHub Release ID `366396345` stable/public có đúng ba asset và `/releases/latest` trỏ đúng bản mới.
- [x] Tải ngược cả ba asset: SHA-256 installer `72F630F927D86DF7ABDA8748759A546B5A2492E6BF12597176BCA19C86FF02DA`, blockmap `9F3F4B42F88D0D39C74090C5CF32554AD4090C4A4611589EDEBD717B9B909245`, `latest.yml` `B94F8F013D4DD8AF32E75EF65533B7A6CF271C5846DAAC74C41B4E34FC39263E`; metadata updater khớp installer remote.
- [ ] Windows CI/Release Windows workflow chạy trên tag/commit v1.2.3; GitHub Actions vẫn `major_outage` và chưa tạo run, nên Release dùng fallback thủ công đã xác minh.

## E5. Release v1.2.3 thay thế — làm gọn thư mục cài đặt

- [x] Không xóa runtime; chỉ dùng `SetFileAttributes` với danh sách chính xác, không wildcard hoặc vòng lặp chạm file lạ.
- [x] `Input`, `${APP_EXECUTABLE_FILENAME}` và `${UNINSTALL_FILENAME}` không nằm trong danh sách ẩn.
- [x] Danh sách ẩn khớp Electron `43.2.0`: hai thư mục và 17 runtime file Electron, cộng `uninstallerIcon.ico`.
- [x] Working tree và clean source cùng đạt 73/73 test; clean `npm ci` báo 0 vulnerability.
- [x] Clean NSIS build đạt; `Input` packaged chỉ có README/PDF đã track; installer/latest metadata khớp.
- [x] Silent install vào custom path: chỉ ba mục người dùng hiển thị, 20 mục kỹ thuật Hidden, 0 mục ReadOnly.
- [x] Packaged smoke đạt 16/16 check; headless Input backup thoát `0` và tạo snapshot đúng.
- [x] Đối chứng silent-uninstall bằng installer v1.2.3 public cho cùng kết quả sandbox như installer mới, nên không có hồi quy quan sát được do Hidden.
- [ ] Cài/gỡ và nâng cấp tương tác trên Windows Sandbox/VM sạch ngoài registry sandbox của Codex.
- [x] Tạo installer QA local SHA-256 `53A60FB9162A185CC48B304BBC40D64E591A590B1FB291C78E86F2DFAD3D78DB`; artifact phát hành sẽ được build lại từ commit chốt.
- [x] Viết `docs/MANUAL-GITHUB-UPDATE.md`; hướng dẫn tránh `git add .` và xác minh đúng ba Release asset.
- [x] Build lại đủ ba artifact sạch cùng version 1.2.3 từ commit `775d567`; installer SHA-256 `E9557F175F6489F1509300D28996675A971CEFD22A9F221BD1CCC5710D915339`, metadata size/SHA-512 khớp và packaged `Input` chỉ có hai file đã track.
- [x] Xóa Release ID `366396345` cùng remote tag cũ, trỏ annotated tag `v1.2.3` sang commit `33f8b95` và push `main`.
- [x] Publish Release thay thế ID `366501729`; tải ngược đúng ba asset và xác minh SHA-256 từng byte, updater metadata, endpoint theo tag cùng `/releases/latest`.
- [x] Xử lý race từ workflow tag cũ: đưa Release về draft, hủy run đúng commit `31144270671`, xóa ba asset cũ do run `31144247866` tạo và chỉ public lại sau khi asset mới khớp.

## E6. v1.2.4 — uninstall sạch nhưng giữ Input

- [x] `package.json`, `package-lock.json` và package root cùng version `1.2.4`.
- [x] `deleteAppDataOnUninstall` bật; template electron-builder chỉ xóa AppData khi gỡ thật, không xóa trong update.
- [x] Gỡ thật xóa updater cache trong LocalAppData; update không chạy bước này.
- [x] `customRemoveFiles` không dùng `RMDir /r $INSTDIR`; chỉ xóa chính xác runtime/app files và giữ `Input` cùng file riêng không thuộc app.
- [x] Luồng update giữ `un.atomicRMDir`/`un.restoreFiles` và backup/restore `Input` hiện có.
- [x] Marker nội bộ của app bị xóa khỏi `Input` khi uninstall thật; nội dung còn lại trong `Input` được giữ.
- [x] Không có lệnh quét/xóa `Done`, PNG nguồn, mockup hoặc PDF bên ngoài thư mục cài đặt.
- [x] Automated tests đạt 73/73; NSIS v1.2.4 build thành công.
- [ ] Cài–gỡ tương tác trên Windows/VM bình thường: xác nhận chỉ còn `Input`/file riêng tại install path và AppData/updater cache đã mất. Registry sandbox hiện trả exit `0` nhưng không thực thi phần xóa nên không được tính là đạt.
- [x] Build sạch artifact từ commit `152a51e`; packaged `Input` chỉ có README/PDF đã track, installer SHA-256 `E5B71C2A614EEF788B31F815F4ED6914539716A79FCA88074156EF9082CD25D9` và updater metadata khớp.
- [x] Push commit `7d52662`/tag `v1.2.4`; Windows CI `31148857568` và Release Windows `31148871833` success.
- [x] Release ID `366528649` public/stable có đúng ba asset; tải ngược xác minh checksum/metadata và `/releases/latest` trỏ đúng v1.2.4.

## F. Sign-off

| Hạng mục | Người kiểm tra | Ngày | Kết quả/Ghi chú |
| --- | --- | --- | --- |
| v1.2.0 automated tests | Codex local QA | 2026-08-06 | 26/26 đạt; npm audit runtime 0 vulnerabilities. |
| Manual core features |  |  |  |
| Path persistence |  |  |  |
| v1.2.0 installer/shortcut/footprint | Codex local QA | 2026-08-06 | NSIS build, cài/chạy/gỡ local, shortcut target/icon, packaged smoke và footprint đạt; chưa test standard-user/VM sạch. |
| v1.2.0 GitHub updater | Codex local QA | 2026-08-07 | Bản packaged v1.2.0 nhận đúng stable v1.2.1 và action `download`; không bấm tải/cài nên phần restart/cài đè còn chờ. |
| v1.2.0 release artifacts | Codex + GitHub Actions | 2026-08-06 | Chỉ còn một stable v1.2.0; có đủ Setup, blockmap, latest.yml; `/releases/latest`, notes, version/size/digest đã xác minh. |
| v1.2.1 automated tests | Codex local QA | 2026-08-07 | 66/66 đạt sau `npm ci`; 0 fail/skipped/todo; production audit 0 vulnerabilities. |
| v1.2.1 local core/PDF/single | Codex local QA | 2026-08-07 | PDF mẫu thật render/click annotation/text extraction đạt; integration bundle + single + PDF chung `Done` đạt; source/package basic+region smoke đều PASS. |
| v1.2.1 installer/Input footprint | Codex local QA | 2026-08-07 | NSIS 104,334,512 byte, blockmap 109,600 byte, `latest.yml` SHA-512 khớp; headless Input backup exit `0`, single-instance lock exit `3` và packaged basic+region smoke đạt; SHA-256 local `6723…C9C0`; Authenticode NotSigned. |
| Live updater v1.2.0 → v1.2.1 | Codex local QA | 2026-08-07 | Auto-check/thông báo version mới đạt; download, restart/cài và xác minh dữ liệu sau nâng cấp chưa chạy. |
| v1.2.1 release artifacts | Codex + GitHub Actions + manual fallback | 2026-08-07 | Release ID `366371391` stable/public, đúng ba asset, `/releases/latest` và checksum/metadata remote đạt; Windows CI `31126793200` success. Release Windows `31126661713` bị cancelled trước runner/step; asset public giữ nguyên. |
| v1.2.2 hotfix QA/release | Codex local QA + manual fallback | 2026-08-07 | 73/73 test; source/package QA đạt; Release ID `366391357` public với đúng ba asset sạch và checksum tải ngược khớp. GitHub Actions major outage, chưa tạo run cho v1.2.2. |
| v1.2.3 installer path QA/release | Codex local QA + manual fallback | 2026-08-07 | Bản phát hành ban đầu ID `366396345` đã được xóa và thay thế theo yêu cầu chủ dự án. Cài mới custom path và nâng cấp tại chỗ trên máy/VM sạch còn chờ. |
| v1.2.3 replacement hidden-runtime QA/release | Codex local QA + GitHub API | 2026-08-07 | 73/73 clean test; silent install đúng 3 mục hiện/20 mục kỹ thuật Hidden/0 ReadOnly; smoke 16/16 và Input backup đạt. Tag trỏ `33f8b95`; Release ID `366501729` stable/public có đúng ba asset tải ngược khớp và là `/releases/latest`. |
| v1.2.4 clean uninstall QA/release | Codex local QA + GitHub Actions | 2026-08-07 | 73/73 test; clean build/Input payload đạt; CI và Release workflow success. Release ID `366528649` có đúng ba asset tải ngược khớp. Uninstall tương tác ngoài registry sandbox còn chờ. |

Chỉ tạo tag stable khi tất cả mục bắt buộc đã hoàn tất hoặc mọi ngoại lệ đã được ghi rõ trong release notes và được chấp thuận.
