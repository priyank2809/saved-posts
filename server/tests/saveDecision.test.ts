import { describe, it, expect } from "vitest";
import { decideSave } from "../src/lib/saveDecision.js";

describe("decideSave (pure, no DB)", () => {
  it("creates a new save when none exists", () => {
    const d = decideSave(null, "save");
    expect(d).toEqual({ kind: "create", resultingActive: true, countDelta: 1 });
  });

  it("is idempotent: saving an already-active save is a no-op, not a double count", () => {
    const d = decideSave({ active: true }, "save");
    expect(d).toEqual({ kind: "noop_active", resultingActive: true, countDelta: 0 });
  });

  it("reactivates a soft-deleted save instead of creating a duplicate", () => {
    const d = decideSave({ active: false }, "save");
    expect(d).toEqual({ kind: "reactivate", resultingActive: true, countDelta: 1 });
  });

  it("deactivates an active save on unsave (soft delete, count -1)", () => {
    const d = decideSave({ active: true }, "unsave");
    expect(d).toEqual({ kind: "deactivate", resultingActive: false, countDelta: -1 });
  });

  it("un-saving something never saved is a no-op, not an error", () => {
    const d = decideSave(null, "unsave");
    expect(d).toEqual({ kind: "noop_inactive", resultingActive: false, countDelta: 0 });
  });

  it("un-saving an already-inactive save is a no-op (double un-save doesn't double-decrement)", () => {
    const d = decideSave({ active: false }, "unsave");
    expect(d).toEqual({ kind: "noop_inactive", resultingActive: false, countDelta: 0 });
  });

  it("save -> unsave -> save -> unsave nets to a single history row, never negative count drift", () => {
    let state: { active: boolean } | null = null;
    let count = 0;
    const steps: Array<"save" | "unsave"> = ["save", "save", "unsave", "unsave", "save", "unsave"];
    for (const intent of steps) {
      const d = decideSave(state, intent);
      state = { active: d.resultingActive };
      count += d.countDelta;
    }
    expect(state).toEqual({ active: false });
    expect(count).toBe(0);
  });
});
