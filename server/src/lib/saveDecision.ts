export type ExistingSave = { active: boolean } | null;
export type SaveIntent = "save" | "unsave";

export type SaveDecisionKind = | "create" | "reactivate" | "deactivate" | "noop_active" | "noop_inactive";

export interface SaveDecision {
  kind: SaveDecisionKind;
  resultingActive: boolean;
  countDelta: -1 | 0 | 1;
}

export function decideSave(existing: ExistingSave, intent: SaveIntent): SaveDecision {
  if (intent === "save") {
    if (existing === null) {
      return { kind: "create", resultingActive: true, countDelta: 1 };
    }
    if (existing.active) {
      return { kind: "noop_active", resultingActive: true, countDelta: 0 };
    }
    return { kind: "reactivate", resultingActive: true, countDelta: 1 };
  }

  // intent === "unsave"
  if (existing === null || !existing.active) {
    return { kind: "noop_inactive", resultingActive: false, countDelta: 0 };
  }
  return { kind: "deactivate", resultingActive: false, countDelta: -1 };
}
