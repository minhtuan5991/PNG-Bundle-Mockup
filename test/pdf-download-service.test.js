'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFString,
  StandardFonts,
  rgb,
} = require('pdf-lib');
const {
  normalizeDownloadUrl,
  findPdfTemplates,
  resolvePdfTemplate,
  createDownloadPdf,
} = require('../src/services/pdf-download-service');

const OLD_URL = 'https://drive.example.test/folders/old-download-target';

async function makeWorkspace(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'png-bundle-pdf-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

function addUriAnnotation(document, page, rectangle, uri) {
  const annotation = document.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [
      rectangle.x,
      rectangle.y,
      rectangle.x + rectangle.width,
      rectangle.y + rectangle.height,
    ],
    Border: [0, 0, 0],
    A: {
      S: 'URI',
      URI: PDFString.of(uri),
    },
    Contents: PDFString.of(uri),
  });
  page.node.addAnnot(document.context.register(annotation));
}

async function createTemplatePdf(filePath, options = {}) {
  const document = await PDFDocument.create();
  document.setSubject(OLD_URL);
  const page = document.addPage([600, 800]);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  page.drawRectangle({ x: 0, y: 0, width: 600, height: 800, color: rgb(252 / 255, 246 / 255, 238 / 255) });
  page.drawText('Thank You!', { x: 210, y: 650, size: 28, font: bold });
  page.drawRectangle({ x: 150, y: 320, width: 300, height: 90, color: rgb(0, 0, 0) });
  page.drawText('Download', { x: 220, y: 350, size: 25, font: regular, color: rgb(1, 1, 1) });
  page.drawText('https://drive.example.test/folders/', { x: 65, y: 250, size: 18, font: bold });
  page.drawText('old-download-target', { x: 190, y: 220, size: 18, font: bold });

  if (options.withLinks !== false) {
    addUriAnnotation(document, page, { x: 150, y: 320, width: 300, height: 90 }, OLD_URL);
    addUriAnnotation(document, page, { x: 50, y: 240, width: 500, height: 28 }, OLD_URL);
    addUriAnnotation(document, page, { x: 175, y: 210, width: 250, height: 28 }, OLD_URL);
  }
  await fs.writeFile(filePath, await document.save({ useObjectStreams: false }));
}

async function createMultiPageTemplatePdf(filePath, options = {}) {
  const document = await PDFDocument.create();
  document.setSubject(OLD_URL);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);

  for (let pageIndex = 0; pageIndex < 2; pageIndex += 1) {
    const page = document.addPage([600, 800]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: 600,
      height: 800,
      color: rgb(252 / 255, 246 / 255, 238 / 255),
    });
    page.drawRectangle({ x: 150, y: 320, width: 300, height: 90, color: rgb(0, 0, 0) });
    page.drawText(`Download ${pageIndex + 1}`, {
      x: 220,
      y: 350,
      size: 22,
      font: regular,
      color: rgb(1, 1, 1),
    });
    page.drawText(OLD_URL, { x: 55, y: 250, size: 11, font: bold });

    if (!options.splitAcrossPages || pageIndex === 0) {
      addUriAnnotation(document, page, { x: 150, y: 320, width: 300, height: 90 }, OLD_URL);
    }
    if (!options.splitAcrossPages || pageIndex === 1) {
      addUriAnnotation(document, page, { x: 50, y: 238, width: 500, height: 28 }, OLD_URL);
    }
  }

  await fs.writeFile(filePath, await document.save({ useObjectStreams: false }));
}

function countPageContentStreams(page) {
  const contents = page.node.Contents();
  if (!contents) return 0;
  return contents instanceof PDFArray ? contents.size() : 1;
}

function createFsAdapter(overrides = {}) {
  return {
    stat: (...args) => fs.stat(...args),
    readdir: (...args) => fs.readdir(...args),
    readFile: (...args) => fs.readFile(...args),
    mkdir: (...args) => fs.mkdir(...args),
    open: (...args) => fs.open(...args),
    link: (...args) => fs.link(...args),
    unlink: (...args) => fs.unlink(...args),
    ...overrides,
  };
}

