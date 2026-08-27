# PNG Bundle Mockup v1.4.6 — Release Notes

Ngày phát hành: 2026-08-27

## Thay đổi chính

- Đổi tên ảnh đầu ra **Mockup Group Shirt** thành `[Tên nhóm PNG]_Tên mockup_001.png`, ví dụ `[Family]_chambray.mgs_001.png`.
- Tên nhóm giữ cách viết hiển thị của nhóm PNG. Tên mockup lấy từ tên ảnh nền, bỏ phần mở rộng định dạng ảnh.
- Số thứ tự bắt đầu từ `001`, tính riêng cho từng cặp nhóm PNG và tên mockup. Khi tên đã tồn tại trong `Done`, app tăng số để không ghi đè.
- Các nền trùng tên ở thư mục hoặc định dạng khác nhau dùng chung số thứ tự cho cùng nhóm. Tên được chuẩn hóa để an toàn trên Windows.
- Dấu ngoặc quanh tên nhóm ngăn ảnh Group Shirt của nhóm `single` hoặc `single_*` bị nhận nhầm thành mockup đơn.

## Tương thích dữ liệu

- Chỉ ảnh Group Shirt tạo mới dùng quy tắc tên mới; không đổi tên hoặc xóa ảnh đầu ra đã có.
- Giữ nguyên cách ghép ảnh, số trang, routing màu/mặt, vùng in đã lưu, đường dẫn, Bundle PNG, mockup đơn, PDF Download, watermark và xóa metadata.
- Không đổi app ID, tên sản phẩm, shortcut, dữ liệu `Input` hoặc schema cài đặt.

## QA

- Automated tests: **136/136 đạt**, không có fail/skipped/todo.
- Kiểm thử bao gồm tên nhóm có dấu, số thứ tự riêng cho từng nhóm/nền, tên trùng, Unicode, chạy lại không ghi đè và nhận diện mockup đơn.
- Build NSIS x64 local thành công; smoke test cơ bản trên payload đóng gói đạt **23/23**, chạy với userData QA riêng.
- ASAR chứa đúng version 1.4.6 và mã nguồn đã kiểm tra. Payload `Input` chỉ chứa `README.txt` và `Toystory HLW1.pdf`, không có ảnh riêng.
- `latest.yml` local khớp version, đường dẫn installer, kích thước và SHA-512 thực tế.

## Artifact QA local

Các số liệu dưới đây thuộc build local trong `release/v1.4.6`, không phải checksum của artifact được GitHub Actions build lại:

- `PNG-Bundle-Mockup-Setup-1.4.6.exe`: 104.371.168 byte; SHA-256 `a95bb735b9dbc79e61bce0673cc2ce33ca77020e51e2679b8cfab97dfa074a9b`.
- `PNG-Bundle-Mockup-Setup-1.4.6.exe.blockmap`: 109.332 byte; SHA-256 `e473bca56bbec5d403905b5df7615fbaf4938a6c09466a8ea05bc5d93e90dad6`.
- `latest.yml`: 363 byte; SHA-256 `d4321c88afe46f246979de8b907f94d7706297602e10d2ecdde9dd0efb5678aa`.

## Giới hạn kiểm thử

- Chưa kiểm thử cài mới/nâng cấp tương tác trên máy hoặc VM sạch trong lượt phát hành này.
- Bộ cài chưa có chữ ký nhà phát hành; Windows có thể hiện cảnh báo SmartScreen/Unknown Publisher.

## Phát hành

Phát hành bằng tag mới `v1.4.6`, không ghi đè tag hoặc asset đã public. Release gồm đúng ba asset:

- `PNG-Bundle-Mockup-Setup-1.4.6.exe`
- `PNG-Bundle-Mockup-Setup-1.4.6.exe.blockmap`
- `latest.yml`
