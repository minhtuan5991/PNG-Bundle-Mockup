'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { createGroupShirtPlan } = require('../src/services/group-shirt-planner');
const { generateGroupShirtMockups } = require('../src/services/group-shirt-service');

function printRegion(id, side, color, slot = 0) {
  return {
    id, side, color,
    centerX: [0.2, 0.5, 0.8][slot % 3],
    centerY: slot < 3 ? 0.3 : 0.7,
    width: 42 / 200,
    height: 48 / 200,
    rotation: 0,
  };
}

function template(directory, name, regions) {
  return { path: path.join(directory, name), width: 200, height: 200, regions };
}

function patchFixture(directory = path.resolve('test-fixtures-group-shirt-patch')) {
  const frontNames = Array.from({ length: 6 }, (_, index) => `3 (${index + 2}).f.png`);
  const sources = ['3 (1).wh.b.png', ...frontNames, '3 (8).bl.b.png']
    .map((name) => path.join(directory, 'Source', name));
  const templateDirectory = path.join(directory, 'Templates');
  const templates = [
    template(templateDirectory, 'mgs5.png', [
      ...Array.from({ length: 3 }, (_, index) => printRegion(`dark-front-${index}`, 'front', 'bl', index)),
      ...Array.from({ length: 3 }, (_, index) => printRegion(`dark-back-${index}`, 'back', 'bl', index + 3)),
    ]),
    template(templateDirectory, 'mgs7.png', Array.from({ length: 6 }, (_, index) =>
      printRegion(`mixed-front-${index}`, 'front', index === 5 ? 'bl' : 'wh', index))),
    // The white back source must still have coverage: mgs5/mgs7 alone cannot use it.
    template(templateDirectory, 'mgs-wh-back.png', [printRegion('light-back', 'back', 'wh', 1)]),
  ];
  return { directory, sources, frontNames, templates };
}

function assignmentsFor(outputs, side) {
  return outputs.flatMap((output) => output.assignments)
    .filter((assignment) => !side || assignment.region.side === side);
}

function assignedNames(assignments) {
  return assignments.map((assignment) => assignment.source.name).sort();
}

function assertMatchingAssignments(outputs) {
  for (const output of outputs) {
    for (const assignment of output.assignments) {
      assert.equal(assignment.source.groupKey, output.groupKey, 'Không lấy PNG từ nhóm khác');
      assert.equal(assignment.source.side === 'b' ? 'back' : 'front', assignment.region.side);
      if (assignment.source.explicitColor) {
        assert.equal(assignment.source.color, assignment.region.color, 'PNG có màu phải giữ đúng màu');
      }
    }
  }
}

test('bản vá: nhóm 3 dùng đủ sáu PNG .f trên mgs5 và mgs7 dù có nguồn back gắn màu', async () => {
  const fixture = patchFixture();
  const inputBefore = JSON.stringify({ sources: fixture.sources, templates: fixture.templates });
  const plan = await createGroupShirtPlan({ ...fixture, random: () => 0 });
  const darkPages = plan.outputs.filter((output) => output.template.name === 'mgs5.png');
  const mixedPages = plan.outputs.filter((output) => output.template.name === 'mgs7.png');

  assert.equal(darkPages.length, 2, 'Ba vùng dark-front cần hai trang để dùng hết sáu PNG .f');
  assert.equal(mixedPages.length, 1, 'Sáu vùng trước sáng/tối dùng chung pool sáu PNG .f');
  for (const pages of [darkPages, mixedPages]) {
    const fronts = assignmentsFor(pages, 'front');
    assert.deepEqual(assignedNames(fronts), [...fixture.frontNames].sort());
    assert.ok(fronts.every((assignment) => !assignment.repeated && !assignment.source.explicitColor));
  }
  assert.ok(darkPages.every((output) => output.assignments.length === 6));
  assert.ok(assignmentsFor(darkPages, 'back').every((assignment) => assignment.source.name === '3 (8).bl.b.png'));
  assert.ok(assignmentsFor(mixedPages).some((assignment) => assignment.region.color === 'bl'));
  assert.deepEqual(
    [...new Set(assignedNames(assignmentsFor(plan.outputs)))].sort(),
    fixture.sources.map((source) => path.basename(source)).sort(),
  );
  assertMatchingAssignments(plan.outputs);
  assert.equal(JSON.stringify({ sources: fixture.sources, templates: fixture.templates }), inputBefore);
});

