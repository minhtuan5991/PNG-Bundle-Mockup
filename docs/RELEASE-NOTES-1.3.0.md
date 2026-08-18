# PNG Bundle Mockup v1.3.0

> Bản nâng cấp lớn bổ sung Mockup Group Shirt. Mã nguồn đã hoàn tất QA local; GitHub Release chỉ được xem là phát hành sau khi tag `v1.3.0` và ba asset Windows xuất hiện công khai.

## Điểm mới

- Chọn một trong hai chế độ **Mockup Bundle PNG** hoặc **Mockup Group Shirt**.
- Group Shirt hiểu group, số thứ tự, màu áo `.wh/.bl` và mặt áo `.f/.b`; tag terminal input có thể ở bất kỳ thứ tự nào, tên thiếu tag mặc định áo sáng/mặt trước và rename luôn xuất màu trước mặt.
- Chọn nhiều nền có marker `mkg`, khớp chính xác group PNG với phần trước `mkg`.
- Đổi tên PNG hàng loạt an toàn, không ghi đè và rollback toàn batch nếu lỗi.
- Mỗi nền lưu nhiều vùng mặt trước/sau; vùng có thể kéo, resize, xoay, nhập số và điều khiển bằng bàn phím.
- Engine phân trang không lặp PNG. Ví dụ 6 ảnh trước + 6 ảnh sau, nền 3 vùng trước + 3 vùng sau tạo đúng 2 ảnh; trang cuối để trống vùng thiếu nguồn.
- Group Shirt áp dụng cùng quy tắc ảnh khác: watermark nằm trên cùng; xóa Comment, EXIF, XMP, EXIF thumbnail, IPTC và ICC profile là bước cuối, còn bỏ chọn thì giữ metadata nền trong khả năng PNG hỗ trợ.
- Nền JPEG/TIFF có EXIF Orientation được xuất theo đúng chiều/kích thước nhìn thấy và output không còn orientation cũ.
- Group Shirt không tạo PDF Download. Mockup đơn chỉ lấy PNG áo sáng hoặc PNG không gắn tag màu.

## Quy tắc tên nhanh

```text
PNG:  1 (1).wh.f.png
      1 (2).wh.b.png
Nền: 1 mkg.wh.jpg
```

- `mkg` là marker tên file, không phải đuôi ảnh.
- `.wh` = áo sáng, `.bl` = áo tối, `.f` = mặt trước, `.b` = mặt sau.
- Parser nhận các tag trên theo thứ tự linh hoạt; công cụ rename chuẩn hóa về `[.wh|.bl][.f|.b]`.
- `1` chỉ khớp `1`; không khớp `10`.
- Các PNG Group Shirt phải nằm trong cùng một thư mục để tạo một `Done` duy nhất.
- Output có dạng `group-shirt_<tên nền>_<trang 3 số>.png`; stem trùng có `_tNN`, còn collision với lượt cũ dùng revision `_2`, `_3`, ... mà không ghi đè.

## Tương thích

- Bundle, PDF Download, mockup đơn, Input backup, watermark, metadata, kéo-thả và nút **Loại bỏ PNG** giữ hành vi v1.2.5.
- Vùng mockup đơn cũ tiếp tục nằm trong `single-mockup-regions.json`; vùng Group Shirt dùng store mới `group-shirt-regions.json`.
- App nhớ thêm đường dẫn nền Group Shirt gần nhất mà không làm mất ba đường dẫn đã lưu trước đây.
- Source/template Group Shirt chỉ được preview, generate, đổi tên hoặc lưu vùng sau khi người dùng đã chọn chúng trong đúng cửa sổ app hiện tại.

## QA local

- `node --check`: đạt cho main, preload và renderer.
- `npm test`: **116/116** đạt, 0 fail/skipped/todo.
- `git diff --check`: đạt.
- Group Shirt engine/service: **30/30** test đạt, gồm parser, transaction rename, region store, planner, crop alpha, xoay, EXIF Orientation, watermark, metadata, cancel và rollback.
- NSIS build local đạt: installer 104.367.149 byte (SHA-256 `503A14125E0BED8E333BA9D6A43006A6E0CD22754B2759D257042CC0B18614D1`), blockmap 109.389 byte và `latest.yml` 363 byte. Version/path/size/SHA-512 khớp; `app.asar` là v1.3.0 và packaged `Input` chỉ có README/PDF mẫu.
- Renderer smoke source lẫn packaged chưa thể chạy trên môi trường QA hiện tại vì GPU process của Electron thoát trước khi renderer khởi tạo, kể cả khi smoke-only đã tắt tăng tốc phần cứng; kiểm tra này phải chạy lại trên máy Windows có runtime đồ họa đầy đủ hoặc bằng artifact CI trước khi phát hành stable.

## Giới hạn phát hành

- Installer chưa có chữ ký Authenticode nên Windows SmartScreen có thể cảnh báo.
- Installer dùng allowlist chỉ gồm `Input/README.txt` và PDF mẫu `Input/Toystory HLW1.pdf`; các JPG/PDF riêng khác trong `Input` local không được đóng gói. Build release sạch phải xác nhận hai file được phép đúng nội dung đã track.
- Chưa có checksum artifact CI hoặc Release ID trước khi GitHub Actions chạy từ commit/tag chốt.
