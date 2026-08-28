'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createGroupShirtPlan } = require('../src/services/group-shirt-planner');

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

function regions(prefix, count, side = 'front', color = 'wh', y = 0.5) {
  return Array.from({ length: count }, (_, index) =>
    region(`${prefix}-${index + 1}`, side, color, (index + 1) / (count + 1), y));
}

function template(name, printRegions) {
  return {
    path: path.resolve('D:\\Templates', name),
    width: 1000,
    height: 800,
    regions: printRegions,
  };
}

function templateNames(plan) {
  return [...new Set(plan.outputs.map((output) => output.template.name))];
}

test('quy tắc 1: PNG không tag chỉ dùng vùng trước trên áo sáng/tối, bỏ qua vùng sau', async () => {
  const plan = await createGroupShirtPlan({
    sources: [source('plain', 1), source('plain', 2)],
    templates: [
      template('light mgs.png', regions('wh-f', 2, 'front', 'wh')),
      template('dark mgs.png', regions('bl-f', 2, 'front', 'bl')),
      template('mixed mgs.png', [
        region('mixed-wh', 'front', 'wh', 0.3),
        region('mixed-bl', 'front', 'bl', 0.7),
      ]),
      template('back mgs.png', [
        region('front', 'front', 'wh', 0.3),
        region('back', 'back', 'wh', 0.7),
      ]),
      template('back only mgs.png', [
        region('back-wh', 'back', 'wh', 0.3),
        region('back-bl', 'back', 'bl', 0.7),
      ]),
      template('all sides mgs.png', [
        region('all-wh-f', 'front', 'wh', 0.3, 0.3),
        region('all-wh-b', 'back', 'wh', 0.3, 0.7),
        region('all-bl-f', 'front', 'bl', 0.7, 0.3),
        region('all-bl-b', 'back', 'bl', 0.7, 0.7),
      ]),
    ],
    random: () => 0,
  });

  assert.equal(plan.groups[0].profile, 'plain');
  assert.deepEqual(templateNames(plan), [
    'all sides mgs.png', 'back mgs.png',
    'dark mgs.png', 'light mgs.png', 'mixed mgs.png',
  ]);
  assert.equal(plan.outputCount, 6);
  for (const output of plan.outputs) {
    assert.deepEqual(
      output.assignments.map((item) => item.region.id),
      output.template.regions.filter((item) => item.side === 'front').map((item) => item.id),
    );
    assert.ok(output.assignments.every((item) => item.source.groupKey === 'plain'));
  }
  const mixed = plan.outputs.find((output) => output.template.name === 'mixed mgs.png');
  assert.deepEqual(mixed.assignments.map((assignment) => assignment.source.ordinal), [1, 2]);
  const allSides = plan.outputs.find((output) => output.template.name === 'all sides mgs.png');
  assert.deepEqual(allSides.assignments.map((item) => item.source.ordinal), [1, 2]);
  assert.deepEqual(allSides.assignments.map((item) => item.repeated), [false, false]);
  assert.deepEqual(plan.warnings.map((item) => item.template.name), ['back only mgs.png']);
  assert.deepEqual(plan.unusedTemplates.map((item) => item.name), ['back only mgs.png']);
});

test('PNG không tag chỉ tính vùng trước khi chia trang và không bỏ sót nguồn', async () => {
  const plan = await createGroupShirtPlan({
    sources: Array.from({ length: 7 }, (_, index) => source('plain pages', index + 1)),
    templates: [template('all sides mgs.png', [
      region('wh-f', 'front', 'wh', 0.3, 0.3),
      region('bl-f', 'front', 'bl', 0.7, 0.3),
      region('wh-b', 'back', 'wh', 0.3, 0.7),
      region('bl-b', 'back', 'bl', 0.7, 0.7),
    ])],
    random: () => 0.99,
  });

  assert.equal(plan.outputCount, 4);
  assert.deepEqual(plan.outputs.map((output) =>
    output.assignments.map((item) => item.source.ordinal)), [[1, 2], [3, 4], [5, 6], [7, 7]]);
  assert.ok(plan.outputs.flatMap((output) => output.assignments)
    .every((item) => item.side === 'front'));
  const consumed = plan.outputs.flatMap((output) =>
    output.assignments.filter((item) => !item.repeated).map((item) => item.source.ordinal));
  assert.deepEqual(consumed, [1, 2, 3, 4, 5, 6, 7]);
});

