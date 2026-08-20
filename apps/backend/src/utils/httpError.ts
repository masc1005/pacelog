export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    public details?: unknown
  ) {
    super(code);
    this.name = 'HttpError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
