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

function region(id, side = 'front', color = 'wh', centerX = 0.5, centerY = 0.5) {
  return {
    id,
    side,
    color,
    centerX,
    centerY,
    width: 0.084,
    height: 0.12,
    rotation: 0,
  };
}

function template(name, regions) {
  return {
    path: path.resolve('D:\\Templates', name),
    width: 1000,
    height: 800,
    regions,
  };
}

function regionsForTrack(prefix, count, side = 'front', color = 'wh', y = 0.5) {
  return Array.from({ length: count }, (_, index) =>
    region(`${prefix}-${index + 1}`, side, color, (index + 1) / (count + 1), y));
}

test('nhóm không tag chỉ dùng vùng trước áo sáng và lặp ngẫu nhiên khi thiếu', async () => {
  const regions = regionsForTrack('wh-f', 6);
  const plan = await createGroupShirtPlan({
    sources: [source('1', 1), source('1', 2)],
    templates: [template('1 mgs.png', regions)],
    random: () => 0,
  });
  assert.equal(plan.groups[0].profile, 'plain');
  assert.equal(plan.outputs.length, 1);
  assert.deepEqual(
    plan.outputs[0].assignments.map((item) => item.source.ordinal),
    [1, 2, 1, 1, 1, 1],
  );
  assert.deepEqual(
    plan.outputs[0].assignments.map((item) => item.repeated),
    [false, false, true, true, true, true],
  );
  assert.ok(plan.outputs[0].assignments.every((item) =>
    item.color === 'wh' && item.side === 'front'));
});

test('số cạnh marker mgs không khóa template vào nhóm PNG', async () => {
  const plan = await createGroupShirtPlan({
    sources: [source('1', 1, 'wh')],
    templates: [template('.mgs2.jpg', regionsForTrack('wh-f', 2))],
    random: () => 0,
  });
  assert.equal(plan.groups[0].groupKey, '1');
  assert.equal(plan.outputs.length, 1);
  assert.equal(plan.outputs[0].groupKey, '1');
  assert.equal(plan.outputs[0].template.groupKey, '2');
  assert.equal(plan.outputs[0].assignments.length, 2);
});

