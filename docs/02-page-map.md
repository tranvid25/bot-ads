# 02. Page & Subview Map

```mermaid
flowchart TD
  AppShell["App Shell (/marketing)"] --> Sidebar["Sidebar Navigation"]
  AppShell --> Workspace["Main Workspace Container"]

  Sidebar --> NavHome["Home (tab='home')"]
  Sidebar --> NavCreate["Create (+ New -> Modal)"]
  Sidebar --> NavChannels["Channels Tree List"]
  Sidebar --> ConnectMore["Connect more channels (+ / Instagram / Threads / Bluesky)"]
  Sidebar --> Quota["Quota Indicator (1/3 connected)"]
  Sidebar --> OrgProfile["Organization Profile / Switcher"]

  NavChannels --> ChannelItem["Channel: [Vi Tran / LinkedIn]"]
  ChannelItem --> SubPublish["Publish (subview='publish' -> Calendar & Queue)"]
  ChannelItem --> SubCommunity["Community (subview='community' -> Comments & Posts)"]
  ChannelItem --> SubInsights["Insights (subview='insights' -> Metrics)"]

  Workspace --> HomeView["Buffer Home Dashboard"]
  HomeView --> GreetingBanner["Greeting Banner (Good Afternoon, vitran25082004!)"]
  HomeView --> MetricsRow["Streak & Goals Metrics (Week Streak, Posting Goals, Comment Score)"]
  HomeView --> FirstSteps["First Steps Cards (Connect channel, Create post, Part of team)"]
  HomeView --> BottomCards["Up Next (0 posts) & Comments (0 unanswered)"]

  Workspace --> ChannelsView["Channels Management (tab='channels')"]
  Workspace --> PublishView["Publishing Queue & Calendar (tab='publications')"]
  Workspace --> SettingsView["Settings & Limits (tab='settings')"]

  Workspace --> ComposerModal["Create Post Modal (Global Overlay)"]
```

## Detailed Route and State Specification

### 1. `/marketing` (Root Shell)
- **State `tab: 'home'`**:
  - Authentic Buffer Home Dashboard.
  - Greeting card with user/brand name.
  - Metric badges.
  - Quick action setup cards.
  - Up Next and Comments overview.
- **State `tab: 'channels'`**:
  - Multi-platform connection grid.
  - Platform cards: LinkedIn (API/OAuth), DEV Community (API Key), Medium (Manual/Assisted), Indie Hackers, Facebook Groups.
- **State `tab: 'publications'` / Subview `publish`**:
  - Content calendar with Month / Week grid toggle.
  - Scheduled queue list.
  - Post status pills and filters.
- **State Subview `community`**:
  - Channel-specific feed and interaction dashboard.
- **State Subview `insights`**:
  - Publication performance analytics.

### 2. Global Overlays
- **`editor: 'new' | PostObject`**:
  - Buffer Create Post modal with channel selection, live LinkedIn preview, tags, first comment, media upload, and schedule/post button.
- **`brandForm: object`**:
  - Brand/Workspace configuration modal.