function readUriAnnotations(document) {
  const result = [];
  for (const page of document.getPages()) {
    const annotations = page.node.Annots();
    if (!(annotations instanceof PDFArray)) continue;
    for (let index = 0; index < annotations.size(); index += 1) {
      const annotation = annotations.lookup(index, PDFDict);
      const action = annotation?.lookup(PDFName.of('A'), PDFDict);
      const uri = action?.lookup(PDFName.of('URI'));
      if (uri && typeof uri.decodeText === 'function') result.push(uri.decodeText());
    }
  }
  return result;
}

test('normalizeDownloadUrl chi cho phep HTTP(S) va chuan hoa Unicode thanh URL ASCII', () => {
  assert.equal(
    normalizeDownloadUrl('  HTTPS://Example.COM/path?q=hello world  '),
    'https://example.com/path?q=hello%20world',
  );
  assert.match(normalizeDownloadUrl('https://vi-du.test/tai-xuong-ảnh'), /%E1%BA%A3nh$/);
  assert.throws(
    () => normalizeDownloadUrl('javascript:alert(1)'),
    (error) => error.code === 'UNSUPPORTED_DOWNLOAD_URL',
  );
  assert.throws(
    () => normalizeDownloadUrl('not a URL'),
    (error) => error.code === 'INVALID_DOWNLOAD_URL',
  );
});

test('tim PDF mau khong phan biet hoa thuong va tu choi nhieu file de tranh chon nham', async (t) => {
  const root = await makeWorkspace(t);
  const inputDirectory = path.join(root, 'Input');
  await fs.mkdir(inputDirectory);
  assert.deepEqual(await findPdfTemplates(inputDirectory), []);
  await assert.rejects(
    () => resolvePdfTemplate(inputDirectory),
    (error) => error.code === 'PDF_TEMPLATE_NOT_FOUND',
  );

  const templateA = path.join(inputDirectory, 'Download.PDF');
  await createTemplatePdf(templateA);
  assert.equal(await resolvePdfTemplate(inputDirectory), templateA);

  const templateB = path.join(inputDirectory, 'Download 2.pdf');
  await createTemplatePdf(templateB);
  assert.deepEqual(await findPdfTemplates(inputDirectory), [templateB, templateA]);
  await assert.rejects(
    () => resolvePdfTemplate(inputDirectory),
    (error) => error.code === 'MULTIPLE_PDF_TEMPLATES' && error.templatePaths.length === 2,
  );
});

test('chi tao mot PDF va bo qua cac luot sau neu Done da co PDF', async (t) => {
  const root = await makeWorkspace(t);
  const inputDirectory = path.join(root, 'Input');
  const outputDirectory = path.join(root, 'Done');
  await fs.mkdir(inputDirectory);
  const templatePath = path.join(inputDirectory, 'PDF Download.pdf');
  await createTemplatePdf(templatePath);

  const downloadUrl = 'https://downloads.example.com/customer/order-123456789/design-files.zip?source=etsy';
  const first = await createDownloadPdf({ inputDirectory, outputDirectory, downloadUrl });
  assert.equal(first.created, true);
  assert.equal(first.skipped, false);
  assert.equal(first.outputName, 'PDF Download.pdf');
  assert.equal(first.previousUrl, OLD_URL);
  assert.equal(first.downloadUrl, downloadUrl);
  assert.equal(first.pageNumber, 1);
  assert.equal(first.linkAnnotationsUpdated, 3);
  assert.equal(first.pdfStringsUpdated, 7);
  assert.equal(first.visibleLinkLines.join(''), downloadUrl);
  assert.ok(first.visibleFontSize >= 8);

  const outputBytes = await fs.readFile(first.outputPath);
  assert.equal(outputBytes.toString('latin1').includes(OLD_URL), false);
  const output = await PDFDocument.load(outputBytes, { updateMetadata: false });
  assert.deepEqual(readUriAnnotations(output), [downloadUrl, downloadUrl, downloadUrl]);
  assert.equal(output.getSubject(), downloadUrl);
  assert.equal(output.getPageCount(), 1);
  assert.deepEqual(output.getPage(0).getSize(), { width: 600, height: 800 });

  const second = await createDownloadPdf({
    templatePath,
    outputDirectory,
    downloadUrl,
  });
  assert.equal(second.created, false);
  assert.equal(second.skipped, true);
  assert.equal(second.skipReason, 'PDF_ALREADY_EXISTS');
  assert.equal(second.outputName, 'PDF Download.pdf');
  assert.equal(second.outputPath, first.outputPath);
  assert.deepEqual(await fs.readdir(outputDirectory), ['PDF Download.pdf']);
});

