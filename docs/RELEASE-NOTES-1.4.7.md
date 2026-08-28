# PNG Bundle Mockup v1.4.7 — Release Notes

Ngày: 2026-08-28

## Thay đổi chính

- Nhóm PNG không có hậu tố `.f`, `.b`, `.wh`, `.bl` chỉ được ghép vào vùng mặt trước trên cả áo sáng và áo tối.
- Mockup có cả trước/sau vẫn được dùng cho nhóm không hậu tố, nhưng vùng mặt sau giữ nguyên. Nền chỉ có vùng mặt sau được bỏ qua; số trang chỉ tính theo các vùng mặt trước được ghép.
- Nhóm chỉ có `.f/.b` tiếp tục dùng cả hai màu áo, `.f` vào mặt trước và `.b` vào mặt sau. Quy tắc nhóm có tag màu và kiểm tra đủ vùng tương ứng không thay đổi.
- Group Shirt và mockup đơn dùng toàn bộ canvas PNG, bao gồm lề trong suốt. PNG `4200×4800` được đặt đúng tỷ lệ vào vùng in `42×48`, không cắt theo vùng có pixel rồi phóng lớn thiết kế.
- Group Shirt co toàn bộ canvas trước khi xoay quanh tâm vùng in, giữ đúng kích thước cả ở góc `90°` và `-90°`. Preview và ảnh xuất dùng cùng logic.

## Tương thích dữ liệu

- Giữ nguyên vùng in đã lưu, app ID, tên sản phẩm, shortcut và schema cài đặt.
- Giữ tên output `[Tên nhóm PNG]_Tên mockup_001.png`, bộ đếm riêng theo nhóm/nền và chống ghi đè.
- Không đổi Bundle PNG, PDF Download, watermark, metadata, cách lặp PNG khi thiếu hoặc lựa chọn nguồn cho mockup đơn.
- Không đổi tên, sửa hoặc xóa PNG gốc và kết quả cũ. Bộ cài chỉ kèm `Input/README.txt` và PDF mẫu đã được phép phân phối, không chứa ảnh riêng của người dùng.

## QA

- Automated tests trên snapshot sạch sau `npm ci`: **142/142 đạt**, không có fail/skipped/todo.
- Kiểm thử gồm bộ lập kế hoạch, matching dùng chung cho browser/backend, pixel preview/ảnh xuất, canvas `4200×4800`, xoay và các quy tắc màu/mặt được giữ nguyên.
- Build NSIS x64 từ snapshot sạch thành công; packaged basic smoke đạt **23/23**, dùng hồ sơ QA riêng.
- Version trong ASAR là `1.4.7`; toàn bộ 23 file `src`/`assets` khớp byte với snapshot dùng để build. `Input` đóng gói chỉ có README/PDF mẫu và khớp bản đã track.
- `latest.yml` local khớp version, tên installer, kích thước và SHA-512 thực tế.

## Artifact QA local

Các số liệu này thuộc build local trong `release/v1.4.7`, không phải checksum của artifact được GitHub Actions build lại:

- `PNG-Bundle-Mockup-Setup-1.4.7.exe`: 104371222 byte; SHA-256 `4d7c794f03ed69329345832d665b90c140b6c187f82f0080aa911d4af610c66a`.
- `PNG-Bundle-Mockup-Setup-1.4.7.exe.blockmap`: 109407 byte; SHA-256 `c0134b94a7ecbaed5489ea6671ec4b8b35c98cf88a33128b37197e7fac1db959`.
- `latest.yml`: 363 byte; SHA-256 `a62befe48574bff34faa06266ab99021b6a0cb3f019178bb1d00252c851442c0`.

## Giới hạn kiểm thử

- Chưa kiểm thử cài mới/nâng cấp tương tác trên máy hoặc VM sạch trong lượt phát hành này.
- Bộ cài chưa có chữ ký nhà phát hành; Windows có thể hiện cảnh báo SmartScreen/Unknown Publisher.

## Phát hành

Phát hành bằng tag mới `v1.4.7`, không ghi đè tag hoặc asset đã public. Release gồm đúng ba asset:

- `PNG-Bundle-Mockup-Setup-1.4.7.exe`
- `PNG-Bundle-Mockup-Setup-1.4.7.exe.blockmap`
- `latest.yml`
