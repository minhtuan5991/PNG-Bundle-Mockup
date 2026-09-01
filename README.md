# PNG Bundle Mockup

Ứng dụng desktop Windows để chọn PNG bằng hình preview, tạo mockup bundle hoặc ghép thiết kế theo nhóm lên nhiều áo, tạo mockup đơn theo vùng in đã lưu và tạo PDF Download từ một file PDF mẫu.

## Tính năng

- Chọn thư mục rồi xem gallery thumbnail lớn trước khi quyết định PNG nào được nạp vào app.
- Kéo trực tiếp nhiều file PNG từ File Explorer vào vùng danh sách; các file có thể đến từ nhiều thư mục khác nhau.
- Nhớ vị trí đã chọn gần nhất của thư mục PNG, ảnh nền và watermark cho lần mở hộp thoại tiếp theo.
- Có thể tiếp tục chọn/bỏ từng PNG trong danh sách chính.
- Nút **Loại bỏ PNG** dọn toàn bộ danh sách để bắt đầu bộ mới mà không xóa file PNG gốc.
- Hai chế độ loại trừ nhau: **Mockup Bundle PNG** giữ nguyên luồng dàn lưới hiện có; **Mockup Group Shirt** ghép PNG theo nhóm, màu áo và mặt trước/sau.
- Group Shirt nhận tên `1 (1).wh.f.m.png`, `1 (2).bl.b.w.png`; tag `.m/.w` dành cho vùng Áo nam/Áo nữ của Mockup Cặp đôi. Mỗi PNG không có tag màu dùng cả áo sáng/tối và giữ đúng mặt, kể cả trong nhóm trộn tag. Nhóm không có PNG mặt sau tự bỏ qua toàn bộ nền có vùng mặt sau.
- Trong từng màu/mặt, PNG `(1)`, `(2)`, `(3)` được ưu tiên lần lượt vào vùng 1, 2, 3. Nếu nền có cả áo sáng/tối, app dùng đúng ordinal của từng pool màu và chỉ lấp ngẫu nhiên các vùng còn thiếu sau khi hết PNG chưa dùng.
- Chọn nhiều nền Group Shirt có marker `mgs`, ví dụ `mgs.jpg`, `.mgs1.jpg` hoặc `shirt mgs lifestyle.png`. Mọi nền là template dùng chung; số/chữ cạnh marker chỉ là tên file, còn vùng in quyết định nhóm PNG nào tương thích. Mỗi nền lưu được nhiều vùng in áo sáng/tối, mặt trước/sau theo tỷ lệ cố định `42×48`, có thể di chuyển, scale đúng tỷ lệ và xoay.
- Công cụ **Đổi tên PNG** gắn `.wh/.bl` và `.f/.b` bằng thao tác đổi tên file thật, kiểm tra trùng tên và rollback toàn bộ nếu lỗi. Popup mở với `0/N`; chỉ thumbnail được chọn mới đổi tên, và thumbnail `80×76 px` giúp nhìn thiết kế rõ hơn.
- Chọn ảnh nền PNG/JPG/WEBP/TIFF.
- Chia đều file: `30 / 2 → 15 + 15`, `31 / 2 → 16 + 15`.
- Riêng Bundle PNG dùng bounding box của pixel có alpha lớn hơn ngưỡng để dàn lưới. Group Shirt và mockup đơn giữ toàn bộ canvas PNG, kể cả lề trong suốt, khi đặt vào vùng in.
- Tự chọn số hàng/cột tối ưu, giữ nguyên tỉ lệ và dùng Lanczos khi resize.
- Lề trên/dưới mặc định 195 px; lề ngang và khoảng cách có thể chỉnh.
- Dùng thư mục `Input` cạnh file EXE để chứa một PDF mẫu và các ảnh mockup đơn PNG/JPG/WEBP/TIFF có chữ `bundle` trong tên.
- Tạo **PDF Download** bằng cách thay URL cũ trong nút Download, dòng link hiển thị và các thông tin liên kết liên quan bằng URL mới.
- Tạo một mockup đơn cho mỗi ảnh mockup trong `Input`; PNG nguồn được chọn ngẫu nhiên và đặt vào vùng in tỷ lệ `42:48` (`7:8`) đã lưu riêng theo từng ảnh mẫu.
- Riêng luồng Group Shirt cho phép chọn nhiều ảnh nền mockup đơn trực tiếp từ bất kỳ thư mục nào, không cần marker `bundle`; mỗi nhóm PNG dùng tất cả nền đã chọn và các vùng in dùng chung file JSON với mockup đơn trong `Input`.
- Gắn một watermark PNG trong suốt lên lớp trên cùng của mockup Bundle, Group Shirt và mockup đơn.
- Xóa Metadata mặc định ở bước cuối của mọi ảnh mockup: Comment, EXIF, XMP, EXIF thumbnail, IPTC và ICC profile.
- Preview đúng bố cục và watermark trước khi xuất.
- Lưu mockup Bundle, Group Shirt, mockup đơn và PDF Download vào cùng thư mục `Done`, không ghi đè kết quả cũ.
- Xử lý nền, hiển thị tiến trình và có thể huỷ an toàn.
- Nút **Xóa dữ liệu** dọn cache/file tạm theo allowlist có xác nhận; khi thoát app cũng tự dọn trước rồi mới đóng. Ảnh Input, JSON Print Area và kết quả Done không bị xóa.
- Hiển thị phiên bản ngay trên tên app và kiểm tra cập nhật từ GitHub Releases.
- Bộ cài Windows tạo icon ngoài Desktop và Start Menu; máy người dùng không cần Node.js hay `start-app.bat`.