test('bản vá: PNG .b không gắn màu dùng cả hai màu và không thay nguồn front có màu', async () => {
  const directory = path.resolve('test-fixtures-group-shirt-patch-back');
  const plan = await createGroupShirtPlan({
    sources: ['Back (1).wh.f.png', 'Back (2).bl.f.png', 'Back (3).b.png']
      .map((name) => path.join(directory, name)),
    templates: [template(directory, 'mgs-back.png', [
      printRegion('light-front', 'front', 'wh', 0),
      printRegion('dark-front', 'front', 'bl', 2),
      printRegion('light-back', 'back', 'wh', 3),
      printRegion('dark-back', 'back', 'bl', 5),
    ])],
    random: () => 0,
  });

  assert.equal(plan.outputCount, 1);
  const backs = assignmentsFor(plan.outputs, 'back');
  assert.deepEqual(backs.map((assignment) => assignment.region.color).sort(), ['bl', 'wh']);
  assert.deepEqual(assignedNames(backs), ['Back (3).b.png', 'Back (3).b.png']);
  assert.deepEqual(assignedNames(assignmentsFor(plan.outputs, 'front')), ['Back (1).wh.f.png', 'Back (2).bl.f.png']);
  assertMatchingAssignments(plan.outputs);
});

test('bản vá: nguồn không tag trong nhóm chỉ màu dùng chung chỗ trống và giữ nguồn màu explicit', async () => {
  const directory = path.resolve('test-fixtures-group-shirt-patch-color');
  const sourceNames = ['Color (1).wh.png', 'Color (2).bl.png', 'Color (3).png', 'Color (4).png'];
  const plan = await createGroupShirtPlan({
    sources: sourceNames.map((name) => path.join(directory, name)),
    templates: [template(directory, 'mgs-colors.png', [
      printRegion('light-1', 'front', 'wh', 0),
      printRegion('light-2', 'front', 'wh', 1),
      printRegion('dark-1', 'front', 'bl', 3),
      printRegion('dark-2', 'front', 'bl', 4),
    ])],
    random: () => 0,
  });

  assert.equal(plan.outputCount, 1);
  assert.deepEqual(assignedNames(assignmentsFor(plan.outputs)), [...sourceNames].sort());
  assert.ok(assignmentsFor(plan.outputs).every((assignment) => !assignment.repeated));
  assertMatchingAssignments(plan.outputs);
});

test('bản vá: giữ chỗ nguồn màu explicit trước wildcard bất kể thứ tự hai vùng sáng/tối', async () => {
  const directory = path.resolve('test-fixtures-group-shirt-patch-overlap');
  for (const sideTag of ['', '.f']) {
    const sourceNames = [`Overlap (1)${sideTag}.png`, `Overlap (2).wh${sideTag}.png`];
    for (const colors of [['wh', 'bl'], ['bl', 'wh']]) {
      const plan = await createGroupShirtPlan({
        sources: sourceNames.map((name) => path.join(directory, name)),
        templates: [template(directory, 'mgs-overlap.png', colors.map((color, index) =>
          printRegion(`front-${index}`, 'front', color, index)))],
        random: () => 0,
      });

      assert.equal(plan.outputCount, 1);
      const assignments = assignmentsFor(plan.outputs);
      assert.deepEqual(assignments.map((assignment) => assignment.region.color), colors);
      assert.deepEqual(assignedNames(assignments), [...sourceNames].sort());
      assert.ok(assignments.every((assignment) => !assignment.repeated));
      assertMatchingAssignments(plan.outputs);
    }
  }
});

