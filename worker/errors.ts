import type { ErrorCode } from "../src/shared/protocol";
export class RoomError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