## Cách sử dụng

1. Nếu cần PDF Download hoặc mockup đơn, chuẩn bị tài sản trong thư mục `Input` theo hướng dẫn bên dưới.
2. Bấm **Chọn thư mục và xem PNG**, hoặc kéo trực tiếp các file `.png` từ File Explorer vào vùng danh sách PNG.
3. Trong cửa sổ thumbnail, chọn các ảnh cần dùng rồi bấm **Nạp X PNG**. Hủy hoặc nhấn `Esc` sẽ giữ nguyên danh sách cũ.
   Khi muốn chạy một bộ mới, bấm **Loại bỏ PNG** rồi kéo/thêm PNG mới; app sẽ không trộn với danh sách cũ.
4. Ở bước 2, chọn đúng một chế độ:
   - **Mockup Bundle PNG**: chọn một ảnh nền và tiếp tục dùng bố cục/lề như trước.
   - **Mockup Group Shirt**: chọn nhiều ảnh nền có marker `mgs`, sau đó mở **Chỉnh vùng in Group Shirt** để thêm vùng sáng/tối, mặt trước/sau trên từng nền và bấm **Lưu vùng in**.
5. Giữ **Xóa Metadata** được bật nếu muốn làm sạch sáu nhóm metadata ở các file ảnh Bundle, Group Shirt và mockup đơn cuối.
6. Nếu cần watermark, bật **Gắn Watermark** và chọn một PNG có pixel nền trong suốt. Watermark được áp dụng cho Bundle, Group Shirt và mockup đơn khi chức năng này được bật.
7. Muốn tạo PDF trong chế độ Bundle hoặc Group Shirt, bật **Tạo PDF Download** rồi nhập URL tải dạng `http://` hoặc `https://`.
8. Muốn tạo mockup đơn:
   - Trong Bundle, đặt các ảnh mẫu có chữ `bundle` trong tên vào `Input` rồi bật **Tạo mockup đơn**.
   - Trong Group Shirt, bật **Tạo mockup đơn** và chọn trực tiếp nhiều ảnh nền cần dùng.
   Lần đầu, mở **Thiết lập nâng cao**, bật **Chỉnh vùng in mockup đơn**, chỉnh vùng `42×48` trên từng ảnh rồi bấm **Lưu vùng in**.
