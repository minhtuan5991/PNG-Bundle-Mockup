'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFString,
  StandardFonts,
  rgb,
} = require('pdf-lib');

const PDF_EXTENSION = '.pdf';
const MAX_URL_LENGTH = 2048;
const MIN_VISIBLE_FONT_SIZE = 8;
const MAX_VISIBLE_FONT_SIZE = 20;
const DEFAULT_BACKGROUND = Object.freeze({ r: 252 / 255, g: 246 / 255, b: 238 / 255 });
const DEFAULT_TEXT_COLOR = Object.freeze({ r: 0, g: 0, b: 0 });

class PdfDownloadError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'PdfDownloadError';
    this.code = code;
    Object.assign(this, details);
  }
}

class PdfDownloadCancelledError extends PdfDownloadError {
  constructor() {
    super('Đã huỷ thao tác tạo PDF Download.', 'CANCELLED');
    this.name = 'PdfDownloadCancelledError';
  }
}

function fail(message, code, details) {
  throw new PdfDownloadError(message, code, details);
}

function throwIfCancelled(isCancelled) {
  if (typeof isCancelled === 'function' && isCancelled()) {
    throw new PdfDownloadCancelledError();
  }
}

function normalizeAbsolutePath(candidatePath, label) {
  if (typeof candidatePath !== 'string' || candidatePath.trim().length === 0) {
    fail(`${label} không được để trống.`, 'INVALID_PDF_PATH');
  }
  if (!path.isAbsolute(candidatePath)) {
    fail(`${label} phải là đường dẫn tuyệt đối.`, 'INVALID_PDF_PATH', { filePath: candidatePath });
  }
  return path.normalize(candidatePath);
}

function normalizeDownloadUrl(candidateUrl) {
  if (typeof candidateUrl !== 'string' || candidateUrl.trim().length === 0) {
    fail('Link tải không được để trống.', 'INVALID_DOWNLOAD_URL');
  }

  let parsed;
  try {
    parsed = new URL(candidateUrl.trim());
  } catch {
    fail('Link tải không hợp lệ.', 'INVALID_DOWNLOAD_URL');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    fail('Link tải chỉ hỗ trợ giao thức HTTP hoặc HTTPS.', 'UNSUPPORTED_DOWNLOAD_URL');
  }

  const normalized = parsed.href;
  if (normalized.length > MAX_URL_LENGTH) {
    fail(`Link tải không được vượt quá ${MAX_URL_LENGTH} ký tự.`, 'DOWNLOAD_URL_TOO_LONG');
  }
  return normalized;
}

async function assertDirectory(directoryPath, label, options = {}) {
  const fsImpl = options.fsImpl || fs;
  const normalized = normalizeAbsolutePath(directoryPath, label);
  let stat;
  try {
    stat = await fsImpl.stat(normalized);
  } catch (error) {
    fail(`${label} không tồn tại.`, 'PDF_DIRECTORY_NOT_FOUND', {
      filePath: normalized,
      cause: error,
    });
  }
  if (!stat.isDirectory()) {
    fail(`${label} không phải là thư mục.`, 'INVALID_PDF_DIRECTORY', { filePath: normalized });
  }
  return normalized;
}

async function findPdfTemplates(inputDirectory, options = {}) {
  const fsImpl = options.fsImpl || fs;
  const directoryPath = await assertDirectory(inputDirectory, 'Thư mục Input', { fsImpl });
  const entries = await fsImpl.readdir(directoryPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === PDF_EXTENSION)
    .sort((left, right) =>
      left.name.localeCompare(right.name, 'vi', { numeric: true, sensitivity: 'base' }),
    )
    .map((entry) => path.join(directoryPath, entry.name));
}

async function resolvePdfTemplate(inputDirectory, options = {}) {
  const templates = await findPdfTemplates(inputDirectory, options);
  if (templates.length === 0) {
    fail('Không tìm thấy file PDF mẫu trong thư mục Input.', 'PDF_TEMPLATE_NOT_FOUND', {
      filePath: path.normalize(inputDirectory),
    });
  }
  if (templates.length > 1) {
    fail('Thư mục Input chỉ được chứa một file PDF mẫu.', 'MULTIPLE_PDF_TEMPLATES', {
      templatePaths: templates,
    });
  }
  return templates[0];
}