test('quy tắc 2 và 5: chỉ tag mặt dùng nền sáng/tối, một ảnh sau được lặp đúng side', async () => {
  const frontSources = Array.from({ length: 6 }, (_, index) => source('side', index + 1, null, 'f'));
  const plan = await createGroupShirtPlan({
    sources: [...frontSources, source('side', 1, null, 'b')],
    templates: [
      template('light sides mgs.png', [
        ...regions('wh-f', 3, 'front', 'wh', 0.3),
        ...regions('wh-b', 3, 'back', 'wh', 0.7),
      ]),
      template('dark sides mgs.png', [
        ...regions('bl-f', 3, 'front', 'bl', 0.3),
        ...regions('bl-b', 3, 'back', 'bl', 0.7),
      ]),
      template('mixed sides mgs.png', [
        region('mf-1', 'front', 'wh', 0.2, 0.3),
        region('mf-2', 'front', 'bl', 0.5, 0.3),
        region('mf-3', 'front', 'wh', 0.8, 0.3),
        region('mb-1', 'back', 'bl', 0.2, 0.7),
        region('mb-2', 'back', 'wh', 0.5, 0.7),
        region('mb-3', 'back', 'bl', 0.8, 0.7),
      ]),
      template('front only mgs.png', regions('front-only', 3, 'front', 'wh')),
    ],
    random: () => 0.75,
  });

  assert.equal(plan.groups[0].profile, 'side-only');
  assert.deepEqual(
    templateNames(plan),
    ['dark sides mgs.png', 'light sides mgs.png', 'mixed sides mgs.png'],
  );
  assert.equal(plan.outputs.length, 6);
  for (const assignment of plan.outputs.flatMap((output) => output.assignments)) {
    const sourceSide = assignment.source.side === 'b' ? 'back' : 'front';
    assert.equal(sourceSide, assignment.region.side);
    if (assignment.region.side === 'back') assert.equal(assignment.source.ordinal, 1);
  }
  const backAssignments = plan.outputs.flatMap((output) => output.assignments)
    .filter((assignment) => assignment.region.side === 'back');
  assert.equal(backAssignments.length, 18);
  assert.equal(backAssignments.filter((assignment) => assignment.repeated).length, 15);
});

test('nhóm chỉ .f hoặc chỉ .b dùng cả hai màu nhưng không chuyển sang mặt còn lại', async () => {
  for (const [tag, side] of [['f', 'front'], ['b', 'back']]) {
    const plan = await createGroupShirtPlan({
      sources: [source('one side', 1, null, tag)],
      templates: [template('all sides mgs.png', [
        region('wh-f', 'front', 'wh', 0.3, 0.3),
        region('bl-f', 'front', 'bl', 0.7, 0.3),
        region('wh-b', 'back', 'wh', 0.3, 0.7),
        region('bl-b', 'back', 'bl', 0.7, 0.7),
      ])],
      random: () => 0,
    });

    const assignments = plan.outputs[0].assignments;
    assert.equal(plan.groups[0].profile, 'side-only');
    assert.equal(plan.outputCount, 1);
    assert.deepEqual(assignments.map((item) => item.color), ['wh', 'bl']);
    assert.ok(assignments.every((item) => item.side === side && item.source.side === tag));
    assert.deepEqual(assignments.map((item) => item.repeated), [false, true]);
  }
});

test('quy tắc 3: chỉ tag màu dùng nền riêng từng màu và nền trộn màu mặt trước', async () => {
  const plan = await createGroupShirtPlan({
    sources: [
      source('color', 1, 'wh'), source('color', 2, 'wh'),
      source('color', 1, 'bl'), source('color', 2, 'bl'),
    ],
    templates: [
      template('wh mgs.png', regions('wh', 2, 'front', 'wh')),
      template('bl mgs.png', regions('bl', 2, 'front', 'bl')),
      template('dual mgs.png', [
        region('dual-wh', 'front', 'wh', 0.3),
        region('dual-bl', 'front', 'bl', 0.7),
      ]),
      template('with back mgs.png', [
        region('front-wh', 'front', 'wh', 0.3),
        region('back-wh', 'back', 'wh', 0.7),
      ]),
    ],
    random: () => 0,
  });

  assert.equal(plan.groups[0].profile, 'color-only');
  assert.deepEqual(templateNames(plan), ['bl mgs.png', 'dual mgs.png', 'wh mgs.png']);
  for (const assignment of plan.outputs.flatMap((output) => output.assignments)) {
    assert.equal(assignment.region.side, 'front');
    assert.equal(assignment.source.color, assignment.region.color);
  }
  assert.ok(plan.warnings.some((warning) => warning.template.name === 'with back mgs.png'));
});