9. Trong chế độ Bundle, nhập số mockup; dòng “Chia file” cho biết số PNG trên từng ảnh. Group Shirt tự tính số trang theo số vùng trước/sau đã lưu.
10. Trong chế độ Bundle, giữ lề trên/dưới ở `195 px` hoặc mở **Thiết lập nâng cao** để điều chỉnh; các thiết lập lề này được ẩn trong Group Shirt.
11. Bấm **Xem trước**, sau đó bấm **Tạo mockup**.
12. Bấm **Mở thư mục Done** để xem toàn bộ mockup Bundle, Group Shirt, mockup đơn và PDF Download đã chọn tạo.

## Mockup Group Shirt

- PNG nguồn dùng dạng `<nhóm> (<số nguyên dương>)[.<tag>...].png`, ví dụ `1 (3).wh.f.m.png`. Tag màu `.wh/.bl`, tag mặt `.f/.b` và tag giới tính `.m/.w` có thể ở bất kỳ thứ tự nào; app luôn chuẩn hóa lại theo thứ tự màu, mặt, giới tính. Thiếu tag mặt thì dùng mặt trước; thiếu tag màu thì dùng được trên cả áo sáng và tối, không bị PNG khác trong nhóm giới hạn màu.
- Tất cả PNG có cùng phần tên trước `(số)` thuộc một nhóm. Số thứ tự quyết định thứ tự ghép trong từng loại màu/mặt; `1 (01)` và `1 (1)` là cùng ordinal nên không thể cùng tồn tại trong một track.
- Ảnh nền phải có đuôi thật PNG/JPG/WEBP/TIFF và tên chứa marker `mgs`, ví dụ `mgs.jpg`, `1 mgs lifestyle.png` hoặc `.mgs3.jpg`. Tất cả nền `mgs` là pool dùng chung: nhóm `1` có thể dùng `.mgs2`/`.mgs3` nếu các vùng in đã lưu phù hợp với tag màu/mặt của nhóm.
- Mỗi vùng in lưu mặt (`front/back`), màu áo (`wh/bl`) và giới tính tùy chọn (`m/w`). Hai checkbox **Áo sáng màu**/**Áo tối màu** loại trừ nhau; không chọn ô nào thì vùng mới mặc định là áo sáng. **Áo nam**/**Áo nữ** cũng loại trừ nhau; vùng Nam có màu xanh lá, vùng Nữ màu hồng nhạt và đều có nhãn chữ. Không chọn giới tính thì vùng giữ quy tắc cũ.
- Vùng in luôn giữ tỷ lệ pixel `42×48` khi tạo, kéo scale, nhập rộng/cao hoặc xoay. Vùng sau xoay phải nằm trọn trong ảnh nền.
- Toàn bộ PNG `4200×4800` được co theo đúng tỷ lệ vào vùng in `42×48`, giữ nguyên lề trong suốt và vị trí thiết kế trong canvas; không crop theo vùng có pixel. Preview và ảnh xuất dùng cùng cách đặt. Nếu PNG có tỷ lệ khác, app dùng `contain` để giữ tỷ lệ và không cắt ảnh; vùng có xoay được xoay sau khi co toàn bộ canvas.
- App xét tag của từng PNG và điều kiện của nhóm để chọn vùng in:
  - Không tag `.f`, `.b`, `.wh`, `.bl`: chỉ ghép vào vùng mặt trước trên cả áo sáng và áo tối.
  - Chỉ `.f/.b`: `.f` vào mặt trước, `.b` vào mặt sau, trên cả áo sáng và áo tối. Mỗi template vẫn phải có các mặt tương ứng với PNG trong nhóm; không lấy PNG mặt trước để lấp mặt sau hoặc ngược lại.
  - Chỉ `.wh/.bl`: ghép vào mặt trước đúng màu; template không được có vùng mặt sau.
  - Có cả tag màu và mặt: PNG có `.wh/.bl` chỉ dùng đúng màu; PNG không có tag màu vẫn dùng cả hai màu. Mỗi PNG giữ đúng mặt. Template có ít nhất một vùng tương ứng được dùng; tổng các template đã chọn phải bao phủ đủ các loại PNG của nhóm.
  - Có `.m/.w`: app lọc vùng giới tính trước (`.m` chỉ vào vùng Áo nam, `.w` chỉ vào vùng Áo nữ), rồi mới áp dụng nguyên các quy tắc màu và mặt ở trên. PNG không có tag giới tính không dùng vùng Nam/Nữ.
  - Với mọi kiểu nhóm: nếu không có PNG mặt sau, app bỏ qua toàn bộ nền chứa vùng mặt sau, kể cả nền có cả trước/sau. Bộ lọc áp dụng riêng từng nhóm trước khi chia trang; không xóa file nền hoặc ảnh cũ trong `Done`.
