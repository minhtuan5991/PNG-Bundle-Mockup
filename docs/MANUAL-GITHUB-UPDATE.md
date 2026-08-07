# Hướng dẫn tự cập nhật PNG Bundle Mockup trên GitHub

Tài liệu này dùng khi chủ dự án muốn tự phát hành bản Windows mới. Codex không tự push, tạo tag hoặc thay đổi GitHub Release khi chỉ cập nhật mã nguồn local.

## 1. Quy tắc phiên bản

- `v1.2.4` đã là Release public và không được ghi đè asset hoặc di chuyển tag.
- Bản chứa thay đổi sau v1.2.4 phải dùng `1.2.5` hoặc cao hơn.
- Mỗi Release chỉ có đúng ba asset:
  - `PNG-Bundle-Mockup-Setup-X.Y.Z.exe`
  - `PNG-Bundle-Mockup-Setup-X.Y.Z.exe.blockmap`
  - `latest.yml`
- Không upload `win-unpacked`, `builder-debug.yml`, thư mục `Input` hoặc ảnh/PDF riêng của người dùng.

## 2. Chuẩn bị phiên bản mới

Mở PowerShell tại repository:

```powershell
Set-Location D:\File2Mockup
git pull --ff-only
npm ci
npm version 1.2.5 --no-git-tag-version
```

Sau đó:

1. Tạo `docs/RELEASE-NOTES-1.2.5.md` và ghi rõ thay đổi, kết quả QA cùng giới hạn còn lại.
2. Cập nhật `CHANGELOG.md`, `README.md`, `docs/PROJECT-HISTORY.md` và `docs/REGRESSION-CHECKLIST.md` nếu cần.
3. Kiểm tra `package.json`, `package-lock.json` và package root trong lockfile cùng mang version mới.

## 3. Kiểm thử trước khi push

```powershell
npm test
npm run build:installer
git diff --check
git status --short
```

Xác nhận bản build local có đủ ba file:

```powershell
$version = node -p "require('./package.json').version"
Get-ChildItem `
  ".\release\PNG-Bundle-Mockup-Setup-$version.exe", `
  ".\release\PNG-Bundle-Mockup-Setup-$version.exe.blockmap", `
  ".\release\latest.yml"
```

Lưu ý: repository hiện có thể chứa các JPG riêng chưa được Git theo dõi trong `Input`. Không dùng `git add .` hoặc `git add -A`. Chỉ stage chính xác những file mã nguồn/tài liệu đã kiểm tra, ví dụ:

```powershell
git add -- package.json package-lock.json CHANGELOG.md README.md
git add -- build/installer.nsh test/packaging-config.test.js
git add -- docs/RELEASE-NOTES-1.2.5.md docs/PROJECT-HISTORY.md docs/REGRESSION-CHECKLIST.md
git status --short
```

Nếu `git status --short` cho thấy ảnh/PDF riêng trong `Input` đã được stage, chạy `git restore --staged -- <đường-dẫn-file>` trước khi commit.

## 4. Push mã nguồn và kích hoạt Release Windows

```powershell
git commit -m "Release v$version"
git push origin main
git tag -a "v$version" -m "PNG Bundle Mockup v$version"
git push origin "v$version"
```

Push tag `vX.Y.Z` sẽ kích hoạt workflow `.github/workflows/release-windows.yml`. Workflow cài dependency từ lockfile, chạy test, build trên Windows và tạo Release nếu tag đó chưa có Release public.

Không tạo lại cùng một tag nếu workflow báo Release public đã tồn tại. Muốn sửa binary đã public, tăng patch version và phát hành tag mới.

## 5. Kiểm tra trên giao diện GitHub

1. Mở repository `minhtuan5991/PNG-Bundle-Mockup` → **Actions** → **Release Windows**.
2. Chờ workflow của tag mới hoàn tất màu xanh.
3. Mở **Releases** và xác nhận Release không phải Draft/Prerelease.
4. Xác nhận chỉ có đúng ba asset đã liệt kê ở mục 1.
5. Tải `latest.yml`, kiểm tra `version` và `path` khớp installer mới.
6. Tải installer từ Release về một thư mục khác và kiểm tra cài mới/nâng cấp trước khi thông báo cho người dùng.

Nếu workflow không được tạo vì GitHub Actions đang gián đoạn, không sửa hoặc upload đè Release cũ. Chờ Actions hoạt động lại rồi vào **Actions → Release Windows → Run workflow**, nhập tag mới và chọn `publish-if-missing`. Tùy chọn `sync-notes` chỉ đồng bộ ghi chú, không thay asset của Release public.
