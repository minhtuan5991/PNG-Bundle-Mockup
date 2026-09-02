# PNG Bundle Mockup v1.4.13 — Release Notes

Ngày: 2026-09-02

## Ghép vùng Nam/Nữ cho PNG không có tag giới tính

- PNG Group Shirt không có .m/.w giờ có thể ghép vào vùng in Áo nam hoặc Áo nữ.
- Với PNG không tag giới tính, app bỏ qua giới tính và chỉ áp dụng các quy tắc màu .wh/.bl, mặt .f/.b và thứ tự (1), (2), ...
- PNG có .m/.w vẫn bắt buộc đúng vùng Nam/Nữ trước khi xét màu áo và mặt áo.
- Nhóm chỉ có PNG mặt trước vẫn tự loại ảnh nền chứa vùng mặt sau, kể cả vùng mặt sau đó có giới tính.

## Màu vùng in Group Shirt

- Áp dụng 12 màu riêng cho các tổ hợp mặt trước/sau, áo sáng/tối và Nam/Nữ theo bảng màu mới.
- Giữ nguyên tên vùng in trong app, nhãn chữ Nam/Nữ · Sáng/Tối · Trước/Sau, kiểu viền, thao tác chỉnh vùng và dữ liệu JSON đã lưu.
- Màu được khai báo bằng token giao diện tập trung; nhãn chữ tiếp tục giúp phân biệt vùng mà không phụ thuộc riêng vào màu.

## Không thay đổi

- Mockup đơn tiếp tục bỏ qua tag .m/.w.
- Tỷ lệ vùng in 42×48, canvas PNG 4200×4800, watermark, metadata, PDF, tên output và thư mục Print Area giữ nguyên.

## QA local

- Automated tests đạt **171/171**.
- ASAR, FileVersion và ProductVersion cùng mang version `1.4.13`.
- `latest.yml` khớp tên, kích thước và SHA-512 của installer.
- Chưa kiểm thử cài mới/nâng cấp tương tác trên máy hoặc VM sạch.
- Bộ cài chưa ký số; Windows có thể hiển thị SmartScreen/Unknown Publisher.

## Artifact QA local

| File | Kích thước (byte) | SHA-256 |
| --- | ---: | --- |
| `PNG-Bundle-Mockup-Setup-1.4.13.exe` | 104378654 | `4c8725775bd1a8efa910dd31c5fb10215bf4745c92a5ea23e52baa65e2d4b262` |
| `PNG-Bundle-Mockup-Setup-1.4.13.exe.blockmap` | 109433 | `ee0dcf127af35ccdc3b955b6cf072016d669f7b9421fee0811255f72bb6d9f8e` |
| `latest.yml` | 366 | `09036045304eb6cf4bca2335a214a565b6b01ecb1064ab49baf9e1cb15f2746a` |

Checksum trên thuộc build local. GitHub Actions sẽ build lại và xác minh độc lập ba artifact công khai trước khi phát hành stable.

## Trạng thái phát hành

- Commit phát hành `5d06d79c2338e64282b76eb4db27c1e0848b0620` và annotated tag `v1.4.13` đã được đẩy lên GitHub.
- Windows CI `33646310521` và Release Windows `33646402971` đều thành công.
- Release `381360219` đang public, stable, không phải prerelease và là bản `/releases/latest`.
- Release có đúng ba asset updater; `latest.yml` công khai mang version 1.4.13, đúng tên và kích thước installer.

## Artifact GitHub công khai

| File | Kích thước (byte) | SHA-256 |
| --- | ---: | --- |
| `PNG-Bundle-Mockup-Setup-1.4.13.exe` | 104378171 | `765f99c7846f2f23f16bba3b2f1464f0530cc44197f6f23fe4df6c0ece00ce4d` |
| `PNG-Bundle-Mockup-Setup-1.4.13.exe.blockmap` | 109372 | `9c8f9693e5ebee706a98f12b800d5bef0b16061b2e0a6801b9f3cdcde8690411` |
| `latest.yml` | 366 | `51275a74a4aab7f1e4be2241ec72b532e13c7f3607a8abe77755fd65bd355a24` |
