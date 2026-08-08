# Changelog

Các thay đổi đáng chú ý của PNG Bundle Mockup được lưu tại đây. Dự án dùng phiên bản Semantic Versioning.

## [Unreleased]

Chưa có thay đổi sau v1.2.5.

## [1.2.5] - 2026-08-09

### Added

- Thêm nút **Loại bỏ PNG** ở cuối danh sách để xóa toàn bộ PNG đã nạp khỏi phiên làm việc mà không xóa file gốc trên máy.

### Changed

- Bỏ dòng “Giữ nguyên thứ tự tên file” ở góc dưới danh sách PNG.
- Khi loại bỏ PNG, app đồng thời xóa lựa chọn, thư mục nguồn/đích `Done` và preview kết quả cũ để lượt kéo-thả tiếp theo dùng đúng thư mục của bộ PNG mới; ảnh nền, watermark và thiết lập vẫn được giữ để tái sử dụng.

## [1.2.4] - 2026-08-07

### Changed

- Uninstall thật xóa runtime, shortcut/registry, AppData, cache Chromium và updater cache nhưng giữ nguyên thư mục `Input` tại vị trí cài đặt.
- Quá trình update vẫn giữ cơ chế backup/restore `Input`; các thư mục `Done`, PNG nguồn, mockup và PDF nằm ngoài thư mục cài đặt không bị quét hoặc xóa.
- Uninstaller dùng danh sách file/thư mục app chính xác thay vì xóa đệ quy toàn bộ thư mục cài đặt, tránh chạm file cá nhân không thuộc app.

### Fixed

- Mockup đơn chỉ được tạo một lần cho mỗi thư mục `Done`. Nếu đã có file `single_*.png`, app giữ nguyên kết quả cũ và bỏ qua trước khi kiểm tra PNG nguồn, ảnh mẫu hoặc vùng in.

## [1.2.3] - 2026-08-07

### Changed

- Bộ cài assisted hiển thị trang chọn thư mục cho lần cài mới. NSIS vẫn tự thêm thư mục con `PNG Bundle Mockup` nếu người dùng chỉ chọn thư mục cha.
- Khi cập nhật bản đã cài, trang chọn vị trí được tự động bỏ qua và app tiếp tục nâng cấp tại đúng thư mục hiện có, tránh tạo bản cài trùng.
- Bộ cài thay thế gắn thuộc tính Hidden cho các thư mục/file kỹ thuật của Electron. `Input`, file mở app và file gỡ cài đặt vẫn hiển thị; không xóa bất kỳ runtime bắt buộc nào.
- Bổ sung hướng dẫn phát hành GitHub thủ công cho chủ dự án.

## [1.2.2] - 2026-08-07

### Fixed

- **Tạo mockup đơn** và **Chỉnh vùng in mockup đơn** luôn có thể được chọn; app đọc lại `Input` ngay khi bật tùy chọn thay vì khóa điều khiển theo kết quả quét cũ.
- Trình chỉnh vùng in nhận đúng toàn bộ ảnh mẫu, hiển thị từng trang Preview và cho phép kéo/đổi kích thước vùng `42:48` như thiết kế.
- Checkbox PDF/mockup đơn không còn làm cửa sổ cuộn lệch xuống vùng nền tối; ô URL PDF được focus mà không cuộn toàn bộ trang.
- Khi đóng app, handler dọn trạng thái không còn đọc `webContents` của `BrowserWindow` đã bị hủy, nên không còn popup `Object has been destroyed`.
- PDF đã có trong `Done` không bị tính là output mới hoặc bị đưa vào danh sách rollback của lượt hiện tại.

### Changed

- Luồng **Tạo PDF Download** chỉ tạo PDF khi `Done` chưa có file `.pdf` nào. Nếu đã có PDF, app bỏ qua bước này, giữ nguyên các file hiện có và không tạo hậu tố `_2`, `_3`, ...
- Kiểm tra PDF hiện có được thực hiện trước URL và PDF mẫu; vì vậy một lượt chạy lại có thể bỏ qua PDF an toàn ngay cả khi URL trống hoặc PDF mẫu không còn trong `Input`.
- Giao diện báo rõ PDF đã được bỏ qua và không cộng file đó vào tổng số file vừa tạo.
- Bổ sung kiểm thử hồi quy cho checkbox, vòng đời cửa sổ và quy tắc một PDF; tổng kiểm thử tự động tăng lên 73.

## [1.2.1] - 2026-08-07

Phát hành stable/public ngày 2026-08-07. Trạng thái QA, ngoại lệ GitHub Actions và phần nâng cấp live còn lại được theo dõi trong `docs/REGRESSION-CHECKLIST.md`.

### Added

- Tạo thư mục `Input` cạnh file EXE của bản đóng gói; khi phát triển dùng `Input` tại thư mục dự án.
- Kéo-thả trực tiếp nhiều file PNG từ File Explorer vào danh sách, kể cả khi các file nằm ở nhiều thư mục.
- Tùy chọn **Tạo PDF Download**: dùng một PDF mẫu duy nhất trong `Input`, thay URL đích của nút Download, các vùng link hiển thị và vẽ lại URL nhìn thấy; lưu PDF mới vào `Done`.
- Tùy chọn **Tạo mockup đơn**: đọc ảnh mẫu PNG/JPG/WEBP/TIFF trong `Input`, chọn PNG nguồn ngẫu nhiên và tạo một output cho mỗi ảnh mẫu.
- Trình chỉnh vùng in mockup đơn tỷ lệ `42:48` (`7:8`) trong Preview; thiết lập được lưu theo tên và kích thước từng ảnh mẫu để dùng lại.
- Các service và kiểm thử riêng cho Input, kéo-thả PNG, PDF Download, vùng in và mockup đơn.
- Snapshot bền vững của tài sản `Input` trong `userData`, tự khôi phục sau khi installer tạo lại thư mục cài đặt.

