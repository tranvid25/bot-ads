# 07. Verification & Test Checklist

## 1. Automated Test Suites

### 1.1 Backend & SaaS Contract Tests (`npm run test:saas`)
- [x] `tests/marketing.test.mjs` - Multi-brand creation, channel addition, post drafting, approval, and scheduling.
- [x] `tests/dispatch.test.mjs` - Publishing queue execution, retries, and API dispatch logic.
- [x] `tests/linkedin-oauth.test.mjs` - OAuth start and callback state handling.
- [x] `tests/channels-dev.test.mjs` - DEV Community API key validation and article publication.
- [x] `tests/auth.test.mjs` - Password authentication and session persistence.
- [x] Total: **53/53 tests passing**.

### 1.2 Playwright UI Smoke Tests (`npm run test:marketing:ui`)
- [x] User signup and initial onboarding.
- [x] Brand creation (`XayWebsite Pilot`).
- [x] Channel connection (DEV browser fixture & Medium manual channel).
- [x] Sidebar navigation: Home, Create, Channel branch toggle.
- [x] Post composer interaction: text entry, tags, preview pane verification.
- [x] Post approval and scheduling workflow.
- [x] Calendar and list view rendering.
- [x] Desktop (1440x1000) and Mobile (390x844) responsive verification.
- [x] Status: **100% PASS**.

---

## 2. Visual Regression Checklist

| Item | Target Requirement | Status |
| :--- | :--- | :--- |
| **Brand Logo** | Displays `botsalesora.` with spark icon; no Buffer text or sprout `🌱 1` | Verified |
| **Sidebar Alignment** | Flush left alignment, uniform padding (`14px`), no horizontal scrollbar | Verified |
| **Icons** | Clean vector SVGs for Home, Create, Settings, and social badges | Verified |
| **Home Dashboard** | Clean Buffer Home view: Greeting, 3 metric pills, 3 first steps cards, Up Next & Comments cards | Verified |
| **Clutter Elimination** | Legacy header, intro banner, segmented tabs, and filter bar completely removed from Home | Verified |
| **Composer Modal** | Dark mode modal with channel rail, character limit, media dropzone, first comment, LinkedIn preview | Verified |
| **Responsiveness** | Responsive navigation on desktop (1440px) and collapsed drawer on mobile (390px) | Verified |

---

## 3. Code Maintainability Standard
- [x] Component files in `apps/web/src/components/marketing/` are **strictly <= 200 lines**.
- [x] `apps/web/src/components/MarketingWorkspace.jsx` is **strictly <= 200 lines**.
- [x] Pure CSS architecture in `apps/web/src/publishing.css`.
