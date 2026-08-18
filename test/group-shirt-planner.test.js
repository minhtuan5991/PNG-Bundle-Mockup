'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  GroupShirtPlanError,
  createGroupShirtPlan,
  selectLightGroupShirtSources,
} = require('../src/services/group-shirt-planner');

function source(group, ordinal, color, side) {
  const tags = `${color ? `.${color}` : ''}${side ? `.${side}` : ''}`;
  return path.resolve('D:\\Source', `${group} (${ordinal})${tags}.png`);
}

function region(id, side, centerX, centerY) {
  return {
    id,
    side,
    centerX,
    centerY,
    width: 0.12,
    height: 0.18,
    rotation: 0,
  };
}

const sixRegions = [
  region('f1', 'front', 0.2, 0.3),
  region('b1', 'back', 0.2, 0.7),
  region('f2', 'front', 0.5, 0.3),
  region('b2', 'back', 0.5, 0.7),
  region('f3', 'front', 0.8, 0.3),
  region('b3', 'back', 0.8, 0.7),
];

test('6 mặt trước + 6 mặt sau với 3+3 vùng tạo đúng 2 trang, không lặp trong mỗi variant', async () => {
  const sources = [];
  for (let index = 1; index <= 6; index += 1) {
    sources.push(source('1', index, 'wh', 'f'));
    sources.push(source('1', index, 'wh', 'b'));
  }
  const templates = [
    { path: path.resolve('D:\\Templates A', '1mkg.wh.png'), regions: sixRegions },
    { path: path.resolve('D:\\Templates B', '1mkg.wh.jpg'), regions: sixRegions },
  ];
  const plan = await createGroupShirtPlan({ sources, templates });
  assert.equal(plan.outputs.length, 4);
  assert.equal(plan.groups[0].templateCount, 2);
  for (let variantIndex = 0; variantIndex < 2; variantIndex += 1) {
    const pages = plan.outputs.filter((output) => output.variantIndex === variantIndex);
    assert.equal(pages.length, 2);
    assert.deepEqual(pages.map((page) => page.assignments.length), [6, 6]);
    const assigned = pages.flatMap((page) => page.assignments.map((item) => item.source.path));
    assert.equal(new Set(assigned).size, 12);
    assert.deepEqual(
      pages[0].assignments.map((item) => item.source.ordinal),
      [1, 1, 2, 2, 3, 3],
    );
    assert.deepEqual(
      pages[1].assignments.map((item) => item.source.ordinal),
      [4, 4, 5, 5, 6, 6],
    );
  }
});

test('PNG và template thiếu màu mặc định wh; PNG thiếu mặt chỉ dùng vùng trước', async () => {
  const plan = await createGroupShirtPlan({
    sources: [source('2', 1), source('2', 2)],
    templates: [{
      path: path.resolve('D:\\Templates', '2mkg.png'),
      regions: [
        region('front-1', 'front', 0.3, 0.5),
        region('back-ignored', 'back', 0.7, 0.5),
      ],
    }],
  });
  assert.equal(plan.outputs.length, 2);
  assert.ok(plan.outputs.every((output) => output.color === 'wh'));
  assert.ok(plan.outputs.every((output) => output.assignments.length === 1));
  assert.ok(plan.outputs.every((output) => output.assignments[0].side === 'front'));
});

test('trang cuối partial theo ceil/max và không lặp PNG', async () => {
  const sources = [
    source('3', 1, 'bl', 'f'),
    source('3', 2, 'bl', 'f'),
    source('3', 3, 'bl', 'f'),
    source('3', 4, 'bl', 'f'),
    source('3', 1, 'bl', 'b'),
  ];
  const plan = await createGroupShirtPlan({
    sources,
    templates: [{ path: path.resolve('D:\\Templates', '3mkg.bl.png'), regions: sixRegions }],
  });
  assert.equal(plan.outputs.length, 2);
  assert.deepEqual(plan.outputs.map((output) => output.assignments.length), [4, 1]);
  const assigned = plan.outputs.flatMap((output) =>
    output.assignments.map((assignment) => assignment.source.path));
  assert.equal(new Set(assigned).size, 5);
});

test('exact group/color matching và cho phép template thừa không tạo output', async () => {
  const plan = await createGroupShirtPlan({
    sources: [source('10', 1, 'wh', 'f')],
    templates: [
      { path: path.resolve('D:\\Templates', '10mkg.wh.png'), regions: [sixRegions[0]] },
      { path: path.resolve('D:\\Templates', '1mkg.wh.png'), regions: [sixRegions[0]] },
    ],
  });
  assert.equal(plan.outputs.length, 1);
  assert.equal(plan.outputs[0].template.name, '10mkg.wh.png');
  assert.equal(plan.unusedTemplates.length, 1);
  assert.equal(plan.unusedTemplates[0].name, '1mkg.wh.png');

  await assert.rejects(
    createGroupShirtPlan({
      sources: [source('10', 1, 'bl', 'f')],
      templates: [{ path: path.resolve('D:\\Templates', '10mkg.wh.png'), regions: [sixRegions[0]] }],
    }),
    (error) => error instanceof GroupShirtPlanError &&
      error.code === 'MISSING_MATCHING_GROUP_SHIRT_TEMPLATE',
  );
});

test('báo lỗi thiếu vùng đúng mặt và ordinal logic bị lặp', async () => {
  await assert.rejects(
    createGroupShirtPlan({
      sources: [source('4', 1, 'wh', 'b')],
      templates: [{
        path: path.resolve('D:\\Templates', '4mkg.wh.png'),
        regions: [region('front-only', 'front', 0.5, 0.5)],
      }],
    }),
    (error) => error.code === 'MISSING_GROUP_SHIRT_BACK_REGION',
  );
  await assert.rejects(
    createGroupShirtPlan({
      sources: [
        source('4', 1, 'wh', 'f'),
        path.resolve('D:\\Other', '4 (1).wh.f.png'),
      ],
      templates: [{
        path: path.resolve('D:\\Templates', '4mkg.wh.png'),
        regions: [region('front', 'front', 0.5, 0.5)],
      }],
    }),
    (error) => error.code === 'DUPLICATE_GROUP_SHIRT_ORDINAL',
  );
});

test('regionResolver async được hỗ trợ và thiếu region bị chặn trước khi tạo output', async () => {
  const template = path.resolve('D:\\Templates', '5mkg.wh.png');
  const plan = await createGroupShirtPlan({
    sources: [source('5', 1, 'wh', 'f')],
    templates: [template],
    regionResolver: async () => [region('front', 'front', 0.5, 0.5)],
  });
  assert.equal(plan.outputs.length, 1);

  await assert.rejects(
    createGroupShirtPlan({
      sources: [source('5', 1, 'wh', 'f')],
      templates: [template],
      regionResolver: async () => null,
    }),
    (error) => error.code === 'MISSING_GROUP_SHIRT_TEMPLATE_REGIONS',
  );
});

test('lọc PNG áo sáng gồm cả tag wh và mặc định, loại toàn bộ bl', () => {
  const selected = selectLightGroupShirtSources([
    source('6', 1),
    source('6', 2, 'wh', 'b'),
    source('6', 3, 'bl', 'f'),
  ]);
  assert.deepEqual(selected.map((item) => item.ordinal), [1, 2]);
  assert.ok(selected.every((item) => item.color === 'wh'));
});
