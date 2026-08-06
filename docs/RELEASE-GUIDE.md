# Hướng dẫn phát hành PNG Bundle Mockup

> Áp dụng cho v1.2.0 trở đi. Các lệnh bên dưới dùng PowerShell trên Windows.

## 1. Mục tiêu phát hành

Kênh phát hành chính là NSIS installer x64 qua GitHub Releases:

```text
https://github.com/minhtuan5991/PNG-Bundle-Mockup
```

Mỗi tag `vX.Y.Z` kích hoạt workflow `.github/workflows/release-windows.yml`. Workflow kiểm tra tag khớp `package.json`, chạy test, build installer và upload các file updater.

## 2. Trạng thái repository

Sau lần phát hành đầu tiên ngày 2026-08-06:

- Repository GitHub là public.
- Nhánh mặc định `main` đã có mã nguồn.
- Tag `v1.2.0` trỏ tới commit phát hành `971d92d`.
- GitHub Release `v1.2.0` là stable/public và có đủ installer, blockmap, `latest.yml`.
- Thư mục `D:\File2Mockup` đã được khởi tạo Git và theo dõi `origin/main`.

Workflow upload đầy đủ asset được gia cố từ commit `6076701`; bản hiện tại còn đồng bộ tiêu đề và file `docs/RELEASE-NOTES-X.Y.Z.md` vào GitHub Release. Có thể chạy lại theo tag bằng `workflow_dispatch` nếu cần sửa asset hoặc ghi chú.

## 3. Điều kiện trước khi phát hành

- Windows x64.
- Git đã được cài và cấu hình tên/email.
- Node.js `22.x` và npm tương ứng.
- Có quyền push repository và tạo GitHub Release.
- `package-lock.json` đã được cập nhật và commit.
- Working tree chỉ chứa thay đổi chủ đích.
- Đã đọc `docs/REGRESSION-CHECKLIST.md`.

Kiểm tra môi trường:

```powershell
node --version
npm --version
git --version
```

Node phải là nhánh `22.x`, giống hai workflow GitHub Actions.

## 4. Khởi tạo và push repository lần đầu

Chỉ thực hiện phần này nếu thư mục vẫn chưa có `.git` và repository GitHub vẫn trống.

```powershell
Set-Location D:\File2Mockup
git init
git branch -M main
git remote add origin https://github.com/minhtuan5991/PNG-Bundle-Mockup.git
git add .
git status --short
git commit -m "Prepare PNG Bundle Mockup v1.2.0"
git push -u origin main
```

Trước `git commit`, phải đọc danh sách từ `git status --short`. Không commit:

- `node_modules/`
- `release/`
- `win-unpacked/`
- file tạm QA hoặc ảnh dữ liệu riêng của người dùng
- token, chứng thư hoặc mật khẩu

Nếu remote `origin` đã tồn tại, không chạy `git remote add` lần nữa. Kiểm tra và sửa khi cần:

```powershell
git remote -v
git remote set-url origin https://github.com/minhtuan5991/PNG-Bundle-Mockup.git
```

Sau push đầu tiên, mở tab Actions trên GitHub và chờ workflow **Windows CI** đạt.

## 5. Cài dependency và kiểm tra cục bộ

Dùng lockfile để có dependency giống CI:

```powershell
Set-Location D:\File2Mockup
npm ci
npm test
```

Không phát hành nếu test fail hoặc số lượng test thấp hơn mức dự kiến mà chưa có giải thích.

Có thể tạo installer cục bộ mà không upload:

```powershell
npm run build:installer
```

Lệnh trên tương đương build NSIS x64 với `--publish never`. Build cục bộ dùng để QA; quy trình phát hành chính vẫn nên chạy qua GitHub Actions.

## 6. Quy tắc version

Dự án dùng semantic version `MAJOR.MINOR.PATCH`:

- `PATCH`: sửa lỗi tương thích, không thay đổi lớn luồng sử dụng.
- `MINOR`: thêm tính năng tương thích ngược.
- `MAJOR`: thay đổi không tương thích hoặc thay đổi lớn dữ liệu/cài đặt.

Version phải đồng nhất tại:

- `package.json`
- `package-lock.json`
- Git tag `vX.Y.Z`
- tên installer
- `latest.yml`
- nội dung release notes

Để chuẩn bị một version mới mà chưa tạo tag tự động:

```powershell
npm version 1.2.1 --no-git-tag-version
```