test('bo qua khi Done da co bat ky file PDF nao, khong phan biet hoa thuong', async (t) => {
  const root = await makeWorkspace(t);
  const inputDirectory = path.join(root, 'Input');
  const outputDirectory = path.join(root, 'Done');
  await Promise.all([
    fs.mkdir(inputDirectory),
    fs.mkdir(outputDirectory),
  ]);
  const templatePath = path.join(inputDirectory, 'PDF Download.pdf');
  await createTemplatePdf(templatePath);
  const existingPath = path.join(outputDirectory, 'HUONG-DAN.PdF');
  const existingBytes = Buffer.from('existing-pdf-must-not-change');
  await fs.writeFile(existingPath, existingBytes);

  const result = await createDownloadPdf({
    inputDirectory,
    outputDirectory,
    downloadUrl: 'https://downloads.example.com/customer/new-link',
  });

  assert.equal(result.created, false);
  assert.equal(result.skipped, true);
  assert.equal(result.skipReason, 'PDF_ALREADY_EXISTS');
  assert.equal(result.outputPath, existingPath);
  assert.deepEqual(await fs.readFile(existingPath), existingBytes);
  assert.deepEqual(await fs.readdir(outputDirectory), ['HUONG-DAN.PdF']);
});

test('Done da co PDF thi bo qua truoc khi yeu cau URL hoac PDF mau', async (t) => {
  const root = await makeWorkspace(t);
  const outputDirectory = path.join(root, 'Done');
  await fs.mkdir(outputDirectory);
  const existingPath = path.join(outputDirectory, 'existing.pdf');
  await fs.writeFile(existingPath, '%PDF-1.4\nexisting');

  const result = await createDownloadPdf({
    inputDirectory: path.join(root, 'Input-khong-ton-tai'),
    outputDirectory,
    downloadUrl: '',
  });

  assert.equal(result.created, false);
  assert.equal(result.skipped, true);
  assert.equal(result.skipReason, 'PDF_ALREADY_EXISTS');
  assert.equal(result.outputPath, existingPath);
  assert.deepEqual(await fs.readdir(outputDirectory), ['existing.pdf']);
});

test('thay link hien thi tren moi trang khi cung URL lap lai trong PDF nhieu trang', async (t) => {
  const root = await makeWorkspace(t);
  const templatePath = path.join(root, 'multi-page.pdf');
  const outputDirectory = path.join(root, 'Done');
  await createMultiPageTemplatePdf(templatePath);
  const source = await PDFDocument.load(await fs.readFile(templatePath), { updateMetadata: false });
  const sourceContentCounts = source.getPages().map(countPageContentStreams);
  const downloadUrl = 'https://downloads.example.com/orders/multi-page/files';

  const result = await createDownloadPdf({ templatePath, outputDirectory, downloadUrl });

  assert.equal(result.pagesUpdated, 2);
  assert.deepEqual(result.pageNumbers, [1, 2]);
  assert.deepEqual(
    result.visibleLinkPages.map((entry) => [
      entry.pageNumber,
      entry.visibleLinkLines.join(''),
    ]),
    [
      [1, downloadUrl],
      [2, downloadUrl],
    ],
  );
  assert.equal(result.linkAnnotationsUpdated, 4);

  const output = await PDFDocument.load(await fs.readFile(result.outputPath), { updateMetadata: false });
  assert.deepEqual(readUriAnnotations(output), [downloadUrl, downloadUrl, downloadUrl, downloadUrl]);
  assert.deepEqual(
    output.getPages().map((page, index) => countPageContentStreams(page) > sourceContentCounts[index]),
    [true, true],
  );
});

