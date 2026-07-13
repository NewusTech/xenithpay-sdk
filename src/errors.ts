export class XenithApiError extends Error {
  public readonly statusCode: number;
  public readonly data: unknown;

  constructor(message: string, statusCode: number, data?: unknown) {
    super(message);
    this.name = 'XenithApiError';
    this.statusCode = statusCode;
    this.data = data;

    // Ensure proper prototype chain in transpiled environments
    Object.setPrototypeOf(this, XenithApiError.prototype);
  }
}
