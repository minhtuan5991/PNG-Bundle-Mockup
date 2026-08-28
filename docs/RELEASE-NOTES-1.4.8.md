# PNG Bundle Mockup v1.4.8 — Release Notes

Ngày: 2026-08-28

## Hai thay đổi

- Xét màu theo từng PNG, không lấy tag màu của PNG khác trong nhóm làm giới hạn. PNG không có `.wh/.bl` dùng được trên cả áo sáng/tối; `.f` giữ mặt trước, `.b` giữ mặt sau, thiếu tag mặt thì dùng mặt trước. PNG có `.wh/.bl` vẫn chỉ dùng đúng màu.
- Nhóm không có PNG mặt sau tự bỏ qua toàn bộ nền có vùng mặt sau trước khi lập trang, kể cả nền có cả trước/sau. Bộ lọc áp dụng riêng từng nhóm, không xóa ảnh nền hoặc output cũ. Nếu không còn nền phù hợp cho một nhóm, app báo lỗi trước khi ghi output.

## Phân bổ và tương thích

- Nguồn không tag màu dùng một hàng đợi chung trên cả hai màu áo, không nhân đôi theo màu. Khi có nguồn màu cố định, app dành chỗ cho nguồn đó trước rồi ghép nguồn không tag màu theo thứ tự vùng đã lưu; chỉ lặp ngẫu nhiên khi đã hết nguồn phù hợp chưa dùng.
- Số trang tính cả nguồn màu cố định và nguồn dùng chung, không bỏ sót PNG; hàng đợi riêng từng nền và giữ liên tục qua các trang.
- Giữ quy tắc đủ mặt trên từng nền cho nhóm chỉ `.f/.b`, đủ các loại nguồn trên tổng các nền được chọn và quy tắc nhóm chỉ `.b`. Không thêm bộ lọc đối xứng cho nhóm thiếu mặt trước.
- Giữ toàn bộ canvas PNG, gồm lề trong suốt, khi đặt vào vùng `42×48`; không đổi compositor, watermark, metadata, Bundle PNG, mockup đơn hoặc PDF Download.
- Giữ cài đặt, vùng in đã lưu, schema, app ID, tên sản phẩm và shortcut. Giữ cách đặt tên `[Tên nhóm PNG]_Tên mockup_001.png` và chống ghi đè.
- Bộ cài chỉ kèm `Input/README.txt` và PDF mẫu đã được phép phân phối, không chứa ảnh riêng của người dùng.

## QA

- Automated tests trên snapshot sạch sau `npm ci`: **152/152 đạt**, không fail/skipped/todo; `npm audit --omit=dev --audit-level=high` báo 0 lỗ hổng.
- Bộ kiểm thử mới bao phủ nhóm trộn `.wh.b` + sáu `.f` + `.bl.b`, wildcard màu, ưu tiên nguồn màu cố định, phân trang không bỏ sót/lặp sớm, lọc nền theo từng nhóm, preview/ảnh xuất và bảo toàn byte của PNG/nền/output cũ.
- Kiểm tra chỉ-đọc trên đúng tên PNG và vùng in đã lưu của người dùng: nhóm 3 dùng đủ sáu PNG `.f` trên `mgs5` (2 trang) và `mgs7` (1 trang); nhóm 1 dùng `mgs1,2,3,6,7,8` và bỏ `mgs4,mgs5` có vùng mặt sau.
- NSIS x64 build từ snapshot tree `984aa134f8f7657df4b1bf2e9e4cda63b9054521` thành công; packaged smoke dùng hồ sơ QA mới đạt **23/23**, exit code 0.
- Version trong ASAR/EXE là `1.4.8`; toàn bộ 23 file `src`/`assets` khớp byte với snapshot. `Input` được kiểm tra trước smoke, chỉ có `README.txt` và PDF mẫu đã track, khớp byte; bốn JPG riêng local không được đóng gói.
- `latest.yml` local khớp version, tên, kích thước và SHA-512 của installer.

## Artifact QA local

Các checksum bên dưới thuộc build local trong `release/v1.4.8`, không phải artifact do GitHub Actions build lại.

| File | Kích thước (byte) | SHA-256 |
| --- | ---: | --- |
| `PNG-Bundle-Mockup-Setup-1.4.8.exe` | 104371611 | `599853ea49c55a55336c022831348945bd4f1b3e8898d0c2a3c0818725ba1e0f` |
| `PNG-Bundle-Mockup-Setup-1.4.8.exe.blockmap` | 109246 | `c330e459698f7ef6870cffcf89b8300183c351ad91b30a73577ce2217190fa03` |
| `latest.yml` | 363 | `60cdbfaa41293961b6b5d58bd330cd751a72e151d43cc11a1f325f5ac5bc5fdc` |

## Trạng thái phát hành và giới hạn

- Phát hành bằng tag mới `v1.4.8`; workflow build và xác minh đúng ba artifact installer, blockmap và `latest.yml` trước khi công bố stable. Không ghi đè tag hoặc asset của bản cũ.
- Chưa kiểm thử cài mới/nâng cấp tương tác trên máy hoặc VM sạch; không cài đè hoặc gỡ bản đang dùng của người dùng.
- Bộ cài chưa ký số; Windows có thể hiện SmartScreen/Unknown Publisher.
