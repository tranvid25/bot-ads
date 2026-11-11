# 04. Interaction Map & Event Triggers

## 1. App Shell & Navigation Interactions

| Element / Trigger | Action / Event | Target State Transition | API / Side-Effects |
| :--- | :--- | :--- | :--- |
| **`+ New` Button** (Sidebar) | `onClick` | Opens `MarketingComposerModal` in new post mode (`editor = 'new'`) | None |
| **`Home` Nav Item** | `onClick` | Sets `tab = 'home'`, shows Buffer Home Dashboard | None |
| **`Create` Nav Item** | `onClick` | Opens `MarketingComposerModal` | None |
| **Channel Node** (Tree header) | `onClick` | Expands tree branch, sets `tab = 'publications'`, `channelId = channel.id` | None |
| **`Publish` Subitem** | `onClick` | Sets `subview = 'publish'`, renders Calendar and Publishing Queue | Refreshes queue list |
| **`Community` Subitem** | `onClick` | Sets `subview = 'community'`, renders channel conversation feed | Loads comments |
| **`Insights` Subitem** | `onClick` | Sets `subview = 'insights'`, renders analytics charts | Loads metrics |
| **`Connect more channels`** (Instagram, Threads, Bluesky, `+`) | `onClick` | Sets `tab = 'channels'`, opens Channel connection picker | None |
| **Quota Card Close (`✕`)** | `onClick` | Dismisses or minimizes quota card banner | Local storage / UI state |
| **User Profile Footer** | `onClick` | Triggers account menu / logout confirmation | `POST /auth/logout` |

---

## 2. Composer Modal Interactions

| Element / Trigger | Action / Event | Target State Transition | API / Side-Effects |
| :--- | :--- | :--- | :--- |
| **Channel Avatar Selection** | Click channel icon | Toggles channel active state for current post | Updates target channels |
| **Post Text Area** | `onChange` | Updates `content`, recalculates remaining characters (3000 limit) | Live updates Preview panel |
| **Media Dropzone** | Drag-and-drop or file select | Reads file, verifies size <= 5MB, displays upload thumbnail | `POST /api/assets` |
| **First Comment Input** | `onChange` | Updates `firstComment` state | Previews first comment |
| **Tags Dropdown** | `onClick` | Opens tag selector popup | None |
| **Preview Toggle Pill** | `onClick` | Shows / hides right-hand Social Preview column | Resizes composer layout |
| **`Save Draft` Link** | `onClick` | Validates content, saves post with draft status, closes modal | `POST /marketing/posts` |
| **`Next Available` Dropdown** | `onClick` | Opens scheduling options (Share Now, Schedule Post, Next Available Slot) | Sets schedule timestamp |
| **`Schedule Post` Button** | `onClick` | Submits post, queues publication for scheduled time, closes modal | `POST /marketing/posts/:id/schedule` |
| **Escape Key or `✕` Button** | Keydown / Click | Confirms discard if dirty, closes modal | None |

---

## 3. Channel Management Interactions

| Element / Trigger | Action / Event | Target State Transition | API / Side-Effects |
| :--- | :--- | :--- | :--- |
| **Connect LinkedIn** | Click `Connect LinkedIn` | Redirects to OAuth authentication URL | `POST /marketing/linkedin/start` |
| **Connect DEV Community** | Submit API key & username | Creates DEV channel, verifies API key | `POST /marketing/channels/dev` |
| **Disconnect Channel** | Click Disconnect | Prompts confirmation, marks channel as disconnected | `DELETE /marketing/channels/:id` |
