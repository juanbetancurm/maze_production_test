import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSE_OPTIONS, normalizeRegistrationMembers } from '../src/lib/registrationValidation.js';

test('offers exactly Courses A through E', () => {
  assert.deepEqual(COURSE_OPTIONS, ['A', 'B', 'C', 'D', 'E']);
});

test('accepts one participant without requiring a course', () => {
  assert.deepEqual(normalizeRegistrationMembers([' María ']), { members: ['María'] });
});

test('keeps named team members and ignores blank optional member fields', () => {
  assert.deepEqual(
    normalizeRegistrationMembers(['María', ' Carlos ', '   ', '']),
    { members: ['María', 'Carlos'] }
  );
});

test('requires the first participant name even if a later field is filled', () => {
  assert.equal(normalizeRegistrationMembers(['  ', 'Carlos']).error, 'Please enter the first participant name.');
});

test('rejects whitespace-only first names and names longer than the database limit', () => {
  assert.ok(normalizeRegistrationMembers(['\t ']).error);
  assert.ok(normalizeRegistrationMembers(['M'.repeat(121)]).error);
});
