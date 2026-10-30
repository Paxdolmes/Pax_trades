/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { brandedEmail, detailRows, panel } from './email.ts';

test('text from the contact form is escaped everywhere it appears', () => {
  const nasty = '<script>alert("x")</script>';
  const html = brandedEmail({ preheader: nasty, heading: nasty, body: detailRows([['From', nasty]]) + panel(nasty) });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'));
});

test('the logo comes from the website', () => {
  assert.match(brandedEmail({ preheader: '', heading: 'Hi', body: '' }), /src="https:\/\/relay-trade\.co\.uk\/email-logo\.png"/);
});