- Trong từng loại nguồn, PNG được dùng theo số thứ tự trên các vùng đã lưu. Thứ tự ưu tiên track là áo sáng rồi áo tối; trong mỗi track, vùng 1, 2, 3 nhận PNG ordinal tăng dần. Mặt trước/sau dùng hàng đợi riêng theo tag mặt. Khi nguồn không tag màu và nguồn có tag màu cùng phù hợp, app dành chỗ cho nguồn có tag màu trước, sau đó dùng một lượt nguồn không tag màu chung cho cả hai màu áo. Chỉ lặp ngẫu nhiên nguồn phù hợp sau khi hết nguồn chưa dùng; PNG thừa tạo trang mới, không bị bỏ sót hay nhân đôi do dùng chung màu.
- Có thể chọn nhiều nền `mgs`; mỗi nền tương thích tạo chuỗi trang riêng cho từng nhóm PNG. Nền không tương thích với bất kỳ nhóm nào được bỏ qua có cảnh báo; nếu một nhóm không có nền nào có vùng phù hợp, app dừng trước khi ghi output.
- Tên output có dạng `[<tên nhóm PNG>]_<tên mockup>_<số thứ tự 3 chữ số>.png`, ví dụ `[Family]_chambray.mgs_001.png`. Tên mockup giữ nguyên tên ảnh nền, bỏ đuôi định dạng ảnh. Số thứ tự tính riêng cho mỗi cặp nhóm PNG và tên mockup; khi tên đã tồn tại trong `Done`, app tăng số để không ghi đè ảnh cũ. Dấu ngoặc quanh tên nhóm tránh nhầm với tiền tố `single_` của mockup đơn.
- Khi bật **Tạo mockup đơn** trong Group Shirt, app cho chọn nhiều ảnh nền riêng, không cần đặt trong `Input` và không cần chữ `bundle`. Mỗi nhóm PNG dùng toàn bộ nền đã chọn; trên từng nền, app chọn ngẫu nhiên PNG áo sáng (`.wh` hoặc không có tag màu) thuộc chính nhóm đó. Đuôi `.m/.w` không ảnh hưởng bước Mockup đơn. Ví dụ 3 nhóm × 3 nền tạo 9 ảnh. Tên file có dạng `[<tên nhóm>]_single_<tên nền>.png`, luôn đặt tên nhóm ở đầu. Quy tắc một lần cho mỗi `Done` vẫn được giữ.
- **Tạo PDF Download** dùng được ở cả Bundle và Group Shirt, với cùng quy tắc chỉ một PDF trong mỗi `Done`.
- Nền JPEG/TIFF có EXIF Orientation được xoay theo chiều nhìn thấy trước khi tính vùng in và xuất PNG.

App chỉ nhớ vị trí để mở đúng thư mục/file ở lần chọn sau; app không tự nạp lại PNG hoặc tự bật watermark khi khởi động. File đã bị xóa hoặc đổi tên sẽ được bỏ qua an toàn và hộp thoại sẽ mở tại thư mục cha còn tồn tại.

