# PNG Bundle Mockup

Ứng dụng desktop Windows để chọn PNG bằng hình preview, tự động ghép mockup bundle, tạo mockup đơn theo vùng in đã lưu và tạo PDF Download từ một file PDF mẫu.

## Tính năng

- Chọn thư mục rồi xem gallery thumbnail lớn trước khi quyết định PNG nào được nạp vào app.
- Kéo trực tiếp nhiều file PNG từ File Explorer vào vùng danh sách; các file có thể đến từ nhiều thư mục khác nhau.
- Nhớ vị trí đã chọn gần nhất của thư mục PNG, ảnh nền và watermark cho lần mở hộp thoại tiếp theo.
- Có thể tiếp tục chọn/bỏ từng PNG trong danh sách chính.
- Chọn ảnh nền PNG/JPG/WEBP/TIFF.
- Chia đều file: `30 / 2 → 15 + 15`, `31 / 2 → 16 + 15`.
- Chỉ dùng bounding box của pixel có alpha lớn hơn ngưỡng; canvas trong suốt không làm thiết kế bị thu nhỏ.
- Tự chọn số hàng/cột tối ưu, giữ nguyên tỉ lệ và dùng Lanczos khi resize.
- Lề trên/dưới mặc định 195 px; lề ngang và khoảng cách có thể chỉnh.
- Dùng thư mục `Input` cạnh file EXE để chứa một PDF mẫu và các ảnh mockup đơn PNG/JPG/WEBP/TIFF.
- Tạo **PDF Download** bằng cách thay URL cũ trong nút Download, dòng link hiển thị và các thông tin liên kết liên quan bằng URL mới.
- Tạo một mockup đơn cho mỗi ảnh mockup trong `Input`; PNG nguồn được chọn ngẫu nhiên và đặt vào vùng in tỷ lệ `42:48` (`7:8`) đã lưu riêng theo từng ảnh mẫu.
- Gắn một watermark PNG trong suốt lên lớp trên cùng của cả mockup bundle và mockup đơn.
- Xóa Metadata mặc định ở bước cuối: Comment, EXIF, XMP, EXIF thumbnail, IPTC và ICC profile.
- Preview đúng bố cục và watermark trước khi xuất.
- Lưu mockup bundle, mockup đơn và PDF Download vào cùng thư mục `Done`, không ghi đè kết quả cũ.
- Xử lý nền, hiển thị tiến trình và có thể huỷ an toàn.
- Hiển thị phiên bản ngay trên tên app và kiểm tra cập nhật từ GitHub Releases.
- Bộ cài Windows tạo icon ngoài Desktop và Start Menu; máy người dùng không cần Node.js hay `start-app.bat`.

## Cách sử dụng

1. Nếu cần PDF Download hoặc mockup đơn, chuẩn bị tài sản trong thư mục `Input` theo hướng dẫn bên dưới.
2. Bấm **Chọn thư mục và xem PNG**, hoặc kéo trực tiếp các file `.png` từ File Explorer vào vùng danh sách PNG.
3. Trong cửa sổ thumbnail, chọn các ảnh cần dùng rồi bấm **Nạp X PNG**. Hủy hoặc nhấn `Esc` sẽ giữ nguyên danh sách cũ.
4. Bấm **Chọn ảnh nền mẫu** để chọn nền cho mockup bundle.
5. Giữ **Xóa Metadata** được bật nếu muốn làm sạch sáu nhóm metadata ở các file ảnh bundle và mockup đơn cuối.
6. Nếu cần watermark, bật **Gắn Watermark** và chọn một PNG có pixel nền trong suốt. Watermark cũng được áp dụng cho mockup đơn khi chức năng này được bật.
7. Muốn tạo PDF, bật **Tạo PDF Download** rồi nhập URL tải dạng `http://` hoặc `https://`.
8. Muốn tạo mockup đơn, bật **Tạo mockup đơn**. Lần đầu, mở **Thiết lập nâng cao**, bật **Chỉnh vùng in mockup đơn**, chỉnh vùng `42×48` trên từng ảnh rồi bấm **Lưu vùng in**.
9. Nhập số mockup bundle. Dòng “Chia file” cho biết số PNG trên từng ảnh bundle.
10. Giữ lề trên/dưới ở `195 px` hoặc mở **Thiết lập nâng cao** để điều chỉnh.
11. Bấm **Xem trước**, sau đó bấm **Tạo mockup**.
12. Bấm **Mở thư mục Done** để xem toàn bộ mockup bundle, mockup đơn và PDF Download đã chọn tạo.

