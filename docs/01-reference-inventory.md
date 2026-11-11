# 01. Reference Inventory: Buffer Publish (https://publish.buffer.com/)

## 1. Overview & Source Identification
- **Target URL**: `https://publish.buffer.com/`
- **Application Type**: Authenticated multi-channel social media publishing & scheduling SaaS platform.
- **Brand Target for Local Reconstruction**: **BotSalesOra** (`botsalesora.`) with BotAds spark icon.
- **Reference Sessions & Visual Evidence**:
  - Live authenticated dashboard captures provided by user for account `vitran25082004` (Free Plan, 1/3 channels connected).
  - Screenshots in `docs/research/buffer/` (`source-publish-desktop.png`, `source-composer-desktop.png`, `source-calendar-desktop.png`).
  - User-submitted high-resolution reference captures (`media_*.png`).

---

## 2. Observed Visual Architecture & Design Tokens

### 2.1 Color Palette (Buffer Dark Mode)
- **Background Root (`--buffer-bg`)**: `#0d0f12` (deep pitch charcoal black)
- **Surface Elevation (`--buffer-surface`)**: `#181b20`
- **Surface Elevated / Hover (`--buffer-surface-elevated`)**: `#1f2228`
- **Sidebar Surface (`--buffer-sidebar`)**: `#101216`
- **Borders & Dividers (`--buffer-line`)**: `#282b33` (subtle border: `#20232a`)
- **Primary Brand Accent (`--buffer-lime`)**: `#9ae678` (signature Buffer light lime green)
  - Dark contrast text for lime buttons: `#123818`
  - Subtle hover tint: `#86dc63`
- **Text Hierarchy**:
  - Primary text: `#f3f4f6` (pure off-white)
  - Secondary text: `#9ca3af` (muted slate gray)
  - Muted captions: `#6b7280`
  - Subtle placeholders: `#4b5563`
- **Modal Surface (`--buffer-modal-bg`)**: `#1a1d22`
- **Editor Input Surface (`--buffer-editor-bg`)**: `#14161a`

### 2.2 Typography & Spacing
- **Font Stack**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- **Font Sizes**:
  - Heading 1 (Greeting): `22px`, font-weight `700`
  - Section Headings: `15px`, font-weight `600`
  - Card Titles: `14px`, font-weight `600`
  - Body / Subtitles: `13px` - `13.5px`, font-weight `400`
  - Badges / Microcopy: `11px` - `12px`, font-weight `500`
- **Border Radii**:
  - Pill buttons & badges: `9999px`
  - Cards: `14px`
  - Modal container: `16px`
  - Action buttons: `8px`
  - Media dropzone / internal blocks: `10px`

---

## 3. Observed Features & State Inventory

| View / Feature | Observed Status | Key UI Elements | Evidence Source |
| :--- | :--- | :--- | :--- |
| **App Shell & Sidebar** | Verified & Captured | Brand logo (`botsalesora.`), `+ New` button, `Home`, `Create`, `Channels` tree, `Connect more channels` social icons, Quota progress card (`1/3 connected`), Org switcher & collapse icon | User Image 1, 6, 7 |
| **Home Dashboard** | Verified & Captured | Top greeting card (`Good Afternoon, [User]!`), 3 streak metric pills (`Week Streak`, `Posting Goals`, `Comment Score`), First Steps (3 cards), `Up Next · 0 posts`, `Comments · 0 unanswered` | User Image 1 |
| **Post Composer Modal** | Verified & Captured | Top bar (Title, Tags, Templates, AI Assistant, Preview toggle, Close), Channel rail, Rich text area, Media dropzone, Formatting bar, First Comment field, Bottom bar (Create Another, Save Draft, Schedule split button), Live Preview pane | User Image 3, 6 |
| **Channel Tree Subnav** | Verified & Captured | Tree node with avatar and LinkedIn badge, collapsible branch with `Publish` (calendar), `Community` (chat bubbles), `Insights` (bar chart) | User Image 6, 7 |
| **Channel Connect Modal** | Verified & Captured | Multi-channel connection selector, OAuth integration status, manual/API credentials | User Image 5, `local-channels-desktop.png` |
| **Calendar / Queue** | Verified & Captured | Month/Week calendar, Scheduled post cards, Date navigator, Timezone picker | `docs/research/buffer/local-calendar-desktop.png` |
| **Floating Help Widget** | Verified & Captured | Floating circular `?` button at bottom right corner | User Image 1 |

---

## 4. Unobserved & Proposed Areas
- **Direct Messaging / Inbox Triage**: Buffer Community tab provides comments; private DMs are marked as proposed / out of initial scope.
- **Multi-user Team Roles**: Currently simulated via workspace/organization model.
