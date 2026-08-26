# PNG Bundle Mockup v1.4.5 — Release Notes

Ngày phát hành: 2026-08-26

Trạng thái: **bản phát hành stable v1.4.5**

## Thay đổi chính

- Logic **Mockup Group Shirt** không còn bắt buộc tập vùng in của ảnh nền phải trùng khít hoàn toàn với tập tag PNG.
- Nhóm PNG không có tag có thể dùng ảnh nền chỉ có vùng mặt trước, bất kể vùng đó là áo sáng hay áo tối.
- Nhóm chỉ phân biệt `.f/.b` ghép đúng mặt trước/sau và coi màu áo là wildcard; một ảnh nguồn ở một mặt được lặp an toàn khi số vùng in lớn hơn số ảnh.
- Nhóm chỉ phân biệt `.wh/.bl` ghép đúng màu trên vùng mặt trước; dùng được nền sáng riêng, tối riêng hoặc nền có cả hai màu.
- Nhóm phân biệt đầy đủ màu và mặt dùng mọi ảnh nền có ít nhất một vùng in tương ứng; vùng không có PNG tương ứng không bị ghép sai.
- Giao diện và backend dùng chung một module matching, nên phần cảnh báo trước khi tạo và ảnh kết quả tuân theo cùng quy tắc.

## Tương thích dữ liệu

- Không đổi định dạng tên `Nhóm (số).wh.f.png`, thiết lập vùng in 42×48, vùng đã lưu, Bundle PNG, PDF Download, mockup đơn, watermark hoặc xóa metadata.
- Với nhóm chỉ tag màu hoặc không tag, ảnh nền có vùng mặt sau không được dùng để tránh tạo mockup có mặt sau chưa ghép thiết kế.
- App kiểm tra tổng các ảnh nền được chọn: nếu một pool PNG (màu/mặt) không được nền nào bao phủ, app báo rõ thay vì âm thầm bỏ PNG.

## QA

- Automated tests: **132/132 đạt**, không có fail/skipped/todo.
- Bổ sung kiểm thử cho năm quy tắc routing, template chỉ phủ một phần track, wildcard màu/mặt, thiếu pool và lặp một ảnh nguồn qua nhiều vùng/trang.
- Đối chiếu read-only với thư mục Custom Name thực tế: cả bốn nhóm PNG đều lập kế hoạch thành công với các nền `mgs` và vùng in đã lưu.

## Artifact QA local

Thông tin checksum/size local được bổ sung sau khi build installer hoàn tất.

## Phát hành

Phát hành bằng tag mới `v1.4.5`, không ghi đè tag hoặc asset của v1.4.4. Release cần có đúng ba asset updater: installer, blockmap và `latest.yml`.
- `PNG-Bundle-Mockup-Setup-1.4.5.exe`: 104.371.308 byte; SHA-256 `BFF3609B993503AA6F392A04D06AA8BFF6287F476AEA19C9223B852AFE6F7429`.
- `PNG-Bundle-Mockup-Setup-1.4.5.exe.blockmap`: 109.307 byte; SHA-256 `6E321C5E035143FAE70829F28F5D7F59305B93867C2D89B871C8073037B31F8C`.
- `latest.yml`: 363 byte; SHA-256 `E26E98DA51B463A19F81C8816019B9DE52A49B00D15573CA9C4127B043AA15F6`; metadata trỏ đúng Setup 1.4.5, SHA-512 và kích thước 104.371.308 byte.
