# PNG Bundle Mockup v1.4.14 — Release Notes

Ngày: 2026-09-02

## Tăng tốc ba luồng

- Tăng tốc **Mockup Bundle PNG**, **Mockup Group Shirt** và **Tạo mockup đơn** bằng xử lý song song có giới hạn.
- Tái sử dụng ảnh đã resize/xoay trong cùng tác vụ của Group Shirt và mockup đơn, tránh xử lý lại một PNG cùng kích thước/góc xoay.
- Không đổi chất lượng PNG, kích thước ảnh, Lanczos, mức nén, thứ tự lớp, watermark, metadata, lựa chọn ngẫu nhiên, tên output hay quy tắc nhóm/màu/mặt/giới tính.
- Giữ cơ chế hủy an toàn, chờ tác vụ đang chạy kết thúc rồi mới dọn file tạm; không ghi đè kết quả cũ.

## Scale từ góc

- Kéo một góc để tăng/giảm kích thước; góc đối diện giữ cố định, không phóng/thu quanh tâm.
- Áp dụng cho vùng Group Shirt và mockup đơn trong cả hai luồng; hoạt động với vùng đã xoay và nền không vuông.
- Giữ tỷ lệ 42×48, giới hạn mép ảnh, các ô nhập thông số, tên/màu vùng in và JSON trong Print Area.

## Đo hiệu năng

Chạy `node scripts/benchmark-rendering.js`, so sánh implementation v1.4.13 lấy từ Git với mã mới trên ảnh tổng hợp, ba lượt mỗi luồng, đảo thứ tự chạy ở lượt giữa. Thời gian trung vị:

| Luồng | v1.4.13 | v1.4.14 | Giảm thời gian |
| --- | ---: | ---: | ---: |
| Bundle — 36 PNG / 6 ảnh | 2.283 ms | 1.147 ms | 50% |
| Group Shirt — 12 ảnh × 6 vùng | 4.636 ms | 1.201 ms | 74% |
| Mockup đơn — 2 nhóm × 6 nền | 2.509 ms | 1.068 ms | 57% |

Nền 1000×1000, PNG 840×960; bật xóa metadata. Mọi output so sánh khớp tên và từng byte PNG với v1.4.13. Group Shirt và mockup đơn có thiết kế dùng lại nên hưởng lợi từ cache. Đây không phải cam kết mức tăng tốc trên mọi máy/bộ ảnh.

## QA

- Automated tests **187/187** và source/package smoke **26/26** đạt.
- ASAR, FileVersion, ProductVersion là 1.4.14; 27 file src/assets khớp byte; Input/Print Area chỉ chứa tài sản allowlist, không đóng gói ảnh riêng của người dùng.
- `latest.yml` khớp tên, kích thước và SHA-512 installer.
- Kiểm thử tự động bao phủ so sánh ảnh tuần tự/song song, metadata, watermark, hủy/rollback, quy tắc ghép và scale bốn góc tại nhiều góc xoay.
- Chưa kiểm thử cài mới/nâng cấp tương tác trên máy hoặc VM sạch.
- Bộ cài chưa ký số; Windows có thể hiển thị SmartScreen/Unknown Publisher.

## Artifact QA local

| File | Kích thước (byte) | SHA-256 |
| --- | ---: | --- |
| `PNG-Bundle-Mockup-Setup-1.4.14.exe` | 104380713 | `581052b8b52aeb9f0f7bb57de16c6883d3ec983bdc608a84eb796e087434b83f` |
| `PNG-Bundle-Mockup-Setup-1.4.14.exe.blockmap` | 109465 | `b454419ac14a633fd2cd7c645d86c3842c79680d35a797364f950ac8fc9050de` |
| `latest.yml` | 366 | `c6560c79b1b62f5d2c352c14269a136815c139438ba08bf5447c0f186c5b9995` |

Đây là checksum build local; workflow GitHub build lại và xác minh ba artifact công khai trước khi xuất bản stable.

## Trạng thái phát hành

- Commit `fd8fdadecc61a6c15f19e9bccd9137c2cbbe634f` và annotated tag `v1.4.14` đã lên GitHub.
- Windows CI `33654944031` và Release Windows `33654948774` đều thành công.
- Release `381413407` public/stable, không phải prerelease và là `/releases/latest`.
- Có đúng ba asset; workflow tải ngược kiểm tra nội dung, kích thước và SHA-512 trước khi công khai. latest.yml công khai đúng version, tên và kích thước bộ cài.

## Artifact GitHub công khai

| File | Kích thước (byte) | SHA-256 |
| --- | ---: | --- |
| `PNG-Bundle-Mockup-Setup-1.4.14.exe` | 104380457 | `2e78b92a98424e238670687b8f8252e16e27698be355e13ddb1d9bc6320da944` |
| `PNG-Bundle-Mockup-Setup-1.4.14.exe.blockmap` | 109462 | `e6f7c995a51cf757226b44e6b822c828aeec175b8af32c7aa05ab276f5b7f33e` |
| `latest.yml` | 366 | `18c16c96ef83f4bed3bb3d1b7d04e03f19e6ed73cff8c2551d76395ba5ad80d7` |