Thay `1.2.1` bằng version thực tế. Lệnh cập nhật cả `package.json` và `package-lock.json`.

Kiểm tra:

```powershell
$releaseVersion = node -p "require('./package.json').version"
$lockVersion = node -p "require('./package-lock.json').version"
Write-Output "package=$releaseVersion lock=$lockVersion"
```

Không thêm version vào `productName`, `appId` hoặc tên shortcut.

## 7. Chuẩn bị commit phát hành

1. Hoàn thành toàn bộ checklist automated/manual/installer.
2. Cập nhật `README.md` nếu giao diện hoặc quy trình sử dụng thay đổi.
3. Cập nhật `docs/PROJECT-HISTORY.md` và số liệu QA cuối.
4. Ghi release notes: Added, Changed, Fixed, Known limitations.
5. Kiểm tra diff và commit.

```powershell
git status --short
git diff --check
git diff
git add package.json package-lock.json README.md docs src test .github assets
git status --short
git commit -m "Release v$releaseVersion"
git push origin main
```

Danh sách `git add` là gợi ý có phạm vi. Nếu có file dự án hợp lệ ở vị trí khác, thêm có chủ đích sau khi xem status; không dùng lệnh xóa/reset mạnh để làm sạch thay đổi không rõ nguồn gốc.

Chờ workflow **Windows CI** của commit trên `main` đạt trước khi tạo tag.

## 8. Tạo tag và phát hành

Tạo annotated tag khớp tuyệt đối với package version:

```powershell
$releaseVersion = node -p "require('./package.json').version"
git status --short
git tag -a "v$releaseVersion" -m "PNG Bundle Mockup v$releaseVersion"
git push origin "v$releaseVersion"
```

Working tree phải sạch trước khi tag. Workflow release sẽ dừng nếu `v$releaseVersion` không khớp version trong `package.json`.

Workflow thực hiện:

1. Checkout tag.
2. Cài Node.js 22.x.
3. Chạy `npm ci`.
4. Xác minh tag/version.
5. Chạy `npm test`.
6. Chạy `npm run build:installer` để tạo ba file đồng bộ.
7. Dùng GitHub CLI của runner để tạo hoặc ghi đè Release bằng đủ installer, blockmap và `latest.yml`.
8. Giữ một workflow artifact chứa các file update.

`GH_TOKEN` chỉ tồn tại trong GitHub Actions. Không ghi token vào mã nguồn, `package.json`, `latest.yml`, tài liệu hoặc release assets.

Workflow cũng hỗ trợ `workflow_dispatch` với input `tag`. Dùng cách này để build lại một tag hiện có và sửa Release thiếu asset; workflow checkout đúng tag, xác minh version rồi upload lại cả ba file bằng `--clobber`.

## 9. Artifacts bắt buộc

GitHub Release phải có đủ:

```text
PNG-Bundle-Mockup-Setup-X.Y.Z.exe
PNG-Bundle-Mockup-Setup-X.Y.Z.exe.blockmap
latest.yml
```

Vai trò:

| File | Mục đích |
| --- | --- |
| `Setup-X.Y.Z.exe` | Bộ cài đầy đủ và payload update. |
| `.exe.blockmap` | Hỗ trợ differential download. |
| `latest.yml` | Metadata để client tìm version, URL, kích thước và checksum. |

Không upload như tài sản người dùng:

- `win-unpacked/`
- `builder-debug.yml`
- `builder-effective-config.yaml`
- `*.nsis.7z`
- `node_modules/`
- `start-app.bat`

Kiểm tra `latest.yml` trỏ đúng installer cùng version và blockmap tồn tại. Không sửa thủ công `latest.yml` sau build.

Có thể ghi SHA-256 của installer vào release notes:

```powershell
Get-FileHash ".\release\PNG-Bundle-Mockup-Setup-$releaseVersion.exe" -Algorithm SHA256
```

SHA-256 công khai là tiện ích xác minh tải xuống, không thay thế code signing.

## 10. Kiểm tra GitHub Release sau publish

- Release không còn ở trạng thái draft.
- Stable release không được đánh dấu prerelease.
- Tag và tiêu đề đúng `vX.Y.Z`.
- Có đủ ba artifact bắt buộc.
- Tải installer từ chính trang GitHub Release về một máy/VM sạch.
- File cài được bằng tài khoản standard user.
- Shortcut có icon đúng và mở app không cần file batch.
- Cửa sổ hiển thị đúng version.
- Chạy một quy trình tạo mockup thực tế.
- Kiểm tra updater bằng một bản cũ hơn đã cài, không kiểm tra chỉ bằng app development.

