# TryHard Loyalty Program

## Purpose

The loyalty layer provides a configurable, auditable points program across all TryHard properties. It separates member balances from the immutable transaction ledger and supports tier progression, earning, redemption, expiration, reconciliation, and reporting.

## Sheets

- `Loyalty_Tiers`: tier thresholds, multipliers, benefits, and status.
- `Loyalty_Members`: current member balance, qualifying points, tier, and activity status.
- `Loyalty_Ledger`: append-only points transactions.
- `Loyalty_Dashboard`: program totals and tier distribution.

## Default tiers

- Member: 0 qualifying points, 1.0x earning.
- Silver: 1,000 qualifying points, 1.1x earning.
- Gold: 5,000 qualifying points, 1.25x earning.
- Platinum: 15,000 qualifying points, 1.5x earning.

Tier thresholds and benefits can be edited in `Loyalty_Tiers`. Only rows with status `ACTIVE` participate in tier calculation.

## Entry points

```javascript
initializeTryHardLoyaltyProgram()
enrollTryHardLoyaltyGuest(guestId)
earnTryHardLoyaltyPoints(guestId, amount, referenceId)
redeemTryHardLoyaltyPoints(guestId, points, referenceId, description)
processTryHardLoyaltyExpirations()
reconcileTryHardLoyaltyBalances()
rebuildTryHardLoyaltyDashboard()
showTryHardLoyaltySummary()
installTryHardLoyaltyExpirationTrigger()
```

## Transaction controls

- Zero-point transactions are rejected.
- Redemptions cannot reduce a balance below zero.
- Positive transactions increase lifetime points.
- Qualifying points are independent from spendable points.
- Redemptions and expirations do not reduce qualifying points by default.
- Every transaction records the acting user and a reference type and ID.

## Expiration

Earn transactions may contain an `expires_at` value. The daily expiration processor identifies due transactions and creates an offsetting `EXPIRE` transaction. It uses the original transaction ID as an idempotency reference, preventing duplicate expiration.

## Reconciliation

`reconcileTryHardLoyaltyBalances()` recomputes every member balance from posted ledger transactions and returns any mismatch between the ledger and the stored member balance. Run it after imports, manual maintenance, or suspected data corruption.

## Permissions

- `loyalty.view`: inspect dashboards and balances.
- `loyalty.transact`: enroll, earn, and redeem.
- `loyalty.manage`: configure tiers, process expiration, install triggers, and reconcile.

## Workflow integration

Every posted points transaction publishes the `loyalty.transaction.posted` domain event when the workflow module is present. Workflow rules may use this event to create recognition tasks, trigger tier-up communications, or notify external systems.