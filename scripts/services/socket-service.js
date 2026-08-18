/**
 * GM-executed write relay.
 *
 * Players are deliberately not given ownership of the shared date entries, so
 * they cannot create or edit journal pages directly. Instead the calendar sends
 * a request over the module socket, exactly one connected GM executes it after
 * re-validating the requester, and the outcome is returned to the caller.
 *
 * This keeps note privacy enforceable: a player can only ever ask for an
 * operation on their own note, and the GM client decides whether to perform it.
 */

import { log, t } from "../compat.js";
import { MODULE_ID, SOCKET_EVENT, SOCKET_OPS } from "../constants.js";

const pending = new Map();
const handlers = new Map();
const REQUEST_TIMEOUT_MS = 15000;

/** True when this client is the single GM responsible for executing requests. */
export function isPrimaryGM() {
  const activeGMs = game.users
    .filter(user => user.isGM && user.active)
    .sort((a, b) => a.id.localeCompare(b.id));
  return activeGMs[0]?.id === game.user.id;
}

/** True when at least one GM is connected and able to service requests. */
export function hasActiveGM() {
  return game.users.some(user => user.isGM && user.active);
}

/**
 * Register the executor for one operation. Handlers run on the primary GM
 * client and receive `(payload, requestingUser)`.
 */
export function registerHandler(operation, handler) {
  handlers.set(operation, handler);
}

/**
 * Ask a GM to perform an operation on this user's behalf.
 * @returns {Promise<any>} the handler's result
 */
export function request(operation, payload) {
  if (!hasActiveGM()) return Promise.reject(new Error(t("TTA.Errors.NoActiveGM")));

  const requestId = foundry.utils.randomID();
  const message = { type: "request", requestId, operation, payload, userId: game.user.id };

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error(t("TTA.Errors.RequestTimedOut")));
    }, REQUEST_TIMEOUT_MS);

    pending.set(requestId, { resolve, reject, timeout });
    game.socket.emit(SOCKET_EVENT, message);
    log("debug", "Socket request sent", operation, requestId);
  });
}

async function handleRequest(message) {
  if (!isPrimaryGM()) return;
  const user = game.users.get(message.userId);
  const handler = handlers.get(message.operation);

  const response = { type: "response", requestId: message.requestId, userId: message.userId };
  try {
    if (!user) throw new Error("Unknown requesting user");
    if (!handler) throw new Error(`Unsupported operation: ${message.operation}`);
    response.result = await handler(message.payload, user);
    response.ok = true;
  } catch (error) {
    log("warn", "Socket request failed", message.operation, error);
    response.ok = false;
    response.error = error.message ?? String(error);
  }
  game.socket.emit(SOCKET_EVENT, response);
}

function handleResponse(message) {
  if (message.userId !== game.user.id) return;
  const record = pending.get(message.requestId);
  if (!record) return;
  pending.delete(message.requestId);
  clearTimeout(record.timeout);
  if (message.ok) record.resolve(message.result);
  else record.reject(new Error(message.error ?? t("TTA.Errors.RequestFailed")));
}

/** Wire up the module socket. Called once during `ready`. */
export function registerSocket() {
  game.socket.on(SOCKET_EVENT, message => {
    if (!message || typeof message !== "object") return;
    if (message.type === "request") return handleRequest(message);
    if (message.type === "response") return handleResponse(message);
  });
  log("debug", `Socket registered on ${SOCKET_EVENT} for ${MODULE_ID}`);
}

export { SOCKET_OPS };
