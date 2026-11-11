# 06. Implementation Plan & Execution Phases

## Phase 1: Reference Inventory & Visual Baseline (Completed)
- [x] Gather real authenticated Buffer screenshots from user account (`vitran25082004`).
- [x] Catalog observed design tokens: colors (`#0d0f12`, `#181b20`, `#9ae678`), fonts, spacing, radii.
- [x] Create core documentation: `docs/01-reference-inventory.md` through `docs/07-test-checklist.md`.

## Phase 2: App Shell, Sidebar & Brand Alignment (Completed)
- [x] Replace Buffer logo and sprout icon `🌱 1` with **`botsalesora.`** and BotAds spark icon.
- [x] Align sidebar margins and padding; eliminate horizontal misalignment.
- [x] Integrate SVG vector icons for Home, Create, Channels, Settings, and social badges.
- [x] Add connected channel tree view with `Publish`, `Community`, `Insights`.
- [x] Include `Connect more channels` pills (Instagram, Threads, Bluesky, `+`) and quota progress bar.

## Phase 3: Home Dashboard Reconstitution (Completed & In Refinement)
- [x] Completely delete legacy clutter (old header, old filter toolbar, old segmented tabs, status pills).
- [x] Implement authentic Buffer Home view:
  - Top greeting banner (`Good Afternoon, [User]!` + date).
  - 3 streak metrics cards (`Week Streak`, `Posting Goals`, `Comment Score`).
  - First Steps onboarding grid (3 cards).
  - Bottom two cards (`Up Next · 0 posts scheduled`, `Comments · 0 unanswered`).
- [x] Clean up leftover topbar breadcrumbs and legacy footnotes on the publishing shell.
- [x] Add floating `?` help button.

## Phase 4: Create Post Composer Modal (Completed & Polished)
- [x] Pixel-accurate modal header with `Tags ⌄`, `Templates`, `AI Assistant`, `Preview` toggle, and close `✕`.
- [x] Active channel selector rail on the left.
- [x] Textarea with 3000 character limit counter and templates placeholder.
- [x] Dashed media dropzone for image uploads.
- [x] Formatting toolbar (add media, emoji, hashtag, link).
- [x] First comment field with AI lightning bolt icon.
- [x] Split bottom action bar: `Create Another`, `Save Draft`, `Next Available ⌄` / `Schedule Post`.
- [x] Live social preview pane (LinkedIn card with avatar, author name, timestamp, and styled text).

## Phase 5: Publishing Queue & Calendar View (Completed)
- [x] Calendar grid with Month / Week toggle.
- [x] Timezone display pill (`Asia/Saigon`).
- [x] Scheduled post cards positioned by scheduled timestamp.
- [x] Quick-slot click to open composer pre-filled with selected time.

## Phase 6: Channel Connections & Settings (Completed)
- [x] Multi-platform channel picker (LinkedIn OAuth, DEV Community API, Medium, Indie Hackers).
- [x] Connection cards with distinct connection status indicators.

## Phase 7: Verification & Visual Regression (Ongoing)
- [x] Automated test suite: `npm run test:saas` (53/53 tests pass).
- [x] Playwright UI smoke suite: `npm run test:marketing:ui` (passes 100%).
- [x] Visual screenshot verification across Desktop (1440x1000) and Mobile (390x844).
- [x] Code maintainability rule: all component files strictly <= 200 lines.
