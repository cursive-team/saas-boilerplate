import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDate, formatRelativeTime } from './utils.js';

describe('formatDate', () => {
  it('formats a Date object', () => {
    const date = new Date('2024-03-15T12:00:00Z');
    const result = formatDate(date);
    expect(result).toContain('Mar');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('formats an ISO date string', () => {
    const result = formatDate('2024-03-15T12:00:00Z');
    expect(result).toContain('Mar');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('accepts custom options', () => {
    const date = new Date('2024-03-15T12:00:00Z');
    const result = formatDate(date, { month: 'long' });
    expect(result).toContain('March');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for times less than a minute ago', () => {
    const now = new Date('2024-03-15T12:00:00Z');
    vi.setSystemTime(now);

    const thirtySecondsAgo = new Date('2024-03-15T11:59:30Z');
    expect(formatRelativeTime(thirtySecondsAgo)).toBe('just now');
  });

  it('returns minutes ago for times less than an hour ago', () => {
    const now = new Date('2024-03-15T12:00:00Z');
    vi.setSystemTime(now);

    const thirtyMinutesAgo = new Date('2024-03-15T11:30:00Z');
    expect(formatRelativeTime(thirtyMinutesAgo)).toBe('30 minutes ago');
  });

  it('returns hours ago for times less than a day ago', () => {
    const now = new Date('2024-03-15T12:00:00Z');
    vi.setSystemTime(now);

    const fiveHoursAgo = new Date('2024-03-15T07:00:00Z');
    expect(formatRelativeTime(fiveHoursAgo)).toBe('5 hours ago');
  });

  it('returns days ago for times less than a week ago', () => {
    const now = new Date('2024-03-15T12:00:00Z');
    vi.setSystemTime(now);

    const threeDaysAgo = new Date('2024-03-12T12:00:00Z');
    expect(formatRelativeTime(threeDaysAgo)).toBe('3 days ago');
  });

  it('returns formatted date for times more than a week ago', () => {
    const now = new Date('2024-03-15T12:00:00Z');
    vi.setSystemTime(now);

    const twoWeeksAgo = new Date('2024-03-01T12:00:00Z');
    const result = formatRelativeTime(twoWeeksAgo);
    expect(result).toContain('Mar');
    expect(result).toContain('1');
  });

  it('accepts ISO date string', () => {
    const now = new Date('2024-03-15T12:00:00Z');
    vi.setSystemTime(now);

    expect(formatRelativeTime('2024-03-15T11:59:30Z')).toBe('just now');
  });
});
