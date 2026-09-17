export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export const badRequest = (message: string) =>
  new AppError(400, "BAD_REQUEST", message);
export const notFound = (message: string) =>
  new AppError(404, "NOT_FOUND", message);
export const conflict = (message: string) =>
  new AppError(409, "CONFLICT", message);
