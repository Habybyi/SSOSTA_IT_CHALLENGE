import { badRequest } from "./httpError.js";

export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      fields[issue.path.join(".")] = issue.message;
    }
    throw badRequest("Skontroluj vyplnené údaje.", { fields });
  }
  return result.data;
}
