# 03. Component Map & Architecture

## 1. Component Hierarchy & Module Boundaries
All components in `apps/web/src/components/marketing/` strictly follow the modular maintainability rule: **strictly <= 200 lines per file**.

```
apps/web/src/
├── App.jsx (Root application shell, routing, global sidebar)
├── publishing.css (Buffer design system, dark mode tokens, typography, layout)
├── components/
│   ├── MarketingWorkspace.jsx (Core controller & state coordinator, <= 200 lines)
│   └── marketing/
│       ├── MarketingHeader.jsx (Buffer Home dashboard, Greeting, Metrics, First Steps, Up Next, Comments)
│       ├── MarketingComposerModal.jsx (Buffer Create Post modal with LinkedIn preview, tags, first comment)
│       ├── MarketingComposerPreview.jsx (Live social media preview card for LinkedIn/Dev/Medium)
│       ├── MarketingTabsView.jsx (Routing container for Publish, Channels, Content)
│       ├── MarketingFilters.jsx (Queue & calendar filter controls)
│       ├── MarketingModals.jsx (Orchestrator for Schedule, Confirm, Metrics modals)
│       ├── ChannelRow.jsx (Channel list item in connection views)
│       ├── ConnectionCard.jsx (Social platform connection cards)
│       ├── ScheduleModal.jsx (Post scheduling date/time picker)
│       ├── ConfirmModal.jsx (Manual post URL confirmation)
│       ├── MetricsModal.jsx (Manual metrics input modal)
│       ├── PostDetailsModal.jsx (Audit log and attempt viewer)
│       ├── PostForm.jsx (Underlying post editing form)
│       ├── PostRow.jsx (Table row for post lists)
│       ├── PublicationItem.jsx (Queue card representation)
│       ├── PublicationsTable.jsx (Tabular queue view)
│       └── constants.js (Empty states, options, platform metadata)
```

## 2. Key Components Breakdown

### 2.1 `MarketingHeader.jsx`
- **Role**: Recreates the Buffer Home view without any legacy header clutter.
- **Children**:
  - `buffer-greeting-banner`: Greeting emoji, user/brand title, current date string, subtle actions.
  - `buffer-streak-metrics-row`: 3 metric pill containers (`Week Streak`, `Posting Goals`, `Comment Score`).
  - `buffer-first-steps-section`: 3 onboarding/action cards (`1. Connect a channel`, `2. Create a post`, `3. Part of a team?`).
  - `buffer-home-bottom-grid`:
    - `Up Next`: Calendar icon, empty state, `+ Create Post` action.
    - `Comments`: Chat bubble icon, empty state.

### 2.2 `MarketingComposerModal.jsx` & `MarketingComposerPreview.jsx`
- **Role**: Pixel-accurate Buffer composer.
- **Features**:
  - Top bar: `Create Post`, `Tags` dropdown, `Templates` action, `AI Assistant` action, `Preview` toggle pill, fullscreen & close buttons.
  - Left rail: Connected channel icons with active badge.
  - Textarea: Character counter (`3000`), syntax highlighting placeholder.
  - Media dropzone: Dashed card with upload indicator.
  - Rich toolbar: Add media, emoji picker, hashtag helper, link inserter.
  - First Comment: Collapsible/expandable first comment input with AI prompt trigger.
  - Bottom bar: `Create Another` checkbox, `Save Draft` link, `Next Available` / `Schedule Post` split button.
  - Right pane: `LinkedIn Preview` card with profile picture, author name, timestamp, and rendered content.

### 2.3 `App.jsx` (Sidebar Navigation)
- **Role**: Fixed left navigation bar.
- **Features**:
  - Brand header: `botsalesora.` logo with spark icon.
  - Signature `+ New` button (Buffer lime green pill).
  - Main nav items: `Home` (house SVG), `Create` (lightbulb SVG).
  - Channels tree: Profile header with provider mark (LinkedIn, etc.), sub-branch lines to `Publish`, `Community`, `Insights`.
  - Social quick-connect buttons: Instagram, Threads, Bluesky, `+`.
  - Quota indicator: `1/3 channels connected` with progress segment bars.
  - Profile switcher: Organization name, `Free Plan` badge, and collapse toggle `◨`.
