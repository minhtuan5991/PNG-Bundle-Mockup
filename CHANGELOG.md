# Changelog

Các thay đổi đáng chú ý của PNG Bundle Mockup được lưu tại đây. Dự án dùng phiên bản Semantic Versioning.

## [Unreleased]

Chưa có thay đổi sau v1.4.4.

## [1.4.4] - 2026-08-25

### Fixed

- Popup **Đặt tên Group Shirt** không còn tự chọn toàn bộ PNG khi mở; chỉ thumbnail được người dùng chọn rõ ràng mới nằm trong payload đổi tên.

### Changed

- Popup bắt đầu ở trạng thái `0/N`; **Chọn tất cả đang hiện** vẫn cho phép bulk edit có chủ ý, còn tìm kiếm và bỏ chọn tiếp tục chỉ tác động gallery đang hiển thị.
- Thumbnail đổi tên tăng từ `54×50 px` lên `80×76 px`; card cao tối thiểu `92 px` và cột gallery rộng tối thiểu `178 px` để nhận diện thiết kế rõ hơn mà không cắt ảnh.
- Nâng version ứng dụng và bộ cài lên `1.4.4`; phát hành bằng tag mới, không ghi đè v1.4.3.

### QA

- Automated tests **124/124** đạt; Electron source và packaged smoke đều **23/23** đạt, gồm `renameSelectionOnly`.
- ASAR v1.4.4 chứa đúng selection rỗng ban đầu, helper lọc path đã chọn và CSS thumbnail mới; updater metadata khớp installer, packaged `Input` chỉ giữ README/PDF mẫu.

## [1.4.3] - 2026-08-25

### Added

- Popup **Đặt tên Group Shirt** có thêm nút **Đổi Tên** để lưu tên file nhưng giữ popup mở, thuận tiện xử lý liên tiếp nhiều nhóm/tag.

### Changed

- Nút lưu và đóng được đặt tên rõ là **Đổi tên và Đóng**; nút **Hủy**, dấu × và phím Esc chỉ đóng popup mà không áp dụng thay đổi chưa lưu.
- Sau khi dùng **Đổi Tên**, gallery và tập file đang chọn được chuyển sang đường dẫn mới để tiếp tục đổi tag mà không tham chiếu tên cũ.
- Nâng version ứng dụng và bộ cài lên `1.4.3`; phát hành bằng tag mới, không ghi đè v1.4.2.

### QA

- Automated tests **122/122** đạt; Electron source và packaged smoke đều **22/22** đạt.
- ASAR v1.4.3 chứa đủ ba hành vi nút; updater metadata khớp installer và packaged `Input` chỉ giữ README/PDF mẫu.

## [1.4.2] - 2026-08-24

### Changed

- Mọi ảnh nền có marker `mgs` nay là template dùng chung cho tất cả nhóm PNG; số hoặc chữ cạnh `mgs` chỉ còn là nhãn tên file.
- Planner và validation giao diện bỏ khóa exact group của template, xét toàn bộ nền `mgs` rồi chỉ lọc bằng các track màu áo/mặt áo trong vùng in đã lưu.
- Tên chỉ có marker `mgs`, ví dụ `mgs.jpg`, cũng được nhận là ảnh nền Group Shirt hợp lệ.
- Nâng version mã nguồn và bộ cài lên `1.4.2`; phát hành bằng tag mới, không ghi đè v1.4.1.

### Compatibility

- Không đổi schema hoặc khóa lưu vùng in; thiết lập đã lưu cho `.mgs1`, `.mgs2`, `.mgs3` tiếp tục được dùng.
- Không thay đổi logic chia nhóm PNG, màu `.wh/.bl`, mặt `.f/.b`, lặp nguồn, tạo trang, Bundle, PDF Download hoặc mockup đơn.

### QA

- Automated tests **121/121** đạt; Electron source và packaged smoke đều **21/21** đạt.
- Bổ sung test một nền dùng cho nhiều nhóm, cross-product nhóm × nền tương thích, không trộn nguồn giữa nhóm và tên output không trùng.
- Build local tạo đủ Setup, blockmap và `latest.yml`; `app.asar` v1.4.2 chứa shared-template planner/renderer và packaged `Input` chỉ có hai file allowlist.

## [1.4.1] - 2026-08-23

### Fixed

- Sửa parser ảnh nền Group Shirt để `.mgs1.jpg`/`mgs1.jpg` khớp đúng nhóm PNG `1`; đồng thời `1.mgs.jpg` không còn bị hiểu nhầm thành nhóm `1.`. Dạng chuẩn `1 mgs.jpg` và biến thể phía sau marker vẫn tương thích.
- Khôi phục helper `groupSourceDirectory` bị xóa nhầm khi nâng v1.4.0, loại bỏ lỗi runtime `groupSourceDirectory is not defined` khi Preview hoặc Tạo Mockup Group Shirt.

### Changed

- Hướng dẫn chọn nền trong app và README hiển thị rõ hai dạng tên `1 mgs.jpg` và `.mgs1.jpg`.
- Nâng version ứng dụng và bộ cài lên `1.4.1`.