async function validateTemplatePath(templatePath, options = {}) {
  const fsImpl = options.fsImpl || fs;
  const normalized = normalizeAbsolutePath(templatePath, 'File PDF mẫu');
  if (path.extname(normalized).toLowerCase() !== PDF_EXTENSION) {
    fail('File mẫu phải có định dạng PDF.', 'INVALID_PDF_TEMPLATE', { filePath: normalized });
  }

  let stat;
  try {
    stat = await fsImpl.stat(normalized);
  } catch (error) {
    fail('File PDF mẫu không tồn tại.', 'PDF_TEMPLATE_NOT_FOUND', {
      filePath: normalized,
      cause: error,
    });
  }
  if (!stat.isFile()) {
    fail('Đường dẫn PDF mẫu không phải là file.', 'INVALID_PDF_TEMPLATE', { filePath: normalized });
  }
  return normalized;
}

function decodePdfString(value) {
  return value && typeof value.decodeText === 'function' ? value.decodeText() : null;
}

function numberFromPdf(value) {
  return value instanceof PDFNumber ? value.asNumber() : null;
}

function readRectangle(annotation) {
  const rectangle = annotation.lookup(PDFName.of('Rect'));
  if (!(rectangle instanceof PDFArray) || rectangle.size() !== 4) return null;
  const values = Array.from({ length: 4 }, (_, index) => numberFromPdf(rectangle.lookup(index)));
  if (values.some((value) => !Number.isFinite(value))) return null;

  const [x1, y1, x2, y2] = values;
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

function collectUriAnnotations(document) {
  const annotations = [];
  for (const [pageIndex, page] of document.getPages().entries()) {
    const pageAnnotations = page.node.Annots();
    if (!(pageAnnotations instanceof PDFArray)) continue;

    for (let index = 0; index < pageAnnotations.size(); index += 1) {
      const annotation = pageAnnotations.lookup(index, PDFDict);
      if (!annotation || annotation.lookup(PDFName.of('Subtype'))?.toString() !== '/Link') continue;
      const action = annotation.lookup(PDFName.of('A'), PDFDict);
      if (!action || action.lookup(PDFName.of('S'))?.toString() !== '/URI') continue;
      const uri = decodePdfString(action.lookup(PDFName.of('URI')));
      const rectangle = readRectangle(annotation);
      if (!uri || !rectangle) continue;
      annotations.push({ page, pageIndex, annotation, action, rectangle, uri });
    }
  }
  return annotations;
}

function selectDownloadAnnotationGroup(annotations) {
  const groups = new Map();
  for (const entry of annotations) {
    const group = groups.get(entry.uri) || [];
    group.push(entry);
    groups.set(entry.uri, group);
  }

  const candidates = [...groups.entries()]
    .filter(([, entries]) => entries.length >= 2)
    .map(([uri, entries]) => ({
      uri,
      entries,
      totalArea: entries.reduce(
        (sum, entry) => sum + entry.rectangle.width * entry.rectangle.height,
        0,
      ),
    }))
    .sort((left, right) =>
      right.entries.length - left.entries.length || right.totalArea - left.totalArea,
    );

  if (candidates.length === 0) {
    fail(
      'PDF mẫu cần có ít nhất hai vùng link cùng trỏ đến link cũ: nút Download và link hiển thị.',
      'PDF_TEMPLATE_LINKS_NOT_FOUND',
    );
  }
  if (
    candidates.length > 1 &&
    candidates[0].entries.length === candidates[1].entries.length &&
    Math.abs(candidates[0].totalArea - candidates[1].totalArea) < 0.01
  ) {
    fail('Không xác định được nhóm link cần thay trong PDF mẫu.', 'AMBIGUOUS_PDF_TEMPLATE_LINKS');
  }
  return candidates[0];
}

function classifyLinkRegions(entries) {
  const byPage = new Map();
  for (const entry of entries) {
    const pageEntries = byPage.get(entry.pageIndex) || [];
    pageEntries.push(entry);
    byPage.set(entry.pageIndex, pageEntries);
  }
  const pageGroups = [];
  for (const [pageIndex, pageEntries] of [...byPage.entries()].sort((left, right) => left[0] - right[0])) {
    if (pageEntries.length < 2) {
      fail(
        `Trang ${pageIndex + 1} cần có cả vùng nút Download và vùng link hiển thị.`,
        'UNSUPPORTED_PDF_TEMPLATE',
        { pageNumber: pageIndex + 1 },
      );
    }

    const byHeight = [...pageEntries].sort(
      (left, right) =>
        right.rectangle.height - left.rectangle.height ||
        right.rectangle.width * right.rectangle.height - left.rectangle.width * left.rectangle.height,
    );
    const button = byHeight[0];
    const secondHeight = byHeight[1].rectangle.height;
    if (button.rectangle.height < secondHeight * 1.35) {
      fail(
        `Không xác định được vùng nút Download ở trang ${pageIndex + 1}.`,
        'PDF_TEMPLATE_BUTTON_NOT_FOUND',
        { pageNumber: pageIndex + 1 },
      );
    }

    const visibleLinks = pageEntries
      .filter((entry) => entry !== button)
      .sort((left, right) =>
        right.rectangle.y - left.rectangle.y || left.rectangle.x - right.rectangle.x,
      );
    pageGroups.push({ page: button.page, pageIndex, button, visibleLinks });
  }
  return pageGroups;
}

function colorValue(candidate, fallback) {
  const result = {};
  for (const channel of ['r', 'g', 'b']) {
    const value = candidate?.[channel];
    result[channel] = typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.min(1, value))
      : fallback[channel];
  }
  return result;
}

