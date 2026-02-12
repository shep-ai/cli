# Control Center - Full System Overview

![Screenshot](00-control-center-hero.png)

## Summary

The complete **Features Control Center** showing all three core panels: repository sidebar, feature card canvas, and the properties/action panel. This is the primary view when running `shep ui`.

## Key Elements

- **Repository sidebar** (left): Lists connected repositories (shep-ai/cli, shep-copilot, etc.) with "Add Repository" button at the bottom
- **Feature card canvas** (center): Spatial layout of feature cards across lifecycle stages — SSO Integration, 2FA Authentication, Dark Mode Support, API Rate Limiting, Audit Logging — each with stage badges, progress bars, and unique IDs
- **Properties panel** (right): "Requirements Discovery & Validation" form open for SSO Integration, showing:
  - "Action Required: Review PRD" banner
  - Problem classification question with categorized pill options
  - Business priority selector (P1–P3) with P1 highlighted
  - "Finalize Requirements" action button
- **Multi-repo layout**: Features from different repos are visually grouped, showing cross-repo orchestration
