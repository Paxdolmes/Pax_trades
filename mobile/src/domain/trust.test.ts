/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  arriveBy,
  autoConfirmAt,
  canReportProblem,
  canReview,
  isLate,
  maskContactDetails,
  mediaProblem,
  ratingSummary,
} from './rules.ts';

const HOUR = 3_600_000;
const t0 = Date.parse('2026-10-28T10:00:00Z');

describe('chat', () => {
  it('hides mobile numbers, landlines and emails', () => {
    assert.equal(
      maskContactDetails('Call me on 07700 900123 or email sophie@example.com'),
      'Call me on [number hidden] or email [email hidden]',
    );
    assert.equal(maskContactDetails('+44 (0)20 7946 0958'), '[number hidden]');
  });

  it('leaves door codes, prices and times alone', () => {
    const body = 'Door code 4512, see you at 10:30, £95 is fine';
    assert.equal(maskContactDetails(body), body);
  });
});

describe('no-shows', () => {
  it('gives an urgent pro an hour to arrive', () => {
    assert.equal(arriveBy(true, t0, null), t0 + HOUR);
  });

  it('gives a booked pro 15 minutes past the slot', () => {
    assert.equal(arriveBy(false, t0, t0 + 24 * HOUR), t0 + 24 * HOUR + 15 * 60_000);
  });

  it('reassigns only after the grace period', () => {
    const due = t0 + HOUR;
    assert.equal(isLate(due, due + 10 * 60_000), false);
    assert.equal(isLate(due, due + 16 * 60_000), true);
  });
});

describe('guarantee', () => {
  it('confirms a job by itself 48 hours after the pro finishes', () => {
    assert.equal(autoConfirmAt(t0), t0 + 48 * HOUR);
  });

  it('lets the customer report a problem for 30 days', () => {
    assert.equal(canReportProblem(null, t0), true);
    assert.equal(canReportProblem(t0, t0 + 29 * 24 * HOUR), true);
    assert.equal(canReportProblem(t0, t0 + 31 * 24 * HOUR), false);
  });
});

describe('reviews', () => {
  it('only from completed, paid jobs, once', () => {
    assert.equal(canReview({ status: 'completed', paid: true, reviewed: false }), true);
    assert.equal(canReview({ status: 'completed', paid: false, reviewed: false }), false);
    assert.equal(canReview({ status: 'on_site', paid: true, reviewed: false }), false);
    assert.equal(canReview({ status: 'completed', paid: true, reviewed: true }), false);
  });

  it('averages to one decimal', () => {
    assert.deepEqual(ratingSummary([5, 5, 4]), { rating: 4.7, count: 3 });
    assert.deepEqual(ratingSummary([]), { rating: null, count: 0 });
  });
});

describe('photos and video', () => {
  const photo = { kind: 'photo' as const };
  it('takes up to 3 photos', () => {
    assert.equal(mediaProblem([photo, photo], photo), null);
    assert.match(mediaProblem([photo, photo, photo], photo) ?? '', /up to 3/);
  });

  it('takes one short video on its own', () => {
    assert.equal(mediaProblem([], { kind: 'video', seconds: 20 }), null);
    assert.ok(mediaProblem([], { kind: 'video', seconds: 45 }));
    assert.ok(mediaProblem([photo], { kind: 'video', seconds: 10 }));
    assert.ok(mediaProblem([{ kind: 'video', seconds: 10 }], photo));
  });
});