App chỉ nhớ vị trí để mở đúng thư mục/file ở lần chọn sau; app không tự nạp lại PNG hoặc tự bật watermark khi khởi động. File đã bị xóa hoặc đổi tên sẽ được bỏ qua an toàn và hộp thoại sẽ mở tại thư mục cha còn tồn tại.

Ảnh nền và watermark nằm trong thư mục nguồn sẽ tự bị loại khỏi danh sách thiết kế. PNG hoàn toàn trong suốt hoặc bị hỏng sẽ được báo tên cụ thể.

## Thư mục Input

- Bản đã cài dùng thư mục `Input` nằm cạnh file `PNG Bundle Mockup.exe`. Nút **Mở Input** trong app mở đúng vị trí này.
- Khi chạy mã nguồn, app dùng `<thư mục dự án>\Input`.
- Chức năng **Tạo PDF Download** yêu cầu `Input` có đúng một file `.pdf`. Nếu có 0 hoặc từ 2 PDF trở lên, app dừng và yêu cầu sửa nội dung thư mục.
- Bản cài kèm `Toystory HLW1.pdf` đã được làm phẳng và dùng URL placeholder an toàn; link Drive cũ trong file người dùng cung cấp không được đưa lên repository công khai.
- Chức năng **Tạo mockup đơn** đọc các ảnh `.png`, `.jpg`, `.jpeg`, `.webp`, `.tif`, `.tiff` trực tiếp trong `Input`; PDF không bị xem là ảnh mockup.
- App tự tạo snapshot bền vững của tài sản `Input` trong hồ sơ người dùng. Nếu NSIS xóa rồi tạo lại thư mục cài đặt khi cập nhật/cài lại, app khôi phục snapshot trước khi quét tài sản; các sửa đổi và xóa có chủ ý cũng được đồng bộ.
- Bản sao tự động này bảo vệ luồng cập nhật của app nhưng không thay thế chiến lược backup cá nhân; với tài sản quan trọng, vẫn nên giữ thêm một bản sao ngoài thư mục cài đặt.

## PDF Download

Khi bật **Tạo PDF Download**, app kiểm tra `Done` trước. Nếu đã có bất kỳ file PDF nào, app giữ nguyên file đó và bỏ qua bước PDF; không tạo thêm `_2`, `_3`, ... Nếu chưa có PDF, app chuẩn hóa URL người dùng nhập, lấy PDF mẫu duy nhất trong `Input`, thay URL đích của nút Download và các vùng link hiển thị, đồng thời vẽ lại dòng URL nhìn thấy trên PDF.

PDF mẫu phải có ít nhất hai annotation link cùng trỏ tới URL cũ trên mỗi trang cần sửa: một vùng nút Download và một hoặc nhiều vùng cho link hiển thị. Backend PDF dùng dependency `pdf-lib`, ghi qua file tạm rồi commit nguyên tử để không công bố PDF dở dang; thao tác Hủy cũng được kiểm tra trong toàn bộ luồng.

## Mockup đơn và vùng in

