# Five-Form Deployment

The repository creates and manages five Google Forms from code:

1. Post-Visit Guest Feedback
2. Guest Profile & Preferences
3. Service Recovery Record
4. Staff Guest Observation
5. VIP & Loyalty Update

## Deployment sequence

1. Open the unified Google Spreadsheet.
2. Open the bound Apps Script project.
3. Deploy the files under `src/`.
4. Reload the spreadsheet.
5. From **TryHard Japan Unified Guest Intelligence**, run **Install / repair workbook**.
6. Run **Create / repair all five forms**.
7. Run **Install form-submit triggers**.
8. Run **Show form links** to obtain public and edit URLs.
9. Run **Validate installation**.

The form registry is stored in Script Properties under `TGI_FORM_REGISTRY`. Re-running form creation reuses registered forms unless the registry entry is missing or the form is inaccessible.

## Routing behavior

### Post-Visit Guest Feedback

- Resolves or creates the guest.
- Increments visit count.
- Creates a stay record.
- Creates a follow-up task when manager contact is requested.

### Guest Profile & Preferences

- Resolves or creates the guest.
- Updates profile, language, birthday, and consent fields.
- Writes food, allergy, and experience preferences.

### Service Recovery Record

- Resolves or creates the guest.
- Creates a service-recovery task.
- Creates a contact-log record for the incident and immediate action.

### Staff Guest Observation

- Resolves or creates the guest.
- Creates a preference record with staff source and confidence.

### VIP & Loyalty Update

- Resolves or creates the guest.
- Creates or updates the loyalty record.
- Applies points adjustments.
- Creates a follow-up task when a next-best action is supplied.

## Raw form response tabs

Google Forms creates its own response destination tabs in the workbook. These raw tabs are retained as source evidence. The normalized router separately writes to the canonical CRM tabs.

## Trigger recovery

Running **Install form-submit triggers** removes only project triggers whose handler is `onUnifiedFormSubmit`, then installs one trigger for each registered form. This makes trigger installation safe to repeat.

## Privacy controls

Before production use:

- limit workbook and form access to authorized staff;
- publish only guest-facing forms externally;
- keep internal forms restricted;
- define retention and deletion policies;
- confirm consent wording with applicable legal and operational requirements;
- avoid collecting sensitive information that is not necessary for guest service.
