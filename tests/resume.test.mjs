import test from 'node:test';
import assert from 'node:assert/strict';
import { createResume, exportResumeJson, layoutResume } from '../dist/esm/index.js';

const sample = {
  name: 'Ada Example',
  contact: ['ada@example.test', 'Example City'],
  sections: [
    {
      id: 'experience',
      kind: 'experience',
      title: 'Experience',
      entries: [
        {
          heading: 'Engineer',
          subheading: 'Example Co.',
          date: '2022–2025',
          details: ['Built tools'],
        },
      ],
    },
  ],
};

test('snapshots structured sections and exports valid JSON', () => {
  const resume = createResume(sample);
  assert.equal(resume.sections[0].entries[0].heading, 'Engineer');
  assert.deepEqual(JSON.parse(exportResumeJson(resume)), resume);
  assert.ok(Object.isFrozen(resume.sections[0].entries[0].details));
});

test('lays out deterministic text blocks and reports page overflow', () => {
  const longResume = {
    ...sample,
    sections: [
      {
        ...sample.sections[0],
        entries: [{ heading: 'Engineer', details: ['A'.repeat(100)] }],
      },
    ],
  };
  const options = { pageWidth: 140, pageHeight: 75, margin: 8, fontSize: 10, lineHeight: 15 };
  const result = layoutResume(longResume, options);
  assert.deepEqual(layoutResume(longResume, options), result);
  assert.ok(result.pages > 1);
  assert.ok(result.blocks.some((block) => block.kind === 'detail'));
  assert.ok(result.overflow.length > 0);
  assert.ok(result.blocks.every((block) => Number.isFinite(block.x + block.y + block.height)));
});

test('accepts empty structured resumes without inventing sections', () => {
  assert.deepEqual(createResume({ name: '', contact: [], sections: [] }).sections, []);
  assert.equal(layoutResume({ name: '', contact: [], sections: [] }).pages, 1);
});

test('rejects invalid section kinds, duplicate identifiers and malformed text', () => {
  assert.throws(
    () => createResume({ ...sample, sections: [{ ...sample.sections[0], kind: 'unknown' }] }),
    TypeError,
  );
  assert.throws(
    () => createResume({ ...sample, sections: [sample.sections[0], sample.sections[0]] }),
    TypeError,
  );
  assert.throws(() => createResume({ ...sample, name: 'bad\u0000name' }), TypeError);
});

test('enforces input, page, and layout bounds', () => {
  assert.throws(() => createResume(sample, { maxSections: 0 }), RangeError);
  assert.throws(() => createResume(sample, { maxEntries: 0 }), RangeError);
  assert.throws(() => layoutResume(sample, { pageWidth: 10, margin: 5 }), RangeError);
  assert.throws(() => layoutResume(sample, { pageHeight: Infinity }), RangeError);
});