- App tạo một file mockup đơn cho mỗi ảnh mẫu trong `Input`.
- Số PNG nguồn được chọn ngẫu nhiên bằng số ảnh mẫu. Trong một lượt, app xáo trộn để hạn chế lặp; nếu số ảnh mẫu lớn hơn số PNG đã chọn thì PNG có thể được dùng lại ở vòng tiếp theo.
- Vùng in có tỷ lệ pixel cố định `42:48` (`7:8`), có thể kéo, đổi kích thước và di chuyển trong Preview.
- Thiết lập được lưu trong hồ sơ người dùng theo tên và kích thước từng ảnh mẫu. Ảnh giữ nguyên tên và kích thước sẽ dùng lại thiết lập ở các lần sau; thay đổi kích thước ảnh yêu cầu lưu lại vùng in.
- PNG được crop theo vùng alpha thật, resize theo kiểu `contain` và đặt vào vùng in. Watermark, nếu bật, luôn được composite sau cùng trên lớp trên cùng.
- Ảnh mẫu JPEG/TIFF có EXIF Orientation được xoay theo chiều nhìn thấy trước khi tính và áp dụng vùng in.
- Tên file bắt đầu bằng `single_<tên ảnh mẫu>` và được thêm hậu tố khi trùng.

## Kéo-thả PNG

Chỉ nhận file `.png` được kéo trực tiếp từ File Explorer; file không phải PNG, file trùng và file không đọc được sẽ bị bỏ qua hoặc báo rõ. Có thể thả một lần các PNG nằm ở nhiều thư mục. Thư mục nguồn chính đang hiển thị trong app quyết định vị trí `Done`; khi danh sách ban đầu được tạo hoàn toàn bằng kéo-thả, thư mục của file hợp lệ đầu tiên được dùng làm nguồn chính.

## Quy tắc Watermark

- Watermark phải thực sự là PNG, có kênh alpha và có ít nhất một pixel nền trong suốt.
- Watermark được ghép sau tất cả thiết kế nên luôn nằm trên lớp trên cùng.
- Nếu bằng kích thước ảnh nền, watermark được đặt nguyên kích thước tại `(0, 0)`.
- Nếu lớn hơn ảnh nền, watermark được thu vừa khung, giữ tỉ lệ và căn giữa.
- Watermark nhỏ hơn ảnh nền không bị phóng lớn; app dùng alpha/opacity gốc của file.

## Xử lý Metadata

Khi **Xóa Metadata** được bật, app hoàn thành bố cục và watermark trước, sau đó mã hóa lại PNG ở bước cuối và xác minh không còn:

- Comment
- EXIF
- XMP
- EXIF thumbnail
- IPTC
- ICC profile

Khi bỏ chọn, app giữ metadata của ảnh nền trong khả năng định dạng PNG đầu ra hỗ trợ. Metadata của các PNG thiết kế và watermark không được trộn vào file kết quả.

## Cài đặt trên Windows

1. Tải `PNG-Bundle-Mockup-Setup-X.Y.Z.exe` từ mục **Releases** của repository.
2. Chạy bộ cài. Cài mới dùng vị trí current-user cố định để `Input` luôn ghi được; khi nâng cấp, installer giữ nguyên chế độ/vị trí của bản v1.2.0 hiện có, kể cả All Users/custom path, thay vì tạo app thứ hai. Với bản All Users cũ, installer chỉ cấp quyền Modify cho thư mục `Input` và dừng trước khi thay đổi bản cũ nếu bước kiểm tra quyền thất bại.
3. Mở app bằng icon **PNG Bundle Mockup** trên Desktop hoặc Start Menu.

