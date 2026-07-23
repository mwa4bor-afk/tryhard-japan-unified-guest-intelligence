# Automation and Guest Intelligence

## Guest segments

The deterministic segmentation engine classifies active guest records as:

- `VIP`
- `HIGH_VALUE`
- `RETURNING`
- `NEW`
- `LAPSED`
- `PROSPECT`
- `MERGED`

Segmentation uses visit count, lifetime value, last-seen date, and record status. Thresholds are implemented in `src/25_GuestSegmentationService.gs`.

## Guest intelligence

`TGI.GuestIntelligenceService.generateAll()` creates or refreshes stable insight records in `AI_Insights`.

The current engine is rules-based and does not call an external AI provider. It creates:

- segment insights
- personalized-recognition recommendations
- re-engagement opportunities
- marketing-consent guardrails

Each insight has a stable ID per guest and insight type, preventing duplicate accumulation during scheduled refreshes.

## Scheduled automation

Use the spreadsheet menu action **Install scheduled automations**.

The installer creates:

- a daily trigger around 05:00 Asia/Tokyo for insight generation, dashboard refresh, and integrity validation
- an hourly trigger for overdue-task review and escalation

Reinstalling managed automations first removes prior managed triggers, preventing duplicate schedules.

## Manual functions

```javascript
generateTryHardGuestIntelligence();
showTryHardSegmentSummary();
installTryHardAutomations();
runTryHardDailyAutomation();
runTryHardHourlyAutomation();
```

## Privacy and compliance

The intelligence engine must not override consent records. Promotional outreach should only be performed where valid marketing consent exists. Generated insights are operational recommendations and require human review before action.