test('ảnh thừa tạo trang mới và mỗi trang còn thiếu được lấp từ đúng track', async () => {
  const sources = Array.from({ length: 8 }, (_, index) => source('2', index + 1));
  const plan = await createGroupShirtPlan({
    sources,
    templates: [template('2 mgs.png', regionsForTrack('wh-f', 6))],
    random: () => 0.99,
  });
  assert.equal(plan.outputs.length, 2);
  assert.deepEqual(
    plan.outputs[0].assignments.map((item) => item.source.ordinal),
    [1, 2, 3, 4, 5, 6],
  );
  assert.deepEqual(
    plan.outputs[1].assignments.map((item) => item.source.ordinal),
    [7, 8, 8, 8, 8, 8],
  );
  const consumed = new Set(plan.outputs.flatMap((output) =>
    output.assignments.filter((item) => !item.repeated).map((item) => item.source.ordinal)));
  assert.deepEqual([...consumed].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test('nhóm chỉ có .f/.b dùng nền áo sáng có đủ trước và sau', async () => {
  const regions = [
    ...regionsForTrack('wh-f', 3, 'front', 'wh', 0.3),
    ...regionsForTrack('wh-b', 3, 'back', 'wh', 0.7),
  ];
  const plan = await createGroupShirtPlan({
    sources: [
      source('3', 1, null, 'f'),
      source('3', 2, null, 'f'),
      source('3', 1, null, 'b'),
    ],
    templates: [
      template('3 mgs.png', regions),
      template('3 mgs front-only.png', regionsForTrack('front', 6)),
    ],
    random: () => 0,
  });
  assert.equal(plan.groups[0].profile, 'side-only');
  assert.equal(plan.outputs.length, 1);
  assert.equal(plan.outputs[0].assignments.length, 6);
  assert.ok(plan.outputs[0].assignments.every((item) => item.color === 'wh'));
  assert.equal(plan.unusedTemplates.length, 1);
  assert.ok(plan.warnings.some((warning) => warning.code === 'INCOMPATIBLE_GROUP_SHIRT_TEMPLATE'));
});

test('nhóm chỉ có .wh/.bl chỉ dùng nền không có vùng mặt sau', async () => {
  const frontByColor = [
    ...regionsForTrack('wh-f', 3, 'front', 'wh', 0.35),
    ...regionsForTrack('bl-f', 3, 'front', 'bl', 0.65),
  ];
  const plan = await createGroupShirtPlan({
    sources: [
      source('4', 1, 'wh'), source('4', 2, 'wh'),
      source('4', 1, 'bl'),
    ],
    templates: [template('4 mgs.png', frontByColor)],
    random: () => 0,
  });
  assert.equal(plan.groups[0].profile, 'color-only');
  assert.equal(plan.outputs.length, 1);
  for (const assignment of plan.outputs[0].assignments) {
    assert.equal(assignment.source.color, assignment.region.color);
    assert.equal(assignment.side, 'front');
  }

  await assert.rejects(
    createGroupShirtPlan({
      sources: [source('4', 1, 'wh'), source('4', 1, 'bl')],
      templates: [template('4 mgs back.png', [
        region('wh-f', 'front', 'wh', 0.3),
        region('bl-f', 'front', 'bl', 0.5),
        region('wh-b', 'back', 'wh', 0.7),
      ])],
    }),
    (error) => error.code === 'NO_COMPATIBLE_GROUP_SHIRT_TEMPLATE',
  );
});

test('nhóm đủ tag màu/mặt ghép đúng cả bốn track trên nền có trước và sau', async () => {
  const regions = [
    ...regionsForTrack('wh-f', 2, 'front', 'wh', 0.2),
    ...regionsForTrack('wh-b', 2, 'back', 'wh', 0.4),
    ...regionsForTrack('bl-f', 2, 'front', 'bl', 0.6),
    ...regionsForTrack('bl-b', 2, 'back', 'bl', 0.8),
  ];
  const sources = [];
  for (const color of ['wh', 'bl']) {
    for (const side of ['f', 'b']) {
      sources.push(source('5', 1, color, side));
      sources.push(source('5', 2, color, side));
      sources.push(source('5', 3, color, side));
    }
  }
  const plan = await createGroupShirtPlan({
    sources,
    templates: [template('5 mgs.png', regions)],
    random: () => 0,
  });
  assert.equal(plan.groups[0].profile, 'color-side');
  assert.equal(plan.outputs.length, 2);
  assert.ok(plan.outputs.every((output) => output.assignments.length === 8));
  for (const output of plan.outputs) {
    for (const assignment of output.assignments) {
      assert.equal(assignment.source.color, assignment.region.color);
      assert.equal(assignment.source.side === 'b' ? 'back' : 'front', assignment.region.side);
    }
  }
});

test('mọi template mgs tương thích được dùng chung cho mọi nhóm PNG', async () => {
  const regions = regionsForTrack('wh-f', 2);
  const plan = await createGroupShirtPlan({
    sources: [source('1', 1), source('a', 1)],
    templates: [
      template('.mgs2.png', regions),
      template('.mgs3.png', regions),
    ],
    random: () => 0,
  });

  assert.equal(plan.outputs.length, 4);
  assert.deepEqual(plan.groups.map((group) => group.templateCount), [2, 2]);
  assert.equal(plan.unusedTemplates.length, 0);
  assert.deepEqual(
    [...new Set(plan.outputs.map((output) => output.template.name))],
    ['.mgs2.png', '.mgs3.png'],
  );
  for (const output of plan.outputs) {
    assert.ok(output.assignments.every((item) => item.source.groupKey === output.groupKey));
  }
});

test('chỉ vùng in quyết định template phù hợp và template dùng bởi nhóm khác không bị coi là thừa', async () => {
  const frontOnly = regionsForTrack('front', 2);
  const frontBack = [
    ...regionsForTrack('front', 1),
    ...regionsForTrack('back', 1, 'back'),
  ];
  const plan = await createGroupShirtPlan({
    sources: [
      source('1', 1),
      source('2', 1, null, 'f'),
      source('2', 1, null, 'b'),
    ],
    templates: [
      template('.mgs1.png', frontOnly),
      template('.mgs3.png', frontBack),
    ],
    random: () => 0,
  });

  assert.equal(plan.outputs.length, 2);
  assert.equal(plan.unusedTemplates.length, 0);
  assert.equal(plan.outputs.find((output) => output.groupKey === '1').template.name, '.mgs1.png');
  assert.equal(plan.outputs.find((output) => output.groupKey === '2').template.name, '.mgs3.png');
  assert.ok(plan.warnings.some((warning) =>
    warning.code === 'INCOMPATIBLE_GROUP_SHIRT_TEMPLATE'));

  await assert.rejects(
    createGroupShirtPlan({
      sources: [source('11', 1)],
      templates: [template('.mgs9.png', [region('dark', 'front', 'bl')])],
    }),
    (error) => error instanceof GroupShirtPlanError &&
      error.code === 'NO_COMPATIBLE_GROUP_SHIRT_TEMPLATE',
  );
});

test('regionResolver async, ordinal logic trùng và random sai đều bị chặn', async () => {
  const templatePath = path.resolve('D:\\Templates', '6 mgs.png');
  const plan = await createGroupShirtPlan({
    sources: [source('6', 1)],
    templates: [templatePath],
    regionResolver: async () => regionsForTrack('wh-f', 2),
    random: () => 0,
  });
  assert.equal(plan.outputs.length, 1);

  await assert.rejects(
    createGroupShirtPlan({
      sources: [source('6', 1), path.resolve('D:\\Other', '6 (1).png')],
      templates: [template('6 mgs.png', regionsForTrack('wh-f', 2))],
    }),
    (error) => error.code === 'DUPLICATE_GROUP_SHIRT_ORDINAL',
  );
  await assert.rejects(
    createGroupShirtPlan({
      sources: [source('6', 1)],
      templates: [template('6 mgs.png', regionsForTrack('wh-f', 2))],
      random: () => 1,
    }),
    (error) => error.code === 'INVALID_GROUP_SHIRT_RANDOM_VALUE',
  );
});

test('lọc mockup đơn Group Shirt lấy .wh hoặc mặc định và loại .bl', () => {
  const selected = selectLightGroupShirtSources([
    source('7', 1),
    source('7', 2, 'wh', 'b'),
    source('7', 3, 'bl', 'f'),
  ]);
  assert.deepEqual(selected.map((item) => item.ordinal), [1, 2]);
  assert.ok(selected.every((item) => item.color === 'wh'));
});