Sau khi cài, dùng nút **Mở Input** để xác nhận thư mục `Input` nằm cạnh EXE và thêm PDF/ảnh mẫu của bạn. Bản stable hiện tại là [`v1.2.2`](https://github.com/minhtuan5991/PNG-Bundle-Mockup/releases/tag/v1.2.2), có đủ installer, blockmap và `latest.yml`. Người đang dùng installer v1.2.0 hoặc v1.2.1 có thể chủ động kiểm tra, tải và cài bản vá này ngay trong app.

Từ bản installer `1.2.0`, app tự kiểm tra phiên bản ổn định mới sau khi mở, sau đó kiểm tra lại định kỳ. Khi có bản mới, người dùng chủ động chọn **Tải cập nhật** và **Khởi động lại và cài đặt**; app đồng bộ backup `Input` ngay trước khi gọi bộ cài. App chặn cài cập nhật khi đang tạo ảnh, quét/lưu `Input` hoặc còn mở trình chỉnh vùng in; nếu đóng cửa sổ trong lúc tạo ảnh, tác vụ được hủy và dọn file tạm trước khi app thoát, còn thay đổi vùng in chưa lưu sẽ được cảnh báo. Đóng app thông thường không tự cài bản đã tải. App chỉ chạy một cửa sổ tương tác: mở icon lần nữa sẽ khôi phục và đưa cửa sổ hiện có lên trước. Nếu tiến trình backup headless không lấy được single-instance lock vì app còn chạy, update/uninstall sẽ dừng an toàn thay vì tiếp tục khi chưa bảo toàn `Input`. Bản portable `1.1.0` cũ không có updater nên cần cài file Setup một lần để chuyển sang kênh cập nhật này.

## Chạy mã nguồn dành cho phát triển

Yêu cầu Node.js `22.12.0` trở lên.

Runtime chính gồm `sharp`, `electron-updater` và `pdf-lib`; luôn dùng lockfile để cài đúng phiên bản đã chốt.

```powershell
npm.cmd install
npm.cmd start
```

`start-app.bat` chỉ là tiện ích dành cho thư mục mã nguồn; file này không nằm trong app sau khi cài.

## Kiểm thử

```powershell
npm.cmd test
```

## Đóng gói Windows

```powershell
npm.cmd run build:win
```

Hoặc chạy `build-windows.bat`. Bộ cài được tạo tại `release/PNG-Bundle-Mockup-Setup-X.Y.Z.exe`. Fresh install dùng NSIS 64-bit theo tài khoản Windows hiện tại; nâng cấp giữ mode/path của bản v1.2.0 đã tồn tại để không nhân đôi ứng dụng. Bộ cài tạo shortcut Desktop/Start Menu và đóng mã nguồn vào `app.asar`; các thư mục `src`, `test`, `scripts`, `node_modules` của dự án không xuất hiện riêng trong vị trí cài.

Để phát hành cập nhật online, tăng version rồi đẩy tag `vX.Y.Z`. Workflow GitHub Actions sẽ chạy test, build và đưa đồng thời `Setup.exe`, `.blockmap`, `latest.yml` vào một GitHub Release. Xem [hướng dẫn phát hành](docs/RELEASE-GUIDE.md).

Bản build local chưa có chứng thư code-signing thương mại, vì vậy Windows SmartScreen có thể cảnh báo ở lần mở đầu tiên. Khi file đến từ đúng thư mục build này, chọn **More info → Run anyway** để chạy.

## Cấu trúc

- `src/engine/layout.js`: chia nhóm, tính grid và vị trí.
- `src/engine/image-engine.js`: đọc alpha, crop, watermark, metadata, composite và lưu file.
- `src/main.js`: cửa sổ Electron, hộp thoại hệ thống và tác vụ nền.
- `src/services/path-preferences.js`: lưu đường dẫn an toàn trong hồ sơ người dùng.
- `src/services/update-service.js`: trạng thái và thao tác cập nhật GitHub.
- `src/services/input-directory.js`: xác định và tạo thư mục `Input` cạnh EXE khi đóng gói.
- `src/services/input-backup-service.js`: snapshot/khôi phục tài sản `Input` qua cập nhật hoặc cài lại.
- `src/services/dropped-png-files.js`: kiểm tra các PNG được kéo-thả từ File Explorer.
- `src/services/pdf-download-service.js`: thay URL, annotation và dòng link hiển thị trong PDF mẫu bằng `pdf-lib`.
- `src/services/single-mockup-regions.js`: lưu vùng in `42:48` theo tên/kích thước ảnh mẫu trong `userData`.
- `src/services/single-mockup-service.js`: chọn PNG ngẫu nhiên và tạo mockup đơn vào `Done`.
- `src/renderer/`: giao diện tiếng Việt.
- `test/`: kiểm thử layout, xử lý ảnh, Input, kéo-thả, PDF Download, mockup đơn, cấu hình vùng in và updater.
- `.github/workflows/`: CI và phát hành Windows theo tag.
- `docs/PROJECT-HISTORY.md`: lịch sử kỹ thuật và thông tin bàn giao sau khi dọn Codex.
