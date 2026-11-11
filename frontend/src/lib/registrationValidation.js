const MAX_PARTICIPANT_NAME_LENGTH = 120;
export const COURSE_OPTIONS = Object.freeze(['A', 'B', 'C', 'D', 'E']);

export function normalizeRegistrationMembers(members) {
  if (!Array.isArray(members) || typeof members[0] !== 'string' || !members[0].trim()) {
    return { error: 'Please enter the first participant name.' };
  }

  if (members.some((member) => typeof member !== 'string')) {
    return { error: 'Participant names must be text.' };
  }

  const normalizedMembers = members.map((member) => member.trim());
  if (normalizedMembers.some((name) => name.length > MAX_PARTICIPANT_NAME_LENGTH)) {
    return { error: `Participant names must be ${MAX_PARTICIPANT_NAME_LENGTH} characters or fewer.` };
  }

  return { members: normalizedMembers.filter(Boolean) };
}
