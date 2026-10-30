import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findJobType } from './catalog.ts';
import { certificateName, jobFileType, paperworkFor } from './paperwork.ts';

const paperwork = (id: string) => paperworkFor(findJobType(id)!);

test('gas jobs and EICRs need their certificate before they can be completed', () => {
  assert.deepEqual(paperwork('cp12'), { label: 'Gas safety record (CP12)', required: true });
  assert.deepEqual(paperwork('boiler-service-cp12'), { label: 'Gas safety record (CP12)', required: true });
  assert.deepEqual(paperwork('boiler-service'), { label: 'Boiler service record', required: true });
  assert.equal(paperwork('no-heating')?.required, true);
  assert.deepEqual(paperwork('eicr-small'), { label: 'EICR report', required: true });
});

test('electricians can add a certificate to any job; plumbers and carpenters have none', () => {
  assert.deepEqual(paperwork('socket-replace'), { label: 'Electrical certificate', required: false });
  assert.equal(paperwork('tap-repair'), null);
  assert.equal(paperwork('door-repair'), null);
});

test('keeps the file types the bucket takes', () => {
  assert.equal(jobFileType('image/jpeg', 'a.jpg'), 'image/jpeg');
  assert.equal(jobFileType('image/JPG', null), 'image/jpeg');
  assert.equal(jobFileType('application/pdf', 'Gas safety record.pdf'), 'application/pdf');
  // No type given: go by the name.
  assert.equal(jobFileType(undefined, 'file:///tmp/record.PDF'), 'application/pdf');
  assert.equal(jobFileType(null, 'IMG_0001.HEIC'), 'image/heic');
  assert.equal(jobFileType('', 'photo.png?x=1'), 'image/png');
  // Anything else is turned away, whatever its name says.
  assert.equal(jobFileType('image/webp', 'photo.jpg'), null);
  assert.equal(jobFileType(undefined, 'notes.docx'), null);
  assert.equal(jobFileType(undefined, undefined), null);
});

test('names each page of a certificate', () => {
  assert.equal(certificateName('EICR report', 0), 'EICR report');
  assert.equal(certificateName('EICR report', 1), 'EICR report, page 2');
});
