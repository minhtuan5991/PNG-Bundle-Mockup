# PNG Bundle Mockup v1.4.12 — Release Notes

Ngày: 2026-09-01

## Mockup Cặp đôi theo giới tính

- Công cụ đổi tên PNG của Group Shirt hỗ trợ `.m` cho áo nam và `.w` cho áo nữ.
- Trình chỉnh vùng in Group Shirt có thêm **Áo nam** và **Áo nữ**. Vùng Nam dùng màu xanh lá, vùng Nữ dùng màu hồng nhạt và luôn có nhãn chữ.
- Khi PNG có tag giới tính, app lọc vùng Nam/Nữ trước, sau đó tiếp tục áp dụng nguyên quy tắc màu `.wh/.bl`, mặt `.f/.b` và thứ tự `(1)`, `(2)`, ...
- PNG không có tag giới tính chỉ dùng các vùng cũ; không bị đưa vào vùng Nam/Nữ.

## Mockup đơn và tên đầu ra

- Mockup đơn trong luồng Group Shirt tiếp tục dùng quy tắc cũ và bỏ qua tag `.m/.w`.
- Tên mockup đơn luôn đặt tên nhóm lên đầu theo dạng `[Nhóm]_single_<tên nền>.png`.
- Tên ảnh Group Shirt chính tiếp tục dùng dạng `[Nhóm]_<tên mockup>_<số thứ tự>.png`.

## Tương thích dữ liệu

- `group-shirt-regions.json` dùng schema 3 để lưu giới tính vùng in.
- App tự di trú schema 1/2; các vùng cũ trở thành vùng không giới tính và tiếp tục hoạt động như trước.
- Cơ chế lưu/khôi phục JSON trong thư mục `Print Area` không thay đổi.

## QA local

- Automated tests đạt **169/169**; Electron source smoke và packaged smoke đều đạt **25/25**.
- ASAR mang version `1.4.12`, chứa logic giới tính và giao diện vùng in mới, không đóng gói thư mục test.
- Payload chỉ có `Input/README.txt`, PDF mẫu được phép phân phối và `Print Area/README.txt`; các JPG riêng không được đóng gói.
- `latest.yml` khớp version `1.4.12`, tên và kích thước installer.
- Chưa kiểm thử cài mới/nâng cấp tương tác trên máy hoặc VM sạch.
- Bộ cài chưa ký số; Windows có thể hiển thị SmartScreen/Unknown Publisher.

## Artifact QA local

| File | Kích thước (byte) | SHA-256 |
| --- | ---: | --- |
| `PNG-Bundle-Mockup-Setup-1.4.12.exe` | 104378390 | `3a757994e14b6ed678f0f7b7548e5cd95b802e6240d7ae47975b5e84bdcd1dd3` |
| `PNG-Bundle-Mockup-Setup-1.4.12.exe.blockmap` | 109478 | `45e3aefd4db35975088f4126279f35d713d1585963d9284ed195ce7188e05f7d` |
| `latest.yml` | 366 | `c2e83cf1f772559a9ac3cebc0591856edd231ca3ed3ad2e5991b51cb9cce2cbe` |

Checksum trên là của build local. GitHub Actions sẽ tự build lại, tải ngược và xác minh ba artifact công khai trước khi publish stable.