test('chỉ tag màu báo lỗi nếu tổng các nền không bao phủ một màu PNG', async () => {
  await assert.rejects(
    createGroupShirtPlan({
      sources: [source('coverage', 1, 'wh'), source('coverage', 1, 'bl')],
      templates: [template('wh only mgs.png', regions('wh', 2, 'front', 'wh'))],
    }),
    (error) => error.code === 'NO_COMPATIBLE_GROUP_SHIRT_TEMPLATE' &&
      error.missingPoolKeys.includes('color:bl'),
  );
});

test('quy tắc 4: đủ tag màu/mặt dùng mọi nền có ít nhất một vùng tương ứng', async () => {
  const sources = [
    source('full', 1, 'wh', 'f'),
    source('full', 1, 'wh', 'b'),
    source('full', 1, 'bl', 'f'),
    source('full', 1, 'bl', 'b'),
  ];
  const plan = await createGroupShirtPlan({
    sources,
    templates: [
      template('wh front mgs.png', regions('wh-f', 2, 'front', 'wh')),
      template('bl front mgs.png', regions('bl-f', 2, 'front', 'bl')),
      template('wh sides mgs.png', [
        region('wh-front', 'front', 'wh', 0.3),
        region('wh-back', 'back', 'wh', 0.7),
      ]),
      template('bl sides mgs.png', [
        region('bl-front', 'front', 'bl', 0.3),
        region('bl-back', 'back', 'bl', 0.7),
      ]),
    ],
    random: () => 0,
  });

  assert.equal(plan.groups[0].profile, 'color-side');
  assert.equal(templateNames(plan).length, 4);
  for (const assignment of plan.outputs.flatMap((output) => output.assignments)) {
    assert.equal(assignment.source.color, assignment.region.color);
    assert.equal(assignment.source.side === 'b' ? 'back' : 'front', assignment.region.side);
  }
});

test('quy tắc 5 đối xứng: một ảnh trước được lặp khi ảnh sau tạo nhiều trang', async () => {
  const backSources = Array.from({ length: 7 }, (_, index) => source('reverse', index + 1, null, 'b'));
  const plan = await createGroupShirtPlan({
    sources: [source('reverse', 1, null, 'f'), ...backSources],
    templates: [template('reverse mgs.png', [
      ...regions('front', 3, 'front', 'bl', 0.3),
      ...regions('back', 3, 'back', 'wh', 0.7),
    ])],
    random: () => 0,
  });

  assert.equal(plan.outputs.length, 3);
  const assignments = plan.outputs.flatMap((output) => output.assignments);
  const fronts = assignments.filter((assignment) => assignment.region.side === 'front');
  assert.equal(fronts.length, 9);
  assert.ok(fronts.every((assignment) => assignment.source.ordinal === 1));
  assert.equal(fronts.filter((assignment) => assignment.repeated).length, 8);
  const consumedBack = assignments
    .filter((assignment) => assignment.region.side === 'back' && !assignment.repeated)
    .map((assignment) => assignment.source.ordinal);
  assert.deepEqual(consumedBack, [1, 2, 3, 4, 5, 6, 7]);
});

test('nhóm tag hỗn hợp như thư mục Custom Name vẫn dùng các nền phủ đúng ba pool hiện có', async () => {
  const plan = await createGroupShirtPlan({
    sources: [
      source('3', 1, 'wh', 'b'),
      ...Array.from({ length: 6 }, (_, index) => source('3', index + 2, null, 'f')),
      source('3', 8, 'bl', 'b'),
    ],
    templates: [
      template('wh front mgs.png', regions('wh-f', 3, 'front', 'wh')),
      template('bl front mgs.png', regions('bl-f', 3, 'front', 'bl')),
      template('wh sides mgs.png', [
        region('wh-f', 'front', 'wh', 0.3),
        region('wh-b', 'back', 'wh', 0.7),
      ]),
      template('bl sides mgs.png', [
        region('bl-f', 'front', 'bl', 0.3),
        region('bl-b', 'back', 'bl', 0.7),
      ]),
    ],
    random: () => 0,
  });

  assert.deepEqual(
    templateNames(plan),
    ['bl sides mgs.png', 'wh front mgs.png', 'wh sides mgs.png'],
  );
  assert.ok(plan.warnings.some((warning) => warning.template.name === 'bl front mgs.png'));
  for (const assignment of plan.outputs.flatMap((output) => output.assignments)) {
    assert.equal(assignment.source.color, assignment.region.color);
    assert.equal(assignment.source.side === 'b' ? 'back' : 'front', assignment.region.side);
  }
});
