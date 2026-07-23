# TryHard Japan Unified Guest Intelligence

Google Apps Script platform for unified post-visit guest feedback, CRM records, preferences, service recovery, loyalty intelligence, and operational reporting across TryHard Japan locations.

## Current scope

This repository currently provides:

- Apps Script project configuration
- Canonical workbook schema
- Idempotent workbook installer
- Guest domain validation and normalization
- Spreadsheet-backed guest repository
- Audit logging
- Custom spreadsheet menu

## Setup

1. Create or choose a Google Spreadsheet that will be the unified workbook.
2. Create a standalone Apps Script project or bind a script to the workbook.
3. Copy the files under `src/` into Apps Script, or deploy with `clasp`.
4. Run `installTryHardGuestIntelligence()` once and authorize the requested scopes.
5. Reload the workbook and use **TryHard Guest Intelligence** from the custom menu.

For `clasp`, copy `.clasp.json.template` to `.clasp.json` and replace the placeholder script ID.

## Architecture

- `src/00_Namespace.gs` — namespace and constants
- `src/01_Utilities.gs` — normalization, validation, date, ID, and locking helpers
- `src/02_Schema.gs` — canonical workbook schema
- `src/03_WorkbookInstaller.gs` — idempotent workbook creation and formatting
- `src/04_AuditLog.gs` — structured audit records
- `src/05_GuestModel.gs` — guest domain model
- `src/06_GuestRepository.gs` — spreadsheet persistence and duplicate detection
- `src/07_MenuAndEntrypoints.gs` — installer, menu, and user entrypoints

## Data handling

The system stores guest information in the selected Google Spreadsheet. Access must be restricted to authorized personnel and configured according to applicable privacy, retention, and consent requirements.

## Status

Foundation release: `0.1.0`