### QA

- Thêm test parser/planner/renderer cho hai regression; toàn bộ **119/119** automated test, source smoke **20/20** và packaged smoke **20/20** đạt. Vùng in cũ vẫn dùng lại theo path/fingerprint của ảnh nền.

## [1.4.0] - 2026-08-23

### Added

- Group Shirt hỗ trợ **Tạo PDF Download** với cùng quy tắc chỉ một PDF trong mỗi thư mục `Done` như Bundle.
- Vùng in Group Shirt lưu thêm màu áo sáng/tối; giao diện có hai checkbox loại trừ, không chọn mặc định áo sáng, và bốn kiểu hiển thị riêng cho sáng/tối × trước/sau.
- Thêm planner theo bốn profile tên PNG: không tag, chỉ tag mặt, chỉ tag màu và đủ tag màu+mặt.
- Thêm test hồi quy cho marker `bundle`, marker nền `mgs`, tỷ lệ vùng 42×48, trang thừa/thiếu, lặp ngẫu nhiên đúng track và PDF trong Group Shirt.

### Changed

- Mockup đơn ở cả Bundle và Group Shirt chỉ dùng ảnh Input có chữ `bundle` trong tên; Group Shirt chỉ chọn PNG áo sáng (`.wh` hoặc không gắn tag màu) làm nguồn ngẫu nhiên.
- Ảnh nền Group Shirt bắt buộc có marker `mgs`; phần tên trước marker được so khớp chính xác với tên nhóm PNG trước `(số)`.
- Vùng in Group Shirt khóa tỷ lệ pixel `42×48` khi tạo, scale, nhập kích thước và xoay.
- Mỗi track màu/mặt ghép PNG theo thứ tự. Vùng thiếu được lấp ngẫu nhiên bằng PNG trong đúng track/cùng nhóm; PNG thừa tạo thêm trang và các vùng còn thiếu của trang mới cũng được lấp đúng track.
- Schema vùng Group Shirt tăng lên 2; cấu hình schema 1 hợp lệ được di trú thành vùng áo sáng.
- Nâng version ứng dụng và bộ cài local lên `1.4.0`.

### Compatibility

- Giữ nguyên Bundle grid, kéo-thả, watermark, xóa metadata, quy tắc một PDF/Done và một bộ mockup đơn/Done.
- v1.4.0 được phát hành qua tag riêng; không ghi đè tag hoặc asset của các bản public trước.

## [1.3.0] - 2026-08-19

### Added

- Tách luồng tạo ảnh thành hai lựa chọn loại trừ: **Mockup Bundle PNG** và **Mockup Group Shirt**.
- Group Shirt phân tích group, số thứ tự, màu áo `.wh/.bl` và mặt áo `.f/.b`; tag input terminal có thể ở bất kỳ thứ tự nào, tên thiếu tag mặc định áo sáng/mặt trước và công cụ rename luôn ghi thứ tự canonical màu rồi mặt.
- Chọn nhiều ảnh nền có marker `mkg` và so khớp chính xác phần tên trước `mkg` với group PNG.
- Thêm công cụ đổi tên hàng loạt PNG trên ổ đĩa theo transaction hai phase, kiểm tra collision và rollback khi lỗi.
- Thêm trình chỉnh nhiều vùng in mặt trước/sau trên từng nền, hỗ trợ di chuyển, resize, xoay, nhập số, phím mũi tên và lưu lâu dài.
- Thêm planner/engine Group Shirt: crop alpha thật, trang cuối để trống vùng thiếu nguồn thay vì lặp PNG, hỗ trợ nhiều template variant, watermark lớp trên cùng, xóa metadata cuối và rollback toàn bộ batch.
- Output Group Shirt dùng tên ổn định `group-shirt_<tên nền>_<trang>.png`, có suffix phân biệt stem trùng và revision collision-safe.
- Thêm 41 automated tests mới cho naming, rename, planner, region store/fingerprint, compositor/metadata/EXIF Orientation, IPC capability, UI contract và version integration.

### Changed

- Ghi nhớ thêm đường dẫn ảnh nền Group Shirt gần nhất.
- Group Shirt ẩn và chặn tạo PDF Download; mockup đơn chỉ lấy PNG áo sáng hoặc PNG không gắn tag màu.
- Watermark và quy tắc xóa/giữ metadata hiện áp dụng nhất quán cho Bundle, Group Shirt và mockup đơn.
- Nâng version ứng dụng và bộ cài lên `1.3.0`.

### Security

- Preview/generate/đổi tên/lưu vùng Group Shirt chỉ chấp nhận source và template đã được người dùng chọn trong đúng renderer session.
- Installer dùng allowlist `Input/README.txt` và PDF mẫu đã track; ảnh/PDF riêng trong `Input` local không bị gom vào artifact phát hành.

### Compatibility

- Luồng Bundle, PDF Download, mockup đơn, watermark, metadata, kéo-thả và **Loại bỏ PNG** giữ nguyên hành vi của v1.2.5.

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