test('tu choi PDF co nut va link hien thi bi tach sang hai trang', async (t) => {
  const root = await makeWorkspace(t);
  const templatePath = path.join(root, 'split-links.pdf');
  const outputDirectory = path.join(root, 'Done');
  await createMultiPageTemplatePdf(templatePath, { splitAcrossPages: true });

  await assert.rejects(
    () => createDownloadPdf({
      templatePath,
      outputDirectory,
      downloadUrl: 'https://downloads.example.com/orders/split/files',
    }),
    (error) => error.code === 'UNSUPPORTED_PDF_TEMPLATE' && error.pageNumber === 1,
  );
  await assert.rejects(() => fs.stat(outputDirectory), (error) => error.code === 'ENOENT');
});

test('commit PDF tu file tam bang hard-link doc quyen va khong de lai file tam', async (t) => {
  const root = await makeWorkspace(t);
  const templatePath = path.join(root, 'atomic.pdf');
  const outputDirectory = path.join(root, 'Done');
  await createTemplatePdf(templatePath);
  let linkCalls = 0;
  const fsImpl = createFsAdapter({
    link: async (...args) => {
      linkCalls += 1;
      return fs.link(...args);
    },
  });

  const result = await createDownloadPdf({
    templatePath,
    outputDirectory,
    downloadUrl: 'https://downloads.example.com/orders/atomic/files',
    fsImpl,
  });

  assert.equal(linkCalls, 1);
  assert.deepEqual(await fs.readdir(outputDirectory), [path.basename(result.outputPath)]);
});

test('bao loi ro va don file tam neu o dia khong ho tro atomic hard-link', async (t) => {
  const root = await makeWorkspace(t);
  const templatePath = path.join(root, 'unsupported-atomic.pdf');
  const outputDirectory = path.join(root, 'Done');
  await createTemplatePdf(templatePath);
  const fsImpl = createFsAdapter({
    link: async () => {
      const error = new Error('hard-link is not supported');
      error.code = 'EPERM';
      throw error;
    },
  });

  await assert.rejects(
    () => createDownloadPdf({
      templatePath,
      outputDirectory,
      downloadUrl: 'https://downloads.example.com/orders/no-hard-link/files',
      fsImpl,
    }),
    (error) => error.code === 'PDF_ATOMIC_COMMIT_UNSUPPORTED',
  );
  assert.deepEqual(await fs.readdir(outputDirectory), []);
});

test('huy sau khi ghi file tam se don file tam va khong cong bo file final', async (t) => {
  const root = await makeWorkspace(t);
  const templatePath = path.join(root, 'cancelled.pdf');
  const outputDirectory = path.join(root, 'Done');
  await createTemplatePdf(templatePath);
  let cancelled = false;
  let linkCalls = 0;
  const fsImpl = createFsAdapter({
    open: async (filePath, flags, mode) => {
      const handle = await fs.open(filePath, flags, mode);
      if (!path.basename(String(filePath)).startsWith('.pdf-download-')) return handle;
      return {
        writeFile: async (...args) => {
          await handle.writeFile(...args);
          cancelled = true;
        },
        sync: (...args) => handle.sync(...args),
        close: (...args) => handle.close(...args),
      };
    },
    link: async (...args) => {
      linkCalls += 1;
      return fs.link(...args);
    },
  });

  await assert.rejects(
    () => createDownloadPdf({
      templatePath,
      outputDirectory,
      downloadUrl: 'https://downloads.example.com/orders/cancelled/files',
      fsImpl,
      isCancelled: () => cancelled,
    }),
    (error) => error.code === 'CANCELLED',
  );
  assert.equal(linkCalls, 0);
  assert.deepEqual(await fs.readdir(outputDirectory), []);
});

test('huy ngay sau atomic commit se xoa dung file final vua tao', async (t) => {
  const root = await makeWorkspace(t);
  const templatePath = path.join(root, 'cancelled-after-link.pdf');
  const outputDirectory = path.join(root, 'Done');
  await createTemplatePdf(templatePath);
  let cancelled = false;
  const fsImpl = createFsAdapter({
    link: async (...args) => {
      await fs.link(...args);
      cancelled = true;
    },
  });

  await assert.rejects(
    () => createDownloadPdf({
      templatePath,
      outputDirectory,
      downloadUrl: 'https://downloads.example.com/orders/cancelled-after-link/files',
      fsImpl,
      isCancelled: () => cancelled,
    }),
    (error) => error.code === 'CANCELLED',
  );
  assert.deepEqual(await fs.readdir(outputDirectory), []);
});

