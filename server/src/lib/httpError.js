export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const unauthorized = (message = "Chýba prihlásenie.") => new HttpError(401, message);
export const forbidden = (message = "Nemáš oprávnenie na túto akciu.") => new HttpError(403, message);
export const notFound = (message = "Záznam sa nenašiel.") => new HttpError(404, message);
export const conflict = (message, details) => new HttpError(409, message, details);
