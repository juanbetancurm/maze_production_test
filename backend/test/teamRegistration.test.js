const test = require("node:test");
const assert = require("node:assert/strict");
const { validateTeamRegistration } = require("../src/validation/teamRegistration");

test("accepts an individual participant with no course", () => {
  assert.deepEqual(validateTeamRegistration({ members: [" María "] }), {
    members: ["María"],
    course: null,
  });
});

test("accepts a team with an optional course", () => {
  assert.deepEqual(validateTeamRegistration({ members: ["María", "Carlos"], course: "A" }), {
    members: ["María", "Carlos"],
    course: "A",
  });
});

test("accepts exactly the five supported courses", () => {
  for (const course of ["A", "B", "C", "D", "E"]) {
    assert.equal(validateTeamRegistration({ members: ["Juan"], course }).course, course);
  }
});

test("normalizes an empty optional course to null", () => {
  for (const course of [undefined, null, "", "   "]) {
    assert.equal(validateTeamRegistration({ members: ["Juan"], course }).course, null);
  }
});

test("rejects a missing participant name", () => {
  assert.match(validateTeamRegistration({ members: [], course: "C" }).error, /participant name/);
});

test("rejects blank names, including whitespace-only names", () => {
  assert.ok(validateTeamRegistration({ members: ["   "] }).error);
  assert.ok(validateTeamRegistration({ members: ["María", "  "] }).error);
});

test("rejects unsupported courses and overlong names", () => {
  assert.ok(validateTeamRegistration({ members: ["Juan"], course: "8A" }).error);
  assert.ok(validateTeamRegistration({ members: ["J".repeat(121)] }).error);
});