test('bản vá: bảy wildcard và một PNG trắng dùng đủ tám nguồn trong bốn trang hai vùng', async () => {
  const directory = path.resolve('test-fixtures-group-shirt-patch-wildcard-pages');
  for (const sideTag of ['', '.f']) {
    const sourceNames = [
      ...Array.from({ length: 7 }, (_, index) => `Pages (${index + 1})${sideTag}.png`),
      `Pages (8).wh${sideTag}.png`,
    ];
    const plan = await createGroupShirtPlan({
      sources: sourceNames.map((name) => path.join(directory, name)),
      templates: [template(directory, 'mgs-pages.png', [
        printRegion('light-front', 'front', 'wh', 0),
        printRegion('dark-front', 'front', 'bl', 2),
      ])],
      random: () => 0,
    });

    assert.equal(plan.outputCount, 4);
    assert.ok(plan.outputs.every((output) => output.assignments.length === 2));
    const assignments = assignmentsFor(plan.outputs);
    assert.deepEqual(assignedNames(assignments), [...sourceNames].sort());
    assert.ok(assignments.every((assignment) => !assignment.repeated));
    assertMatchingAssignments(plan.outputs);
  }
});

test('bản vá: wildcard được cover bằng một màu, không bắt buộc có cả áo trắng và đen', async () => {
  const directory = path.resolve('test-fixtures-group-shirt-patch-coverage');
  for (const frontColor of ['wh', 'bl']) {
    const plan = await createGroupShirtPlan({
      sources: ['Coverage (1).f.png', 'Coverage (2).wh.b.png']
        .map((name) => path.join(directory, name)),
      templates: [template(directory, 'mgs-coverage.png', [
        printRegion('front', 'front', frontColor, 0),
        printRegion('back', 'back', 'wh', 3),
      ])],
      random: () => 0,
    });

    assert.equal(plan.outputCount, 1);
    assert.deepEqual(assignedNames(assignmentsFor(plan.outputs)), ['Coverage (1).f.png', 'Coverage (2).wh.b.png']);
    assertMatchingAssignments(plan.outputs);
  }
});

test('bản vá: nhóm chỉ có .b vẫn dùng nền mixed và chỉ ghép vào các vùng back', async () => {
  const directory = path.resolve('test-fixtures-group-shirt-patch-back-only');
  const plan = await createGroupShirtPlan({
    sources: [path.join(directory, 'BackOnly (1).b.png')],
    templates: [template(directory, 'mgs-back-only.png', [
      printRegion('light-front', 'front', 'wh', 0),
      printRegion('dark-front', 'front', 'bl', 2),
      printRegion('light-back', 'back', 'wh', 3),
      printRegion('dark-back', 'back', 'bl', 5),
    ])],
    random: () => 0,
  });

  assert.equal(plan.outputCount, 1);
  const assignments = assignmentsFor(plan.outputs);
  assert.equal(assignments.length, 2);
  assert.ok(assignments.every((assignment) => assignment.region.side === 'back'));
  assert.deepEqual(assignments.map((assignment) => assignment.region.color).sort(), ['bl', 'wh']);
  assertMatchingAssignments(plan.outputs);
});

test('bản vá: nhóm không có PNG back bỏ toàn bộ nền có back, không lọc nền của nhóm khác', async () => {
  const fixture = patchFixture();
  const frontOnlyGroups = [['1', ''], ['2', '.f'], ['4', '.wh.f']];
  const sources = [...fixture.sources];
  for (const [group, tags] of frontOnlyGroups) {
    sources.push(...Array.from({ length: 6 }, (_, index) =>
      path.join(fixture.directory, 'Source', `${group} (${index + 1})${tags}.png`)));
  }
  const plan = await createGroupShirtPlan({ sources, templates: fixture.templates, random: () => 0 });

  for (const [group] of frontOnlyGroups) {
    const outputs = plan.outputs.filter((output) => output.groupKey === group);
    assert.ok(outputs.length > 0);
    assert.deepEqual([...new Set(outputs.map((output) => output.template.name))], ['mgs7.png']);
    assert.ok(outputs.every((output) => output.template.regions.every((region) => region.side === 'front')));
    assert.deepEqual(
      [...new Set(assignmentsFor(outputs).map((assignment) => assignment.source.ordinal))].sort(),
      [1, 2, 3, 4, 5, 6],
    );
  }
  assert.ok(plan.outputs.some((output) => output.groupKey === '3' && output.template.name === 'mgs5.png'));
  assert.ok(plan.outputs.some((output) => output.groupKey === '3' && output.template.name === 'mgs-wh-back.png'));
  assertMatchingAssignments(plan.outputs);
});

