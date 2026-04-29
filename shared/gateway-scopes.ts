/**
 * Gateway `connect` 握手请求的 operator scopes。
 * 需与设备签名 payload 中的 scopes 列表一致（见 electron/gateway/ws-client）。
 * 新版本 Gateway 对 sessions/chat 等 RPC 校验 operator.read / operator.write。
 */
export const GATEWAY_OPERATOR_SCOPES: string[] = [
  'operator.read',
  'operator.write',
  'operator.admin',
];