URL stable mới nhất:

```text
https://github.com/minhtuan5991/PNG-Bundle-Mockup/releases/latest
```

## 11. Chuyển người dùng từ v1.1.0 portable

v1.1.0 portable không có updater. Release notes v1.2.0 phải nêu rõ:

1. Tải `PNG-Bundle-Mockup-Setup-1.2.0.exe`.
2. Chạy installer thủ công một lần.
3. Mở app từ Desktop hoặc Start Menu.
4. Các phiên bản installer sau đó mới có thể được tìm và cài qua updater.

Không hứa rằng portable v1.1.0 sẽ tự hiện thông báo v1.2.0.

## 12. Code signing

Hiện release được build với:

```text
CSC_IDENTITY_AUTO_DISCOVERY=false
```

Vì vậy installer chưa ký và Windows có thể hiện SmartScreen/Unknown Publisher. Khi có chứng thư:

- Lưu secret/chứng thư trong GitHub Actions, không commit.
- Giữ publisher name ổn định.
- Bỏ cấu hình vô hiệu hóa discovery theo quy trình ký đã chọn.
- Kiểm tra chữ ký của installer và EXE.
- Chạy lại toàn bộ ma trận update từ bản đã ký sang bản đã ký mới.

## 13. Rollback và hotfix

### 13.1 Nguyên tắc

- Không ghi đè assets của một release đã đến tay người dùng.
- Không tái sử dụng tag đã phát hành.
- Không giảm version để rollback; updater thông thường không downgrade.
- Cách rollback an toàn là revert mã lỗi, tăng patch version và phát hành version cao hơn.

Ví dụ v1.2.0 lỗi và cần khôi phục logic cũ:

```powershell
git switch main
git pull --ff-only origin main
git revert <commit-gay-loi>
npm version 1.2.1 --no-git-tag-version
npm test
git add .
git commit -m "Hotfix v1.2.1"
git push origin main
git tag -a v1.2.1 -m "PNG Bundle Mockup v1.2.1"
git push origin v1.2.1
```

Trước `git add .`, luôn kiểm tra `git status --short` để tránh đưa file riêng hoặc output build vào commit.

### 13.2 Release nguy hiểm đang ở latest

1. Đánh dấu release bị lỗi rõ ràng trong ghi chú.
2. Nếu cần, tạm chuyển release thành draft để ngăn lượt tải mới; không coi đây là rollback đầy đủ vì client có thể đã tải metadata.
3. Chuẩn bị hotfix có version cao hơn ngay lập tức.
4. Phát hành hotfix theo toàn bộ checklist.
5. Giữ release cũ để truy vết hoặc xóa chỉ sau khi đã đánh giá ảnh hưởng và liên kết tải xuống.

### 13.3 Workflow tag thất bại

- Nếu tag chưa tạo release công khai, sửa nguyên nhân trên `main` rồi tạo một patch version mới là phương án ít nhầm lẫn nhất.
- Chỉ xóa và tạo lại tag khi chắc chắn tag chưa được người dùng/CI khác sử dụng và chưa có release phát hành.
- Không sửa `latest.yml` bằng tay để ép updater nhận bản khác.

## 14. Lỗi thường gặp

| Hiện tượng | Kiểm tra |
| --- | --- |
| Workflow báo tag không khớp | So sánh `github.ref_name`, `package.json` và `package-lock.json`. |
| Không tạo được release | Kiểm tra `permissions: contents: write` và trạng thái Actions. |
| App không thấy update | Kiểm tra app là bản packaged, release không draft/prerelease, version mới lớn hơn và `latest.yml` tồn tại. |
| Download update lỗi | Kiểm tra URL/tên/size/checksum trong `latest.yml` và blockmap. |
| Cài xong mất preferences | Kiểm tra không đổi app identity và `deleteAppDataOnUninstall` vẫn là `false`. |
| Có nhiều shortcut/app song song | Kiểm tra `appId`, `productName`, `shortcutName` và install mode không bị đổi giữa các version. |
| SmartScreen cảnh báo | Đây là giới hạn của bản unsigned; xác minh tải từ đúng GitHub Release và lên kế hoạch code signing. |
