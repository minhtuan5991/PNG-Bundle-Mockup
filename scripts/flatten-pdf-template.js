'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFString,
} = require('pdf-lib');

function usage() {
  throw new Error(
    'Usage: node scripts/flatten-pdf-template.js <source.pdf> <rendered-page.png> <output.pdf>',
  );
}

function readRectangle(annotation) {
  const rectangle = annotation.lookup(PDFName.of('Rect'));
  if (!(rectangle instanceof PDFArray) || rectangle.size() !== 4) return null;
  const values = [];
  for (let index = 0; index < 4; index += 1) {
    const value = rectangle.lookup(index);
    if (!(value instanceof PDFNumber)) return null;
    values.push(value.asNumber());
  }
  return values;
}

function collectLinkRectangles(page) {
  const annotations = page.node.Annots();
  if (!(annotations instanceof PDFArray)) return [];
  const rectangles = [];
  for (let index = 0; index < annotations.size(); index += 1) {
    const annotation = annotations.lookup(index, PDFDict);
    const action = annotation?.lookup(PDFName.of('A'), PDFDict);
    const subtype = annotation?.lookup(PDFName.of('Subtype'));
    const uri = action?.lookup(PDFName.of('URI'));
    if (
      subtype?.toString() !== '/Link' ||
      !uri ||
      typeof uri.decodeText !== 'function'
    ) continue;
    const rectangle = readRectangle(annotation);
    if (rectangle) rectangles.push(rectangle);
  }
  return rectangles;
}

function addLinkAnnotation(document, page, rectangle, downloadUrl) {
  const annotation = document.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: rectangle,
    Border: [0, 0, 0],
    A: {
      S: 'URI',
      URI: PDFString.of(downloadUrl),
    },
    Contents: PDFString.of(downloadUrl),
  });
  page.node.addAnnot(document.context.register(annotation));
}

async function main() {
  const [sourcePath, renderedPagePath, outputPath] = process.argv.slice(2);
  if (!sourcePath || !renderedPagePath || !outputPath) usage();
  if (path.extname(outputPath).toLowerCase() !== '.pdf') usage();

  const sourceDocument = await PDFDocument.load(await fs.readFile(sourcePath), {
    updateMetadata: false,
  });
  if (sourceDocument.getPageCount() !== 1) {
    throw new Error('The bundled PDF template must contain exactly one page.');
  }
  const sourcePage = sourceDocument.getPage(0);
  const linkRectangles = collectLinkRectangles(sourcePage);
  if (linkRectangles.length < 2) {
    throw new Error('The PDF template must contain a Download button and a visible link.');
  }

  const downloadUrl = 'https://example.com/replace-with-your-download-link';
  const { width, height } = sourcePage.getSize();
  const document = await PDFDocument.create();
  const page = document.addPage([width, height]);
  const image = await document.embedPng(await fs.readFile(renderedPagePath));
  page.drawImage(image, { x: 0, y: 0, width, height });
  for (const rectangle of linkRectangles) {
    addLinkAnnotation(document, page, rectangle, downloadUrl);
  }

  const releaseDate = new Date('2026-08-06T00:00:00.000Z');
  document.setTitle('PNG Download');
  document.setAuthor('PNG Bundle Mockup');
  document.setCreator('PNG Bundle Mockup template sanitizer');
  document.setProducer('pdf-lib');
  document.setCreationDate(releaseDate);
  document.setModificationDate(releaseDate);

  await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await fs.writeFile(outputPath, await document.save({ useObjectStreams: false }));
  console.log(path.resolve(outputPath));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
