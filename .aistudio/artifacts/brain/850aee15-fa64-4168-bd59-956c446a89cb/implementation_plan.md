# Implementation Plan: End User Dashboard Quick-Access Feature Bar

## Overview
Add a prominent, responsive **Quick-Access Feature Bar** positioned directly below the hero section on the End User Dashboard (`/dashboard`). This bar will provide requisitioners with high-visibility, 1-click access to the system's core capabilities:
1. **Create Purchase Request** (primary highlight action)
2. **Purchase Requests** (scrolls/focuses into the PR tracking table with status counts)
3. **Gab AI Chatbot** (opens the dedicated full-screen procurement assistant `/dashboard/chatbot`)
4. **Transparency Board** (navigates to public procurement and bidding records `/dashboard/transparency`)

---

## User Review Required

> [!NOTE]
> The quick-access shortcuts will be rendered in a dedicated modern card row directly below the hero banner, before the stats counters and PR table. This ensures the shortcuts are immediately visible on desktop, tablet, and mobile screens.

---

## Proposed Changes

### `app/dashboard/page.tsx`
- **Add Quick Actions Feature Bar**:
  - Insert a 4-card / 4-button quick access row beneath the institutional hero section.
  - **Button 1 — Create Purchase Request**: Distinctive university gold/maroon action card with `PlusCircle` icon, clear title and subtitle ("Start new procurement request"), linking to `/dashboard/new-pr`.
  - **Button 2 — View Purchase Requests**: Card with `ClipboardList` / `FileText` icon showing the count of active PRs and a shortcut anchor to smoothly scroll to the request tracking table.
  - **Button 3 — Gab AI Chatbot**: Card with `Bot` & `Sparkles` badge, subtitle ("RA 12009 & PR assistant"), linking to `/dashboard/chatbot`.
  - **Button 4 — Transparency Board**: Card with `BarChart3` icon and university branding, subtitle ("Public bids & procurement records"), linking to `/dashboard/transparency`.
- **Responsive Layout**:
  - Grid: `grid-cols-2 md:grid-cols-4` for a clean 2x2 grid on mobile phones and a 4-column horizontal command center on tablets and desktops.
  - Interactive hover/active states with subtle scaling and MSU-GenSan color accents (`#7B0046` maroon, `#F5AB26` gold).
- **Smooth Anchor / Tab Integration**:
  - Clicking "Purchase Requests" smoothly scrolls down to the PR table section (`#purchase-requests-section`).

---

## Verification Plan

### Automated Verification
- Run `lint_applet` to verify syntax and TypeScript typings.
- Run `compile_applet` to verify production build passes cleanly.
- Verify HTTP 200 response on `http://localhost:3000/dashboard` using `curl`.

### Manual / Browser Verification
- Verify the 4 shortcut buttons appear directly below the hero banner.
- Test clicking **Create Purchase Request** -> navigates to `/dashboard/new-pr`.
- Test clicking **Gab AI Chatbot** -> navigates to `/dashboard/chatbot`.
- Test clicking **Transparency Board** -> navigates to `/dashboard/transparency`.
- Test clicking **Purchase Requests** -> scrolls down to the purchase request tracking list.
- Check responsive appearance on both mobile and desktop viewports.
