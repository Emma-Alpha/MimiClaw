# Comms Regression Report

- Generated at: 2026-04-17T07:58:20.333Z
- Result: PASS

| Metric | Current | Threshold | Status |
|---|---:|---:|---|
| gateway-restart-during-run.duplicate_event_rate | 0.0000 | <= 0.005 | PASS |
| gateway-restart-during-run.event_fanout_ratio | 1.0000 | <= 1.2 | PASS |
| gateway-restart-during-run.history_inflight_max | 1.0000 | <= 1 | PASS |
| gateway-restart-during-run.rpc_timeout_rate | 0.0000 | <= 0.01 | PASS |
| gateway-restart-during-run.message_loss_count | 0.0000 | <= 0 | PASS |
| gateway-restart-during-run.message_order_violation_count | 0.0000 | <= 0 | PASS |
| happy-path-chat.duplicate_event_rate | 0.0000 | <= 0.005 | PASS |
| happy-path-chat.event_fanout_ratio | 1.0000 | <= 1.2 | PASS |
| happy-path-chat.history_inflight_max | 1.0000 | <= 1 | PASS |
| happy-path-chat.rpc_timeout_rate | 0.0000 | <= 0.01 | PASS |
| happy-path-chat.message_loss_count | 0.0000 | <= 0 | PASS |
| happy-path-chat.message_order_violation_count | 0.0000 | <= 0 | PASS |
| history-overlap-guard.duplicate_event_rate | 0.0000 | <= 0.005 | PASS |
| history-overlap-guard.event_fanout_ratio | 1.0000 | <= 1.2 | PASS |
| history-overlap-guard.history_inflight_max | 1.0000 | <= 1 | PASS |
| history-overlap-guard.rpc_timeout_rate | 0.0000 | <= 0.01 | PASS |
| history-overlap-guard.message_loss_count | 0.0000 | <= 0 | PASS |
| history-overlap-guard.message_order_violation_count | 0.0000 | <= 0 | PASS |
| invalid-config-patch-recovered.duplicate_event_rate | 0.0000 | <= 0.005 | PASS |
| invalid-config-patch-recovered.event_fanout_ratio | 1.0000 | <= 1.2 | PASS |
| invalid-config-patch-recovered.history_inflight_max | 1.0000 | <= 1 | PASS |
| invalid-config-patch-recovered.rpc_timeout_rate | 0.0000 | <= 0.01 | PASS |
| invalid-config-patch-recovered.message_loss_count | 0.0000 | <= 0 | PASS |
| invalid-config-patch-recovered.message_order_violation_count | 0.0000 | <= 0 | PASS |
| multi-agent-channel-switch.duplicate_event_rate | 0.0000 | <= 0.005 | PASS |
| multi-agent-channel-switch.event_fanout_ratio | 1.0000 | <= 1.2 | PASS |
| multi-agent-channel-switch.history_inflight_max | 0.0000 | <= 1 | PASS |
| multi-agent-channel-switch.rpc_timeout_rate | 0.0000 | <= 0.01 | PASS |
| multi-agent-channel-switch.message_loss_count | 0.0000 | <= 0 | PASS |
| multi-agent-channel-switch.message_order_violation_count | 0.0000 | <= 0 | PASS |
| network-degraded.duplicate_event_rate | 0.0000 | <= 0.005 | PASS |
| network-degraded.event_fanout_ratio | 1.0000 | <= 1.2 | PASS |
| network-degraded.history_inflight_max | 1.0000 | <= 1 | PASS |
| network-degraded.rpc_timeout_rate | 0.0000 | <= 0.01 | PASS |
| network-degraded.message_loss_count | 0.0000 | <= 0 | PASS |
| network-degraded.message_order_violation_count | 0.0000 | <= 0 | PASS |
| duplicate_event_rate | 0.0000 | <= 0.005 | PASS |
| event_fanout_ratio | 1.0000 | <= 1.2 | PASS |
| history_inflight_max | 1.0000 | <= 1 | PASS |
| rpc_timeout_rate | 0.0000 | <= 0.01 | PASS |
| message_loss_count | 0.0000 | <= 0 | PASS |
| message_order_violation_count | 0.0000 | <= 0 | PASS |
| history_load_qps | 0.4127 (baseline 0.4127) | delta <= 10.00% | PASS (0.00%) |
| rpc_p95_ms | 284.1667 (baseline 284.1667) | delta <= 15.00% | PASS (0.00%) |