### Changed

- Watermark tiếp tục là lớp composite trên cùng đối với mockup bundle và cũng được áp dụng sau cùng cho mockup đơn.
- Mockup bundle, mockup đơn và PDF Download của cùng một lượt được lưu chung vào thư mục `Done`; cơ chế hậu tố tránh ghi đè vẫn được giữ.
- Payload installer bao gồm thư mục `Input` và dependency PDF runtime `pdf-lib`.
- PDF mẫu đi kèm được làm phẳng với URL placeholder để không công khai link Drive cũ; nút và link hiển thị vẫn giữ đúng ba vùng annotation cho app thay thế.
- Luồng GitHub updater tiếp tục dùng installer, blockmap và `latest.yml`; v1.2.1 là bản dùng để kiểm thử nâng cấp live từ installer v1.2.0.
- Cập nhật chỉ được cài khi người dùng bấm **Khởi động lại và cài đặt**, sau khi app đồng bộ snapshot `Input`; đóng app thông thường không tự cài ngầm.
- Installer assisted ép fresh install theo current-user/fixed writable path để `Input` ghi được, nhưng tự giữ install-mode/vị trí của bản v1.2.0 hiện có để nâng cấp đúng cả All Users/custom path mà không tạo app thứ hai.
- Với bản All Users cũ, installer kiểm tra trước và chỉ cấp nhóm Users quyền Modify cho `Input`; registry cũ không còn EXE được bỏ qua, hai bản cài còn sống song song bị từ chối và lỗi ACL dừng cài trước khi thay đổi bản hiện tại.

### Fixed

- Quy trình GitHub Release tạo/sửa draft với đúng bộ installer, blockmap và `latest.yml`, xác minh checksum/metadata trước khi publish; Release public thiếu hoặc sai asset vẫn dừng để phát hành patch mới.
- Không làm mất PDF/ảnh mẫu người dùng đặt trong `Input` khi NSIS cập nhật, gỡ rồi cài lại app; snapshot dùng staging và có thể phục hồi nếu lần ghi trước bị gián đoạn.
- Nếu app không thể ghi `Input` hoặc tạo snapshot ở startup, app hiện lỗi rõ và thoát thay vì mở trong trạng thái chức năng/update bị hỏng.
- Chỉ cho phép một tiến trình app tương tác; lần mở thứ hai khôi phục/đưa cửa sổ hiện có lên trước. Tiến trình `--sync-input-backup` bị single-instance lock chặn sẽ thoát mã `3`, khiến update/uninstall fail-closed thay vì tiếp tục khi chưa bảo toàn `Input`.
- Khóa trình chỉnh vùng in trong lúc lưu để tránh race làm mất thay đổi hoặc báo lỗi sau khi backend đã lưu.
- Tự xoay JPEG/TIFF theo EXIF Orientation trước khi tính vùng in; giữ cấu hình của template tạm vắng và bỏ qua ảnh mockup hỏng khi quét `Input`.
- PDF Download cập nhật đúng từng trang, hỗ trợ Hủy và chỉ công bố file kết quả sau commit nguyên tử; không để lại file tạm/final khi hủy.
- Đóng app giữa tác vụ sẽ đợi hủy/rollback hoàn tất; vùng in chưa lưu được cảnh báo trước khi thoát và cài cập nhật bị khóa trong lúc có tác vụ/thiết lập đang mở.

## [1.2.0] - 2026-08-06

### Added

- Nhớ vị trí thư mục PNG, ảnh nền và watermark trong hồ sơ người dùng Windows.
- Bộ cài NSIS 64-bit với icon, shortcut Desktop và Start Menu.
- Hiển thị phiên bản trong tiêu đề cửa sổ và giao diện.
- Kiểm tra, tải và cài bản cập nhật từ GitHub Releases.
- Workflow Windows CI và phát hành tự động khi đẩy tag `vX.Y.Z`.
- Tài liệu bàn giao, phát hành và kiểm thử hồi quy.

### Changed

- Kênh phân phối chính chuyển từ portable sang installer để hỗ trợ cập nhật online.
- Source, test và script phát triển được đóng trong/loại khỏi bộ cài; người dùng chỉ cần shortcut để mở app.

## [1.1.0] - 2026-08-06

### Added

- Gallery thumbnail để chọn PNG trước khi nạp.
- Tùy chọn watermark PNG trong suốt trên lớp trên cùng.
- Tùy chọn xóa đủ Comment, EXIF, XMP, EXIF thumbnail, IPTC và ICC profile ở bước cuối.

## [1.0.0] - 2026-08-03

### Added

- Chọn PNG và ảnh nền, chia đều thành nhiều mockup.
- Cắt theo vùng alpha thật, tự tính hàng/cột, khoảng cách và vùng lề.
- Preview, tạo thư mục `Done`, tránh ghi đè và hủy tác vụ an toàn.
