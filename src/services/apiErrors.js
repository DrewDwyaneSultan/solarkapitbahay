import {
  friendlyApiDetailObject,
  friendlyHttpStatus,
} from '../utils/userMessages';

/** Parse a failed fetch Response into an Error with a friendly message. */
export async function parseApiError(res) {
  const body = await res.json().catch(() => ({}));
  const fromDetail = friendlyApiDetailObject(body.detail);
  const fromStatus = friendlyHttpStatus(res.status);
  const payload = fromDetail ?? fromStatus;

  const err = new Error(payload.message);
  err.title = payload.title;
  err.hint = payload.hint ?? null;
  err.status = res.status;
  err.detail = body.detail;
  return err;
}

export async function throwIfNotOk(res) {
  if (!res.ok) throw await parseApiError(res);
  return res;
}
