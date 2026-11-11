const ALLOWED_COURSES = new Set(["A", "B", "C", "D", "E"]);
const MAX_PARTICIPANT_NAME_LENGTH = 120;

function validateTeamRegistration(body) {
  if (!body || !Array.isArray(body.members) || body.members.length === 0) {
    return { error: "at least one participant name is required" };
  }

  const members = [];
  for (const value of body.members) {
    if (typeof value !== "string" || value.trim().length === 0) {
      return { error: "each participant name must be non-empty" };
    }

    const name = value.trim();
    if (name.length > MAX_PARTICIPANT_NAME_LENGTH) {
      return { error: `participant names must be ${MAX_PARTICIPANT_NAME_LENGTH} characters or fewer` };
    }
    members.push(name);
  }

  let course = null;
  if (body.course !== undefined && body.course !== null) {
    if (typeof body.course !== "string") {
      return { error: "course must be one of A, B, C, D, or E" };
    }
    const selectedCourse = body.course.trim();
    if (selectedCourse) {
      if (!ALLOWED_COURSES.has(selectedCourse)) {
        return { error: "course must be one of A, B, C, D, or E" };
      }
      course = selectedCourse;
    }
  }

  return { members, course };
}

module.exports = { validateTeamRegistration };
