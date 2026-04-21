export type PositionResult = "exact" | "present" | "absent";

export interface PositionFeedback {
  readonly position: number;
  readonly symbol: string;
  readonly result: PositionResult;
}

export class Feedback {
  readonly positions: readonly PositionFeedback[];
  readonly exactCount: number;
  readonly presentCount: number;
  readonly absentCount: number;

  constructor(positions: readonly PositionFeedback[]) {
    this.positions = positions;
    this.exactCount = positions.filter((p) => p.result === "exact").length;
    this.presentCount = positions.filter((p) => p.result === "present").length;
    this.absentCount = positions.filter((p) => p.result === "absent").length;
  }

  isAllExact(): boolean {
    return this.exactCount === this.positions.length;
  }

  toJSON(): readonly PositionFeedback[] {
    return this.positions;
  }
}
