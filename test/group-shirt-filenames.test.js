'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  GroupShirtFilenameError,
  GroupShirtRenameError,
  parseGroupShirtSourceName,
  parseGroupShirtTemplateName,
  buildGroupShirtRenamedPath,
  buildGroupShirtRenamePlan,
  applyGroupShirtRenamePlan,
} = require('../src/services/group-shirt-filenames');

async function tempDirectory(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'group-shirt-filenames-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

test('phân tích tên PNG theo nhóm, số thứ tự, màu và mặt không phụ thuộc khoảng trắng', () => {
  const first = parseGroupShirtSourceName('1 (1).wh.f.png');
  assert.deepEqual(
    {
      group: first.group,
      groupKey: first.groupKey,
      ordinal: first.ordinal,
      sequence: first.sequence,
      color: first.color,
      side: first.side,
      explicitColor: first.explicitColor,
      explicitSide: first.explicitSide,
    },
    {
      group: '1',
      groupKey: '1',
      ordinal: 1,
      sequence: 1,
      color: 'wh',
      side: 'f',
      explicitColor: true,
      explicitSide: true,
    },
  );
  const third = parseGroupShirtSourceName('Nhóm Áo(003).b.BL.PNG');
  assert.equal(third.group, 'Nhóm Áo');
  assert.equal(third.groupKey, 'nhóm áo');
  assert.equal(third.ordinal, 3);
  assert.equal(third.color, 'bl');
  assert.equal(third.side, 'b');
});

test('PNG thiếu tag mặc định áo sáng và mặt trước', () => {
  const parsed = parseGroupShirtSourceName('2 (7).png');
  assert.equal(parsed.color, 'wh');
  assert.equal(parsed.side, 'f');
  assert.equal(parsed.explicitColor, false);
  assert.equal(parsed.explicitSide, false);
});

test('từ chối tên PNG sai mẫu, ordinal 0, tag lặp hoặc tag mâu thuẫn', () => {
  assert.throws(
    () => parseGroupShirtSourceName('design.png'),
    (error) => error instanceof GroupShirtFilenameError &&
      error.code === 'INVALID_GROUP_SHIRT_SOURCE_NAME',
  );
  assert.throws(
    () => parseGroupShirtSourceName('1 (0).png'),
    (error) => error.code === 'INVALID_GROUP_SHIRT_ORDINAL',
  );
  assert.throws(
    () => parseGroupShirtSourceName('1 (1).wh.wh.png'),
    (error) => error.code === 'DUPLICATE_NAME_MARKER',
  );
  assert.throws(
    () => parseGroupShirtSourceName('1 (1).wh.bl.png'),
    (error) => error.code === 'CONFLICTING_NAME_MARKERS',
  );
  assert.throws(
    () => parseGroupShirtSourceName('1 (1).f.b.png'),
    (error) => error.code === 'CONFLICTING_NAME_MARKERS',
  );
});

test('ảnh nền cần marker mgs, giữ exact group và nhận tên variant phía sau', () => {
  const base = parseGroupShirtTemplateName('1 mgs.png');
  assert.equal(base.groupKey, '1');
  assert.equal(base.marker, 'mgs');
  assert.equal(base.variant, null);

  const variant = parseGroupShirtTemplateName('Nhóm ÁoMGS dark-shirt.JpG');
  assert.equal(variant.groupKey, 'nhóm áo');
  assert.equal(variant.variant, 'dark-shirt');
  assert.throws(
    () => parseGroupShirtTemplateName('1 background.png'),
    (error) => error.code === 'MISSING_GROUP_SHIRT_MGS_MARKER',
  );
  assert.throws(
    () => parseGroupShirtTemplateName('mgs.png'),
    (error) => error.code === 'MISSING_GROUP_KEY',
  );
});
test('lập tên mới theo thứ tự chuẩn color rồi side và thay tag cùng loại', () => {
  const root = path.resolve('D:\\Mockups');
  assert.equal(
    buildGroupShirtRenamedPath(path.join(root, '1 (1).b.bl.png'), { color: 'wh', side: 'f' }),
    path.join(root, '1 (1).wh.f.png'),
  );
  assert.equal(
    buildGroupShirtRenamedPath(path.join(root, '1 (2).png'), { side: 'b' }),
    path.join(root, '1 (2).b.png'),
  );
});

test('đổi tên vật lý hai phase và giữ đủ nội dung file', async (t) => {
  const directory = await tempDirectory(t);
  const one = path.join(directory, '1 (1).png');
  const two = path.join(directory, '1 (2).bl.png');
  await Promise.all([
    fs.writeFile(one, 'one'),
    fs.writeFile(two, 'two'),
  ]);

  const result = await applyGroupShirtRenamePlan([
    { path: one, color: 'wh', side: 'f' },
    { path: two, color: 'wh', side: 'b' },
  ], { idFactory: () => 'rename-test' });
  assert.deepEqual(
    result.renamed.map((entry) => path.basename(entry.to)),
    ['1 (1).wh.f.png', '1 (2).wh.b.png'],
  );
  assert.equal(await fs.readFile(path.join(directory, '1 (1).wh.f.png'), 'utf8'), 'one');
  assert.equal(await fs.readFile(path.join(directory, '1 (2).wh.b.png'), 'utf8'), 'two');
  assert.rejects(fs.access(one));
  assert.rejects(fs.access(two));
});

test('phát hiện target trùng trong batch và file target có sẵn', async (t) => {
  const directory = await tempDirectory(t);
  const one = path.join(directory, '1 (1).png');
  const tagged = path.join(directory, '1 (1).wh.f.png');
  await Promise.all([fs.writeFile(one, 'one'), fs.writeFile(tagged, 'occupied')]);

  assert.throws(
    () => buildGroupShirtRenamePlan([
      { path: one, color: 'wh', side: 'f' },
      { path: tagged },
    ]),
    (error) => error instanceof GroupShirtRenameError &&
      error.code === 'DUPLICATE_RENAME_TARGET',
  );
  await assert.rejects(
    applyGroupShirtRenamePlan([{ path: one, color: 'wh', side: 'f' }]),
    (error) => error.code === 'RENAME_TARGET_EXISTS',
  );
  assert.equal(await fs.readFile(one, 'utf8'), 'one');
});

test('lỗi phase commit khôi phục toàn bộ tên và nội dung cũ', async (t) => {
  const directory = await tempDirectory(t);
  const one = path.join(directory, '1 (1).png');
  const two = path.join(directory, '1 (2).png');
  await Promise.all([fs.writeFile(one, 'one'), fs.writeFile(two, 'two')]);
  let renameCalls = 0;
  let failed = false;
  const fsImpl = {
    ...fs,
    rename: async (from, to) => {
      renameCalls += 1;
      if (!failed && renameCalls === 4) {
        failed = true;
        const error = new Error('injected commit failure');
        error.code = 'EIO';
        throw error;
      }
      return fs.rename(from, to);
    },
  };

  await assert.rejects(
    applyGroupShirtRenamePlan([
      { path: one, color: 'wh' },
      { path: two, color: 'bl' },
    ], { fsImpl, idFactory: () => 'rollback-test' }),
    (error) => error.code === 'RENAME_FAILED_ROLLED_BACK' &&
      error.rollbackErrors.length === 0,
  );
  assert.equal(await fs.readFile(one, 'utf8'), 'one');
  assert.equal(await fs.readFile(two, 'utf8'), 'two');
  assert.deepEqual((await fs.readdir(directory)).sort(), ['1 (1).png', '1 (2).png']);
});