Ảnh nền và watermark nằm trong thư mục nguồn sẽ tự bị loại khỏi danh sách thiết kế. PNG hoàn toàn trong suốt hoặc bị hỏng sẽ được báo tên cụ thể.

## Thư mục Input

- Bản đã cài dùng thư mục `Input` nằm cạnh file `PNG Bundle Mockup.exe`. Nút **Mở Input** trong app mở đúng vị trí này.
- Khi chạy mã nguồn, app dùng `<thư mục dự án>\Input`.
- Chức năng **Tạo PDF Download** yêu cầu `Input` có đúng một file `.pdf`. Nếu có 0 hoặc từ 2 PDF trở lên, app dừng và yêu cầu sửa nội dung thư mục.
- Bản cài kèm `Toystory HLW1.pdf` đã được làm phẳng và dùng URL placeholder an toàn; link Drive cũ trong file người dùng cung cấp không được đưa lên repository công khai.
- Payload installer chỉ cho phép đúng `Input/README.txt` và PDF mẫu `Input/Toystory HLW1.pdf`. Ảnh/PDF riêng khác đang nằm trong `Input` trên máy build không được tự động đóng gói hoặc tải lên GitHub; release phải được dựng từ checkout sạch để hai file allowlist cũng đúng bản đã track.
- Chức năng **Tạo mockup đơn** chỉ đọc các ảnh `.png`, `.jpg`, `.jpeg`, `.webp`, `.tif`, `.tiff` có chữ `bundle` trong stem tên file; các ảnh khác và PDF không bị xem là template mockup đơn.
- App tự tạo snapshot bền vững của tài sản `Input` trong hồ sơ người dùng. Nếu NSIS xóa rồi tạo lại thư mục cài đặt khi cập nhật/cài lại, app khôi phục snapshot trước khi quét tài sản; các sửa đổi và xóa có chủ ý cũng được đồng bộ.

## Thư mục Print Area

- Từ v1.4.9, bản đã cài lưu vùng in trong thư mục `Print Area` nằm cạnh `PNG Bundle Mockup.exe`; bản chạy mã nguồn dùng `<thư mục dự án>\Print Area`.
- `single-mockup-regions.json` chứa vùng in mockup đơn; `group-shirt-regions.json` chứa vùng in Mockup Group Shirt.
- App tự chuyển hai JSON cũ từ `%APPDATA%\png-bundle-mockup` vào `Print Area` ở lần mở đầu tiên và giữ snapshot trong hồ sơ người dùng để khôi phục qua update.
- Để chuyển máy, đóng app trên cả hai máy rồi copy một hoặc cả hai JSON từ `Print Area` của máy cũ sang `Print Area` của máy mới. Mở app ở máy mới để tự nạp; không cần copy file marker ẩn.
- Mockup đơn cần giữ nguyên tên và kích thước ảnh mẫu. Mockup Group Shirt cần đúng ảnh mockup gốc vì app kiểm tra cả SHA-256 fingerprint.
- Payload installer chỉ kèm `Print Area/README.txt`; không đóng gói JSON hoặc vùng in riêng của máy build.
- Bản sao tự động này bảo vệ luồng cập nhật của app nhưng không thay thế chiến lược backup cá nhân; với tài sản quan trọng, vẫn nên giữ thêm một bản sao ngoài thư mục cài đặt.

## PDF Download

Khi bật **Tạo PDF Download**, app kiểm tra `Done` trước. Nếu đã có bất kỳ file PDF nào, app giữ nguyên file đó và bỏ qua bước PDF; không tạo thêm `_2`, `_3`, ... Nếu chưa có PDF, app chuẩn hóa URL người dùng nhập, lấy PDF mẫu duy nhất trong `Input`, thay URL đích của nút Download và các vùng link hiển thị, đồng thời vẽ lại dòng URL nhìn thấy trên PDF.

