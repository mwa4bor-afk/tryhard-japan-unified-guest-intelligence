# Explainable Guest Recommendations

The recommendation layer converts structured guest context into auditable operational suggestions. It is policy-driven and does not autonomously contact guests, spend money, alter rates, or modify reservations.

## Data model

### Recommendation_Policies
Stores versioned rules, confidence thresholds, conditions, recommended actions, approval requirements, and status.

### Guest_Recommendations
Stores each generated recommendation with guest ID, source policy and version, confidence, matched reasons, the exact input snapshot, approval status, execution status, and timestamps.

### Recommendation_Outcomes
Stores operational outcomes and optional attributed revenue so recommendation performance can be evaluated.

### Recommendation_Dashboard
Summarizes recommendation volume, approval status, execution rate, recommendation type performance, and attributed revenue.

## Default policies

Initialization seeds three examples:

1. VIP pre-arrival recognition for Gold and Platinum loyalty members.
2. Manager follow-up when a guest has an open service case.
3. Direct-booking offer consideration for repeat guests with marketing consent.

These are templates and should be reviewed against TryHard operating policy before production use.

## Explainability and governance

Every recommendation records:

- policy ID and policy version
- confidence score
- each evaluated condition
- expected and actual values
- exact input context used for scoring
- approval identity and timestamp
- execution and outcome records

Recommendations requiring approval remain `PENDING`. Managers can approve or reject them. Execution is recorded separately so approval is not confused with completion.

## Permissions

- `recommendations.view`: view recommendations and dashboards
- `recommendations.generate`: generate recommendations
- `recommendations.manage`: create and revise policies
- `recommendations.approve`: approve or reject recommendations
- `recommendations.execute`: record execution and outcomes

## Entrypoints

```javascript
initializeTryHardRecommendations()
saveTryHardRecommendationPolicy(input)
generateTryHardGuestRecommendations(guestId, context)
approveTryHardRecommendation(recommendationId)
rejectTryHardRecommendation(recommendationId, reason)
executeTryHardRecommendation(recommendationId, outcome)
recordTryHardRecommendationOutcome(recommendationId, guestId, outcome)
rebuildTryHardRecommendationDashboard()
showTryHardRecommendationSummary()
```

## Example generation context

```javascript
generateTryHardGuestRecommendations('GST-123', {
  loyalty_tier: 'GOLD',
  stay_count: 5,
  open_case_count: 0,
  marketing_consent: true,
  property_id: 'OSAKA-01',
  arrival_date: '2026-08-01'
});
```

## Safety boundary

This release is an explainable rules and scoring engine, not a free-form autonomous AI agent. External model integration can be added later behind the existing policy, approval, audit, and outcome controls.