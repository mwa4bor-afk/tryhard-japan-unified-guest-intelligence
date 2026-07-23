# Marketing Workflows

## Overview

The marketing layer builds consent-safe audiences, renders reusable templates, creates campaigns, and queues messages through the external integration framework. It does not send directly from campaign code.

## Sheets

- `Message_Templates`
- `Campaigns`
- `Campaign_Recipients`
- `Marketing_Dashboard`

## Permissions

- `marketing.manage` — create and update templates and campaigns
- `marketing.audience` — preview eligible audiences
- `marketing.launch` — launch a campaign
- `marketing.view` — view campaign summaries and dashboards

Managers can manage and launch campaigns. Operators can build audiences and view reporting. Viewers can view reporting.

## Audience criteria

`TGI.AudienceService.build(criteria)` supports:

- `language`
- `country`
- `segment`
- `min_visits`
- `min_lifetime_value`
- `max_last_seen_days`

Every audience is automatically restricted to active guests with `marketing_consent = YES` and at least one usable destination.

## Templates

Templates support these channels:

- `EMAIL`
- `SMS`
- `LINE`
- provider-specific channels supported by the configured integration

Template variables use double braces, for example:

```text
Hello {{first_name}}, thank you for visiting TryHard Japan.
```

Any guest field can be referenced. Campaign-specific values such as `{{campaign_name}}` are also supported.

## Campaign lifecycle

1. Configure an active outbound integration.
2. Create a message template.
3. Create a draft campaign with audience criteria.
4. Review the audience using `TGI.AudienceService.build()`.
5. Launch with `TGI.CampaignService.launch(campaignId)`.
6. Process queued jobs using the integration processor.
7. Rebuild the marketing dashboard.

Launches are one-way operations: only campaigns in `DRAFT` status can be launched.

## Delivery payload

Each queued `campaign.message` event contains:

- campaign ID
- guest ID
- channel
- destination
- rendered subject
- rendered body
- language

The external connector is responsible for translating this canonical payload into its provider-specific API request.

## Consent enforcement

Consent is checked during audience generation and checked again while campaign recipients are created. Guests without affirmative consent are not queued.

Consent withdrawal should be processed using `TGI.PrivacyService.withdrawMarketingConsent(guestId)` before launching additional campaigns.

## Entry points

```javascript
initializeTryHardMarketing()
rebuildTryHardMarketingDashboard()
showTryHardMarketingSummary()
```

## Auditability

The system records:

- campaign creation
- campaign launch totals
- template creation and updates
- one recipient row per selected guest
- queue job IDs for dispatched recipients
- skipped recipients and reasons
- downstream delivery status in `Integration_Queue`

Do not place provider credentials, API tokens, or private keys in templates, campaign records, or recipient payloads.