PDF mẫu phải có ít nhất hai annotation link cùng trỏ tới URL cũ trên mỗi trang cần sửa: một vùng nút Download và một hoặc nhiều vùng cho link hiển thị. Backend PDF dùng dependency `pdf-lib`, ghi qua file tạm rồi commit nguyên tử để không công bố PDF dở dang; thao tác Hủy cũng được kiểm tra trong toàn bộ luồng.

## Mockup đơn và vùng in

- App tạo một file mockup đơn cho mỗi ảnh mẫu có chữ `bundle` trong tên ở `Input`; ảnh không chứa `bundle` không được dùng.
- Trong Group Shirt, danh sách nền mockup đơn do người dùng chọn trực tiếp thay cho danh sách `bundle` trong `Input`. Có thể chọn PNG/JPG/JPEG/WEBP/TIF/TIFF và lưu vùng in bằng cùng trình chỉnh. Mọi nhóm PNG đều chạy qua toàn bộ danh sách nền này.
- Số PNG nguồn được chọn ngẫu nhiên bằng số ảnh mẫu. Trong một lượt, app xáo trộn để hạn chế lặp; nếu số ảnh mẫu lớn hơn số PNG đã chọn thì PNG có thể được dùng lại ở vòng tiếp theo.
- Vùng in có tỷ lệ pixel cố định `42:48` (`7:8`), có thể kéo, đổi kích thước và di chuyển trong Preview.
- Thiết lập được lưu trong `Print Area/single-mockup-regions.json` theo tên và kích thước từng ảnh mẫu. Ảnh giữ nguyên tên và kích thước sẽ dùng lại thiết lập ở các lần sau; thay đổi kích thước ảnh yêu cầu lưu lại vùng in.
- Toàn bộ canvas PNG, gồm phần trong suốt, được resize theo kiểu `contain` và đặt vào vùng in; PNG `4200×4800` khớp đúng vùng `42×48`, không phóng riêng phần thiết kế. Watermark, nếu bật, luôn được composite sau cùng trên lớp trên cùng.
- Ảnh mẫu JPEG/TIFF có EXIF Orientation được xoay theo chiều nhìn thấy trước khi tính và áp dụng vùng in.
- Tên file bắt đầu bằng `single_<tên ảnh mẫu>` và được thêm hậu tố khi trùng.

## Xóa dữ liệu rác

- Bấm **Xóa dữ liệu** trên thanh đầu ứng dụng, đọc hộp xác nhận rồi chọn **Xóa dữ liệu rác**.
- App chỉ dọn cache Electron, thư mục staging/previous còn sót sau thao tác nguyên tử và file tạm có đúng mẫu tên nội bộ trong các thư mục nguồn/Done đã được người dùng cấp quyền ở phiên hiện tại.
- App không xóa PNG, ảnh nền, PDF mẫu, `path-preferences.json`, hai JSON vùng in hoặc output hoàn chỉnh. Khi đóng cửa sổ, app tự chạy cùng cơ chế an toàn rồi mới thoát.

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
2. Chạy bộ cài. Khi cài mới, bạn có thể chọn thư mục đích; nên chọn thư mục mà tài khoản hiện tại có quyền ghi để có thể thêm PDF/ảnh mẫu vào `Input`. Nếu chỉ chọn thư mục cha, bộ cài tự thêm thư mục con `PNG Bundle Mockup`. Khi nâng cấp, installer giữ nguyên chế độ/vị trí của bản hiện có, kể cả All Users/custom path, thay vì tạo app thứ hai. Với bản All Users cũ, installer chỉ cấp quyền Modify cho thư mục `Input` và dừng trước khi thay đổi bản cũ nếu bước kiểm tra quyền thất bại.
3. Mở app bằng icon **PNG Bundle Mockup** trên Desktop hoặc Start Menu.

