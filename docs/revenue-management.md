# Revenue Management

The revenue layer stores dated demand snapshots, calculates core hotel metrics, produces bounded rate recommendations, and requires explicit approval before a recommendation is treated as approved.

## Sheets

- `Revenue_Demand`: occupancy, revenue, ADR, RevPAR, pickup, and demand score snapshots.
- `Rate_Recommendations`: proposed room-rate changes with reason, status, and approval audit fields.
- `Revenue_Dashboard`: latest property/date operating view.

## Core metrics

- Occupancy = rooms sold / rooms available.
- ADR = room revenue / rooms sold.
- RevPAR = room revenue / rooms available.
- Demand score combines occupancy and recent pickup pace on a 0–100 scale.

## Recommendation controls

Recommendations use demand and occupancy bands, then apply optional floor and ceiling rates. Generated records start in `PENDING` status. Only users with `revenue.approve` may approve them. This module does not automatically publish rates to a PMS or channel manager.

## Entrypoints

```javascript
initializeTryHardRevenueManagement()
captureTryHardRevenueDemand(input)
generateTryHardRateRecommendation(input)
approveTryHardRateRecommendation(recommendationId)
rebuildTryHardRevenueDashboard()
showTryHardRevenueSummary()
installTryHardRevenueDashboardTrigger()
```

## Example demand capture

```javascript
captureTryHardRevenueDemand({
  location_id: 'OSAKA-01',
  stay_date: '2026-08-15',
  rooms_available: 100,
  rooms_sold: 78,
  room_revenue: 1248000,
  pickup_1d: 4,
  pickup_7d: 18,
  pickup_14d: 31,
  source: 'PMS_IMPORT'
});
```

## Example recommendation

```javascript
generateTryHardRateRecommendation({
  location_id: 'OSAKA-01',
  stay_date: '2026-08-15',
  room_type: 'DELUXE',
  current_rate: 18000,
  floor_rate: 14000,
  ceiling_rate: 30000,
  occupancy_pct: 78,
  demand_score: 72
});
```

## Permissions

- `revenue.view`: inspect dashboards and summaries.
- `revenue.manage`: capture demand and generate recommendations.
- `revenue.approve`: approve proposed rates.

Managers receive all three permissions. Operators and viewers receive read-only access.