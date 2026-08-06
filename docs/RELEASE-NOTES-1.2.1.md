# PNG Bundle Mockup v1.2.1

> Trạng thái phát hành: v1.2.1 đã được publish stable/public ngày 2026-08-07 tại [GitHub Release v1.2.1](https://github.com/minhtuan5991/PNG-Bundle-Mockup/releases/tag/v1.2.1). Automated QA, Windows CI, source/package smoke, headless Input backup, ba asset GitHub và lượt phát hiện update `v1.2.0 → v1.2.1` đều đã xác minh. Cài mới tương tác và lượt tải/cài nâng cấp hoàn chỉnh vẫn là kiểm tra hậu phát hành còn lại.

## Điểm mới

- Kéo-thả trực tiếp nhiều file PNG từ File Explorer vào vùng danh sách ở bước 1. Có thể chọn các file nằm ở nhiều thư mục; file trùng, file không phải PNG hoặc file không đọc được được bỏ qua/báo rõ.
- Thêm thư mục `Input` cạnh file EXE của ứng dụng đã cài. Nút **Mở Input** mở đúng thư mục mà app đang sử dụng.
- Tài sản người dùng trong `Input` được snapshot bền vững dưới `userData` và tự khôi phục nếu NSIS tạo lại thư mục cài đặt khi cập nhật/cài lại.
- Thêm **Tạo PDF Download** ở bước 2. App lấy một PDF mẫu duy nhất trong `Input`, thay URL đích của nút Download và các vùng link hiển thị, vẽ lại URL nhìn thấy rồi lưu một PDF mới vào `Done`.
- Thêm **Tạo mockup đơn** ở bước 2. App đọc ảnh mockup áo, cốc, túi, ... trong `Input`, chọn PNG nguồn ngẫu nhiên và tạo một file cho mỗi ảnh mẫu.
- Thêm **Chỉnh vùng in mockup đơn** trong Thiết lập nâng cao. Vùng in có tỷ lệ cố định `42:48` (`7:8`), có thể kéo, di chuyển và đổi kích thước trên Preview.
- Vùng in được lưu theo tên và kích thước từng ảnh mẫu trong hồ sơ người dùng. Thiết lập được dùng lại cho đến khi ảnh đổi kích thước hoặc người dùng lưu thiết lập mới.
- JPEG/TIFF có EXIF Orientation được xoay đúng theo chiều nhìn thấy trước khi app tính vùng in.

## Chuẩn bị thư mục Input

Trong bản đã cài, `Input` nằm cùng cấp với `PNG Bundle Mockup.exe`.

- Để tạo PDF Download, chỉ giữ đúng **một** file `.pdf` trong `Input`.
- Để tạo mockup đơn, thêm các ảnh `.png`, `.jpg`, `.jpeg`, `.webp`, `.tif` hoặc `.tiff` trực tiếp vào `Input`.
- PDF và ảnh mockup đơn có thể nằm chung trong `Input`; mỗi chức năng chỉ đọc đúng loại tài sản của mình.
- PDF mẫu `Toystory HLW1.pdf` đi kèm bản cài đã được làm phẳng và dùng URL placeholder; link Drive cũ không còn trong file được phát hành.
- App tự đồng bộ snapshot khi khởi động, quét/lưu `Input`, tạo output bổ sung và ngay trước khi cài update. Bản sao ngoài app vẫn được khuyến nghị cho tài sản quan trọng.

## Cách dùng PDF Download

1. Mở `Input` và đặt vào một PDF mẫu có nút Download cùng dòng URL hiển thị đang trỏ đến cùng URL cũ.
2. Bật **Tạo PDF Download**.
3. Nhập link tải `http://` hoặc `https://`.
4. Tạo mockup như bình thường.

App cập nhật annotation của nút và dòng link trên từng trang, thay các chuỗi URL liên quan trong cấu trúc PDF và vẽ lại link hiển thị. PDF mới được ghi vào file tạm rồi commit nguyên tử; thao tác Hủy không để lại file dở dang. PDF giữ tên file mẫu; nếu tên đã tồn tại trong `Done`, app thêm `_2`, `_3`, ... thay vì ghi đè.

## Cách dùng mockup đơn

1. Thêm ảnh mockup đơn vào `Input`.
2. Mở **Thiết lập nâng cao**, bật **Chỉnh vùng in mockup đơn**.
3. Chỉnh vùng `42×48` trên từng ảnh trong Preview rồi bấm **Lưu vùng in**.
4. Bật **Tạo mockup đơn** và chạy tạo mockup.

App tạo một output cho mỗi ảnh mẫu. Số PNG nguồn được chọn ngẫu nhiên bằng số ảnh mẫu; nếu số ảnh mẫu lớn hơn số PNG đã chọn, PNG có thể được dùng lại ở vòng xáo trộn tiếp theo. Thiết kế được crop theo alpha thật và đặt theo kiểu `contain` trong vùng in.

## Watermark và đầu ra

- Nếu bật **Gắn Watermark**, watermark được composite sau thiết kế và luôn nằm trên lớp trên cùng của cả mockup bundle lẫn mockup đơn.
- Mockup bundle, mockup đơn và PDF Download được lưu chung vào `<thư mục nguồn chính>\Done`.
- Khi PNG được kéo từ nhiều thư mục, thư mục nguồn chính đang hiển thị trong app quyết định vị trí `Done`; nếu bắt đầu hoàn toàn bằng kéo-thả, app dùng thư mục của file hợp lệ đầu tiên.
- Mọi loại output đều tránh ghi đè bằng hậu tố tên file.

## Cài đặt và cập nhật

Người dùng mới tải `PNG-Bundle-Mockup-Setup-1.2.1.exe` từ Assets của [GitHub Release chính thức](https://github.com/minhtuan5991/PNG-Bundle-Mockup/releases/tag/v1.2.1). Người đang dùng installer v1.2.0 có thể kiểm tra, tải và cài v1.2.1 ngay trong app; Release stable/public có đủ:

- `PNG-Bundle-Mockup-Setup-1.2.1.exe`
- `PNG-Bundle-Mockup-Setup-1.2.1.exe.blockmap`
- `latest.yml`

Bản portable v1.1.0 không có updater; người dùng portable vẫn phải cài bản Setup thủ công để chuyển sang kênh cập nhật GitHub.

## Thay đổi kỹ thuật

- Thêm dependency runtime `pdf-lib` để đọc, sửa annotation và vẽ URL trong PDF.
- Thêm các service độc lập cho thư mục `Input`, kéo-thả PNG, PDF Download, vùng in và tạo mockup đơn.
- Thêm service snapshot/khôi phục `Input` dùng staging để không biến một lần backup lỗi thành nguồn phục hồi.
- Installer đóng gói thư mục `Input` cạnh EXE; cấu hình nhận diện app và kênh updater GitHub được giữ nguyên để hỗ trợ nâng cấp tại chỗ.
- Updater chỉ cài khi người dùng bấm nút cài đặt, sau khi snapshot `Input` hoàn tất; đóng app thông thường không tự cài ngầm.
- Installer assisted ép cài mới theo tài khoản hiện tại tại vị trí writable cố định để `Input` ghi được, đồng thời giữ install-mode/vị trí của v1.2.0 khi nâng cấp để xử lý đúng cả bản All Users/custom path hiện có. Với nhánh All Users, installer chỉ cấp quyền Modify cho thư mục `Input`.
- Trước khi gỡ hoặc thay thế bản cài, NSIS gọi chế độ đồng bộ `Input` headless và dừng quy trình nếu không thể bảo toàn tài sản.
- App chặn restart/cài update khi đang xử lý hoặc còn mở trình chỉnh vùng in; đóng cửa sổ giữa lúc tạo output sẽ hủy và rollback xong rồi mới thoát, còn vùng in chưa lưu sẽ được cảnh báo trước khi đóng.
- App chỉ cho phép một tiến trình tương tác; mở app lần nữa sẽ khôi phục/đưa cửa sổ đang chạy lên trước. Nếu tiến trình headless `--sync-input-backup` gặp app đang giữ single-instance lock, nó thoát mã `3`, vì vậy update/uninstall dừng an toàn thay vì tiếp tục khi chưa backup được `Input`.

## Xác minh bản phát hành

| Hạng mục | Kết quả |
| --- | --- |
| Automated tests | **66/66 đạt** sau `npm ci`; 0 fail, 0 skipped/todo; production audit 0 vulnerabilities. |
| Source smoke | Basic UI và trình chỉnh vùng in trên source final đều PASS; title/header đúng v1.2.1. |
| Packaged smoke | Basic UI và trình chỉnh vùng in trên payload `win-unpacked` đều đạt. |
| Headless Input backup/single-instance | Chế độ `--sync-input-backup` độc lập đồng bộ thành công và thoát `0`; tiến trình headless thứ hai khi app đang giữ lock bị chặn và thoát `3`. NSIS coi mọi mã khác `0` là lỗi và dừng update/uninstall; lượt hook tương tác hoàn chỉnh vẫn thuộc kiểm thử installer/live bên dưới. |
| NSIS installer và ba update artifact | Build local đạt; installer **104,334,512 byte**, blockmap **109,600 byte**; `latest.yml` cùng version/path/size và SHA-512 khớp installer. |
| SHA-256 installer local | `6723EF04ACE0595DEAD7C606A5F66C39F9608D2DFDE470ED73FA24ED775AC9C0` |
| Chữ ký Authenticode local | **NotSigned**. |
| GitHub Release | Release ID `366371391` là stable/public, không prerelease; `/releases/latest` trỏ đúng `v1.2.1` và chỉ có đúng ba asset bắt buộc. |
| Checksum installer GitHub | Asset public đã được tải ngược và tính checksum độc lập: SHA-256 `6723EF04ACE0595DEAD7C606A5F66C39F9608D2DFDE470ED73FA24ED775AC9C0`; `latest.yml` public có SHA-256 `64407FAE9A0EEF3041C6BEA1BC031499F941C962DA0C94DBA5BFC84BBAD9911B` và khớp version/path/size/SHA-512 của installer remote. |
| Updater v1.2.0 | Bản installer v1.2.0 đang cài đã tự mở hộp thoại **Có phiên bản mới**, hiển thị `v1.2.0 → v1.2.1`, nút **Tải cập nhật** và action `download`. Không bấm tải/cài; app được đóng sau kiểm tra và bản v1.2.0 được giữ nguyên. |
| GitHub Actions | Windows CI thử lại trên đúng tag/commit đã **đạt** tại run [`31126793200`](https://github.com/minhtuan5991/PNG-Bundle-Mockup/actions/runs/31126793200): checkout, Node 22, `npm ci`, regression tests và package unpacked đều success. Run đầu `31125907971` bị hủy trước runner trong outage. Workflow phát hành theo tag được giao trễ thành run [`31126661713`](https://github.com/minhtuan5991/PNG-Bundle-Mockup/actions/runs/31126661713), vẫn queued; cancel/force-cancel trả 500/502. Workflow fail-closed trước Release public nên không thể ghi đè ba asset đã phát hành. |
| Cài mới trên Windows x64 | Chưa chạy để tránh ghi đè bản v1.2.0 đang được dùng trên máy QA; payload đóng gói đã smoke trực tiếp. |
| Nâng cấp live `v1.2.0 → v1.2.1` | Phần phát hiện/thông báo update đã đạt. Chưa chạy download, restart và cài đè để tránh thay đổi bản v1.2.0 cùng dữ liệu thật trên máy QA. |
| Bảo toàn dữ liệu | Unit test snapshot/restore và headless backup đạt. Lượt `v1.2.0 → v1.2.1` sẽ kiểm tra preferences/localStorage/Done; persistence của `Input` và vùng in được kiểm tra riêng từ v1.2.1 vì v1.2.0 chưa có hai dữ liệu này. |

## Lưu ý

- PDF mẫu phải có cấu trúc link phù hợp; app từ chối PDF không tìm được cả vùng nút và vùng link hiển thị.
- Nếu thay tên hoặc kích thước ảnh mockup đơn, hãy mở trình chỉnh và lưu lại vùng in.
- Installer hiện chưa có chứng thư code-signing thương mại. Windows SmartScreen có thể hiển thị **Unknown Publisher**; chỉ tải từ GitHub Release chính thức của dự án.
