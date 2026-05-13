export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExpiredError';
  }
}