test('huy trong luc don file tam sau commit van khong tra ve file final', async (t) => {
  const root = await makeWorkspace(t);
  const templatePath = path.join(root, 'cancelled-during-temp-cleanup.pdf');
  const outputDirectory = path.join(root, 'Done');
  await createTemplatePdf(templatePath);
  let cancelled = false;
  const fsImpl = createFsAdapter({
    unlink: async (filePath) => {
      await fs.unlink(filePath);
      if (path.basename(String(filePath)).startsWith('.pdf-download-')) cancelled = true;
    },
  });

  await assert.rejects(
    () => createDownloadPdf({
      templatePath,
      outputDirectory,
      downloadUrl: 'https://downloads.example.com/orders/cancelled-cleanup/files',
      fsImpl,
      isCancelled: () => cancelled,
    }),
    (error) => error.code === 'CANCELLED',
  );
  assert.deepEqual(await fs.readdir(outputDirectory), []);
});

test('giu nguyen file mau khi PDF khong co du annotation can thiet', async (t) => {
  const root = await makeWorkspace(t);
  const templatePath = path.join(root, 'plain.pdf');
  const outputDirectory = path.join(root, 'Done');
  await createTemplatePdf(templatePath, { withLinks: false });
  const original = await fs.readFile(templatePath);

  await assert.rejects(
    () => createDownloadPdf({
      templatePath,
      outputDirectory,
      downloadUrl: 'https://example.com/download',
    }),
    (error) => error.code === 'PDF_TEMPLATE_LINKS_NOT_FOUND',
  );
  assert.deepEqual(await fs.readFile(templatePath), original);
  await assert.rejects(() => fs.stat(outputDirectory), (error) => error.code === 'ENOENT');
});

test('tu choi outputFileName co duong dan de khong ghi ra ngoai thu muc Done', async (t) => {
  const root = await makeWorkspace(t);
  const templatePath = path.join(root, 'template.pdf');
  await createTemplatePdf(templatePath);
  await assert.rejects(
    () => createDownloadPdf({
      templatePath,
      outputDirectory: path.join(root, 'Done'),
      outputFileName: '..\\outside.pdf',
      downloadUrl: 'https://example.com/download',
    }),
    (error) => error.code === 'INVALID_PDF_OUTPUT_NAME',
  );
});

test('PDF mau di kem v1.2.1 thay duoc ca ba link va khong con link Drive rieng', async (t) => {
  const root = await makeWorkspace(t);
  const templatePath = path.resolve(__dirname, '..', 'Input', 'Toystory HLW1.pdf');
  const templateBytes = await fs.readFile(templatePath);
  assert.equal(
    templateBytes.toString('latin1').includes('1A94iVupGsm_SS5V2TY0DwZ4aXcGO_Vmh'),
    false,
  );

  const downloadUrl = 'https://downloads.example.test/orders/QA-1/files';
  const result = await createDownloadPdf({
    templatePath,
    outputDirectory: path.join(root, 'Done'),
    downloadUrl,
  });
  assert.equal(result.previousUrl, 'https://example.com/replace-with-your-download-link');
  assert.equal(result.linkAnnotationsUpdated, 3);
  assert.equal(result.visibleLinkLines.join(''), downloadUrl);

  const output = await PDFDocument.load(await fs.readFile(result.outputPath), {
    updateMetadata: false,
  });
  assert.deepEqual(readUriAnnotations(output), [downloadUrl, downloadUrl, downloadUrl]);
  assert.equal(output.getPageCount(), 1);
  const pageSize = output.getPage(0).getSize();
  assert.ok(Math.abs(pageSize.width - 940.5) < 0.001);
  assert.ok(Math.abs(pageSize.height - 940.5) < 0.001);
});