async function syntheticPng(filePath, width, height, color) {
  await sharp({ create: { width, height, channels: 4, background: color } }).png().toFile(filePath);
}

async function rgbaAt(filePath, x, y) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const offset = (y * info.width + x) * info.channels;
  return [...data.subarray(offset, offset + 4)];
}

test('bản vá: ảnh xuất có PNG tại dark-front và giữ nguyên nguồn, nền, ảnh Done đã có', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'group-shirt-patch-'));
  t.after(async () => {
    sharp.cache(false);
    await fs.rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  const fixture = patchFixture(directory);
  const sourceDirectory = path.join(directory, 'Source');
  const templateDirectory = path.join(directory, 'Templates');
  const outputDirectory = path.join(directory, 'Done');
  await Promise.all([sourceDirectory, templateDirectory, outputDirectory].map((item) => fs.mkdir(item)));
  const frontColor = { r: 30, g: 160, b: 60, alpha: 1 };
  await Promise.all(fixture.sources.map((source) => syntheticPng(
    source, 42, 48,
    source.endsWith('.f.png') ? frontColor : { r: 35, g: 60, b: 220, alpha: 1 },
  )));
  await Promise.all(fixture.templates.map((item) => syntheticPng(
    item.path, item.width, item.height, { r: 245, g: 245, b: 245, alpha: 1 },
  )));
  const existingOutput = path.join(outputDirectory, '[3]_mgs5_001.png');
  await syntheticPng(existingOutput, 12, 12, { r: 220, g: 30, b: 40, alpha: 1 });
  const protectedPaths = [...fixture.sources, ...fixture.templates.map((item) => item.path), existingOutput];
  const originalBytes = await Promise.all(protectedPaths.map((filePath) => fs.readFile(filePath)));
  const originalSourceNames = (await fs.readdir(sourceDirectory)).sort();
  const originalTemplateNames = (await fs.readdir(templateDirectory)).sort();

  const plan = await createGroupShirtPlan({ ...fixture, random: () => 0 });
  const result = await generateGroupShirtMockups({ plan, outputDirectory });

  for (const name of ['mgs5.png', 'mgs7.png']) {
    const planned = plan.outputs.find((output) => output.template.name === name);
    const darkFront = planned.template.regions.find((region) => region.side === 'front' && region.color === 'bl');
    const rendered = result.outputs.find((output) => output.template.name === name);
    assert.ok(rendered);
    assert.deepEqual(
      await rgbaAt(rendered.path, Math.round(darkFront.centerX * 200), Math.round(darkFront.centerY * 200)),
      [30, 160, 60, 255],
      `${name}: vùng áo tối mặt trước phải có pixel của PNG .f không gắn màu`,
    );
  }
  assert.equal(result.outputCount, plan.outputCount);
  assert.ok(!result.outputPaths.includes(existingOutput));
  for (let index = 0; index < protectedPaths.length; index += 1) {
    assert.deepEqual(await fs.readFile(protectedPaths[index]), originalBytes[index]);
  }
  assert.deepEqual((await fs.readdir(sourceDirectory)).sort(), originalSourceNames);
  assert.deepEqual((await fs.readdir(templateDirectory)).sort(), originalTemplateNames);
  assert.deepEqual(
    (await fs.readdir(outputDirectory)).sort(),
    [path.basename(existingOutput), ...result.outputPaths.map((filePath) => path.basename(filePath))].sort(),
  );
});