function candidateBreaks(text, offset, lineIndex, rectangles) {
  const remainingWidths = rectangles
    .slice(lineIndex)
    .reduce((sum, rectangle) => sum + rectangle.width, 0);
  const target = offset + Math.max(
    1,
    Math.round((text.length - offset) * rectangles[lineIndex].width / remainingWidths),
  );
  const finalLine = lineIndex === rectangles.length - 1;
  if (finalLine) return [text.length];

  const maximum = text.length - (rectangles.length - lineIndex - 1);
  const candidates = [];
  for (let end = offset + 1; end <= maximum; end += 1) candidates.push(end);
  const separator = /[/?&=_\-.#]/;
  return candidates.sort((left, right) => {
    const leftPenalty = Math.abs(left - target) - (separator.test(text[left - 1]) ? 3 : 0);
    const rightPenalty = Math.abs(right - target) - (separator.test(text[right - 1]) ? 3 : 0);
    return leftPenalty - rightPenalty;
  });
}

function fitLinesAtSize(text, font, rectangles, fontSize, horizontalPadding) {
  const memo = new Map();

  function search(lineIndex, offset) {
    const key = `${lineIndex}:${offset}`;
    if (memo.has(key)) return memo.get(key);
    if (lineIndex >= rectangles.length) return offset === text.length ? [] : null;

    const availableWidth = rectangles[lineIndex].width - horizontalPadding * 2;
    for (const end of candidateBreaks(text, offset, lineIndex, rectangles)) {
      const line = text.slice(offset, end);
      if (font.widthOfTextAtSize(line, fontSize) > availableWidth) continue;
      const remainder = search(lineIndex + 1, end);
      if (remainder) {
        const result = [line, ...remainder];
        memo.set(key, result);
        return result;
      }
    }
    memo.set(key, null);
    return null;
  }

  return search(0, 0);
}

function layoutVisibleUrl(text, font, rectangles, options = {}) {
  const horizontalPadding = options.horizontalPadding ?? 7;
  const maxByHeight = Math.min(
    ...rectangles.map((rectangle) => rectangle.height * 0.62),
  );
  const maximumSize = Math.min(
    options.maximumFontSize ?? MAX_VISIBLE_FONT_SIZE,
    maxByHeight,
  );
  const minimumSize = options.minimumFontSize ?? MIN_VISIBLE_FONT_SIZE;

  for (let fontSize = maximumSize; fontSize >= minimumSize; fontSize -= 0.25) {
    if (
      font.widthOfTextAtSize(text, fontSize) <=
      rectangles[0].width - horizontalPadding * 2
    ) {
      return { lines: [text], fontSize, rectangles: [rectangles[0]] };
    }
    const lines = fitLinesAtSize(text, font, rectangles, fontSize, horizontalPadding);
    if (lines) return { lines, fontSize, rectangles: rectangles.slice(0, lines.length) };
  }

  fail(
    'Link tải quá dài để hiển thị rõ trong vùng link của PDF mẫu.',
    'DOWNLOAD_URL_DOES_NOT_FIT_TEMPLATE',
  );
}

function unionRectangles(rectangles, margin = 3) {
  const minX = Math.min(...rectangles.map((rectangle) => rectangle.x));
  const minY = Math.min(...rectangles.map((rectangle) => rectangle.y));
  const maxX = Math.max(...rectangles.map((rectangle) => rectangle.x + rectangle.width));
  const maxY = Math.max(...rectangles.map((rectangle) => rectangle.y + rectangle.height));
  return {
    x: minX - margin,
    y: minY - margin,
    width: maxX - minX + margin * 2,
    height: maxY - minY + margin * 2,
  };
}

function updateAnnotationLinks(entries, downloadUrl, isCancelled) {
  for (const entry of entries) {
    throwIfCancelled(isCancelled);
    entry.action.set(PDFName.of('URI'), PDFString.of(downloadUrl));
    entry.annotation.set(PDFName.of('Contents'), PDFString.of(downloadUrl));
  }
}

function replaceExactDocumentStrings(document, previousUrl, downloadUrl, isCancelled) {
  const visited = new WeakSet();
  let replacements = 0;
  let visitedObjects = 0;

  function replacementFor(value) {
    if (!(value instanceof PDFString) && !(value instanceof PDFHexString)) return null;
    if (decodePdfString(value) !== previousUrl) return null;
    replacements += 1;
    return value instanceof PDFHexString
      ? PDFHexString.fromText(downloadUrl)
      : PDFString.of(downloadUrl);
  }

  function visit(value) {
    if (!value || typeof value !== 'object' || visited.has(value)) return;
    visited.add(value);
    visitedObjects += 1;
    if (visitedObjects % 128 === 0) throwIfCancelled(isCancelled);

    if (value instanceof PDFDict) {
      for (const [key, child] of value.entries()) {
        const replacement = replacementFor(child);
        if (replacement) value.set(key, replacement);
        else visit(child);
      }
      return;
    }
    if (value instanceof PDFArray) {
      for (let index = 0; index < value.size(); index += 1) {
        const child = value.get(index);
        const replacement = replacementFor(child);
        if (replacement) value.set(index, replacement);
        else visit(child);
      }
      return;
    }
    if (value.dict instanceof PDFDict) visit(value.dict);
  }

  throwIfCancelled(isCancelled);
  for (const [, object] of document.context.enumerateIndirectObjects()) visit(object);
  throwIfCancelled(isCancelled);
  return replacements;
}

async function replaceVisibleDownloadLinks(
  document,
  group,
  downloadUrl,
  options = {},
  isCancelled,
) {
  const pageGroups = classifyLinkRegions(group.entries);
  throwIfCancelled(isCancelled);
  const font = await document.embedFont(StandardFonts.HelveticaBold);
  throwIfCancelled(isCancelled);
  const background = colorValue(options.backgroundColor, DEFAULT_BACKGROUND);
  const textColor = colorValue(options.textColor, DEFAULT_TEXT_COLOR);
  const visibleLinkPages = [];

  for (const { page, pageIndex, visibleLinks } of pageGroups) {
    throwIfCancelled(isCancelled);
    const rectangles = visibleLinks.map((entry) => entry.rectangle);
    const layout = layoutVisibleUrl(downloadUrl, font, rectangles, options);
    const cover = unionRectangles(rectangles, options.coverMargin ?? 3);

    page.drawRectangle({
      ...cover,
      color: rgb(background.r, background.g, background.b),
      borderWidth: 0,
    });

    for (let index = 0; index < layout.lines.length; index += 1) {
      throwIfCancelled(isCancelled);
      const line = layout.lines[index];
      const rectangle = layout.rectangles[index];
      const textWidth = font.widthOfTextAtSize(line, layout.fontSize);
      const textHeight = font.heightAtSize(layout.fontSize, { descender: true });
      const x = rectangle.x + (rectangle.width - textWidth) / 2;
      const y = rectangle.y + (rectangle.height - textHeight) / 2 + layout.fontSize * 0.18;
      page.drawText(line, {
        x,
        y,
        size: layout.fontSize,
        font,
        color: rgb(textColor.r, textColor.g, textColor.b),
      });
      page.drawLine({
        start: { x, y: y - Math.max(1, layout.fontSize * 0.08) },
        end: { x: x + textWidth, y: y - Math.max(1, layout.fontSize * 0.08) },
        thickness: Math.max(0.75, layout.fontSize * 0.055),
        color: rgb(textColor.r, textColor.g, textColor.b),
      });
    }

    visibleLinkPages.push({
      pageNumber: pageIndex + 1,
      visibleLinkLines: layout.lines,
      visibleFontSize: layout.fontSize,
    });
  }

  const pdfStringsUpdated = replaceExactDocumentStrings(
    document,
    group.uri,
    downloadUrl,
    isCancelled,
  );
  updateAnnotationLinks(group.entries, downloadUrl, isCancelled);
  const firstPage = visibleLinkPages[0];
  return {
    pageIndex: firstPage.pageNumber - 1,
    pageNumbers: visibleLinkPages.map((entry) => entry.pageNumber),
    pagesUpdated: visibleLinkPages.length,
    visibleLinkLines: firstPage.visibleLinkLines,
    visibleFontSize: firstPage.visibleFontSize,
    visibleLinkPages,
    linkAnnotationsUpdated: group.entries.length,
    pdfStringsUpdated,
  };
}

function validateOutputFileName(candidate, templatePath) {
  const fileName = candidate === undefined ? path.basename(templatePath) : candidate;
  if (
    typeof fileName !== 'string' ||
    fileName.trim().length === 0 ||
    path.basename(fileName) !== fileName ||
    path.extname(fileName).toLowerCase() !== PDF_EXTENSION
  ) {
    fail('Tên file PDF kết quả không hợp lệ.', 'INVALID_PDF_OUTPUT_NAME');
  }
  return fileName;
}

function numberedFileName(fileName, sequence) {
  if (sequence === 1) return fileName;
  const parsed = path.parse(fileName);
  return `${parsed.name}_${sequence}${parsed.ext}`;
}

async function writeUniquePdf(outputDirectory, fileName, bytes, options = {}) {
  const fsImpl = options.fsImpl || fs;
  const isCancelled = options.isCancelled;
  throwIfCancelled(isCancelled);
  await fsImpl.mkdir(outputDirectory, { recursive: true });
  throwIfCancelled(isCancelled);

  const temporaryPath = path.join(
    outputDirectory,
    `.pdf-download-${process.pid}-${randomUUID()}.tmp`,
  );
  let temporaryHandle;
  let committedPath = null;

  try {
    temporaryHandle = await fsImpl.open(temporaryPath, 'wx', 0o600);
    await temporaryHandle.writeFile(bytes);
    if (typeof temporaryHandle.sync === 'function') await temporaryHandle.sync();
    await temporaryHandle.close();
    temporaryHandle = null;
    throwIfCancelled(isCancelled);

    if (typeof fsImpl.link !== 'function') {
      fail(
        'Hệ thống file không hỗ trợ commit PDF nguyên tử.',
        'PDF_ATOMIC_COMMIT_UNSUPPORTED',
      );
    }

    for (let sequence = 1; sequence <= 9999; sequence += 1) {
      throwIfCancelled(isCancelled);
      const outputPath = path.join(outputDirectory, numberedFileName(fileName, sequence));
      try {
        await fsImpl.link(temporaryPath, outputPath);
        committedPath = outputPath;
        break;
      } catch (error) {
        if (error?.code === 'EEXIST') continue;
        if (['EPERM', 'EXDEV', 'ENOTSUP', 'EOPNOTSUPP', 'ENOSYS'].includes(error?.code)) {
          fail(
            'Ổ đĩa kết quả không hỗ trợ commit PDF nguyên tử.',
            'PDF_ATOMIC_COMMIT_UNSUPPORTED',
            { filePath: outputDirectory, cause: error },
          );
        }
        throw error;
      }
    }

    if (!committedPath) {
      fail('Không thể tạo tên file PDF kết quả duy nhất.', 'PDF_OUTPUT_NAME_EXHAUSTED');
    }
    throwIfCancelled(isCancelled);
    return committedPath;
  } catch (error) {
    if (temporaryHandle) await temporaryHandle.close().catch(() => {});
    if (committedPath) await fsImpl.unlink(committedPath).catch(() => {});
    throw error;
  } finally {
    await fsImpl.unlink(temporaryPath).catch(() => {});
  }
}

async function createDownloadPdf(options = {}) {
  const fsImpl = options.fsImpl || fs;
  const isCancelled = options.isCancelled;
  throwIfCancelled(isCancelled);
  const downloadUrl = normalizeDownloadUrl(options.downloadUrl);
  const templatePath = options.templatePath
    ? await validateTemplatePath(options.templatePath, { fsImpl })
    : await resolvePdfTemplate(options.inputDirectory, { fsImpl });
  const outputDirectory = normalizeAbsolutePath(options.outputDirectory, 'Thư mục kết quả');
  const outputFileName = validateOutputFileName(options.outputFileName, templatePath);
  throwIfCancelled(isCancelled);

  let sourceBytes;
  try {
    sourceBytes = await fsImpl.readFile(templatePath);
  } catch (error) {
    fail('Không thể đọc file PDF mẫu.', 'UNREADABLE_PDF_TEMPLATE', {
      filePath: templatePath,
      cause: error,
    });
  }
  throwIfCancelled(isCancelled);

  let document;
  try {
    document = await PDFDocument.load(sourceBytes, { updateMetadata: false });
  } catch (error) {
    fail('File PDF mẫu bị hỏng hoặc không được hỗ trợ.', 'UNREADABLE_PDF_TEMPLATE', {
      filePath: templatePath,
      cause: error,
    });
  }
  throwIfCancelled(isCancelled);

  const group = selectDownloadAnnotationGroup(collectUriAnnotations(document));
  const replacement = await replaceVisibleDownloadLinks(
    document,
    group,
    downloadUrl,
    options.style,
    isCancelled,
  );
  throwIfCancelled(isCancelled);
  const outputBytes = await document.save({
    addDefaultPage: false,
    updateFieldAppearances: false,
    useObjectStreams: false,
  });
  throwIfCancelled(isCancelled);
  const outputPath = await writeUniquePdf(outputDirectory, outputFileName, outputBytes, {
    fsImpl,
    isCancelled,
  });
  try {
    throwIfCancelled(isCancelled);
  } catch (error) {
    await fsImpl.unlink(outputPath).catch(() => {});
    throw error;
  }

  return {
    templatePath,
    outputPath,
    outputName: path.basename(outputPath),
    previousUrl: group.uri,
    downloadUrl,
    pageNumber: replacement.pageIndex + 1,
    pageNumbers: replacement.pageNumbers,
    pagesUpdated: replacement.pagesUpdated,
    visibleLinkLines: replacement.visibleLinkLines,
    visibleFontSize: replacement.visibleFontSize,
    visibleLinkPages: replacement.visibleLinkPages,
    linkAnnotationsUpdated: replacement.linkAnnotationsUpdated,
    pdfStringsUpdated: replacement.pdfStringsUpdated,
  };
}

module.exports = {
  MAX_URL_LENGTH,
  PdfDownloadError,
  PdfDownloadCancelledError,
  normalizeDownloadUrl,
  findPdfTemplates,
  resolvePdfTemplate,
  createDownloadPdf,
};