Sau khi cài, dùng nút **Mở Input** để xác nhận thư mục `Input` nằm cạnh EXE và thêm PDF/ảnh mẫu của bạn. Mã nguồn và bản stable đã xác minh là [`v1.4.9`](https://github.com/minhtuan5991/PNG-Bundle-Mockup/releases/tag/v1.4.9); xem [ghi chú v1.4.9](docs/RELEASE-NOTES-1.4.9.md) và tải bộ cài từ [GitHub Releases](https://github.com/minhtuan5991/PNG-Bundle-Mockup/releases/latest).

Bộ cài giữ các file runtime Electron bắt buộc nhưng gắn thuộc tính **Hidden** để thư mục cài đặt gọn hơn. Từ v1.4.9, mặc định File Explorer hiện `Input`, `Print Area`, **PNG Bundle Mockup.exe** và **Uninstall PNG Bundle Mockup.exe**. Việc bật **Show hidden files** sẽ làm các file kỹ thuật xuất hiện lại; không xóa hoặc đổi tên chúng vì app cần chúng để chạy.

Quy trình phát hành được ghi trong [hướng dẫn cập nhật thủ công](docs/MANUAL-GITHUB-UPDATE.md). Sau `v1.4.9`, dùng patch version mới; không di chuyển tag hoặc ghi đè asset đã public.

Uninstall thật giữ nguyên `Input` và `Print Area` tại vị trí cài đặt nhưng xóa EXE/runtime, shortcut, registry, `%APPDATA%\png-bundle-mockup` và `%LOCALAPPDATA%\png-bundle-mockup-updater`. Các thư mục `Done`, PNG nguồn, mockup và PDF nằm ngoài thư mục cài đặt luôn được giữ nguyên. Luồng update dùng snapshot để khôi phục `Input` và hai JSON vùng in vào `Print Area`.

Bản v1.2.4 thay thế chỉ tạo mockup đơn một lần trong mỗi `Done`: nếu đã có kết quả `single_*.png`, app bỏ qua bước mockup đơn mà không yêu cầu lại ảnh mẫu, PNG nguồn hoặc thiết lập vùng in. Người đã cài v1.2.4 trước lần thay thế này cần chạy installer mới thủ công vì updater không tự tải lại cùng version.

Từ v1.2.5, dùng **Loại bỏ PNG** để dọn danh sách trước khi kéo bộ PNG tiếp theo. Thao tác này chỉ xóa dữ liệu phiên làm việc trong app, đặt lại thư mục nguồn/đích `Done` và preview cũ; file gốc, ảnh nền, watermark và các thiết lập không bị xóa.

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
- `src/services/print-area-storage.js`: phân giải `Print Area`, di chuyển JSON vùng in cũ và snapshot/khôi phục qua cập nhật.
- `src/services/dropped-png-files.js`: kiểm tra các PNG được kéo-thả từ File Explorer.
- `src/services/pdf-download-service.js`: thay URL, annotation và dòng link hiển thị trong PDF mẫu bằng `pdf-lib`.
- `src/services/single-mockup-regions.js`: lưu vùng in `42:48` theo tên/kích thước ảnh mẫu trong `Print Area`.
- `src/services/single-mockup-service.js`: chọn PNG ngẫu nhiên và tạo mockup đơn vào `Done`.
- `src/services/group-shirt-filenames.js`: parser tên và transaction đổi tên PNG Group Shirt.
- `src/services/group-shirt-regions.js`: lưu nhiều vùng in trước/sau có xoay theo từng ảnh nền.
- `src/services/group-shirt-planner.js`: so khớp group/giới tính/màu/mặt và lập các trang ghép không lặp.
- `src/services/group-shirt-service.js`: composite, preview, watermark, metadata và rollback Group Shirt.
- `src/renderer/`: giao diện tiếng Việt.
- `test/`: kiểm thử layout, xử lý ảnh, Input, kéo-thả, PDF Download, mockup đơn, cấu hình vùng in và updater.
- `.github/workflows/`: CI và phát hành Windows theo tag.
- `docs/PROJECT-HISTORY.md`: lịch sử kỹ thuật và thông tin bàn giao sau khi dọn Codex.
