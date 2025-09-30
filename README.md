# Vision Maps

## Features by Plan Tier

### 🆓 Free – $0/month

**Vision Management:**
- ✅ 1 Vision (CRUD limited to 1)
  - Location: `/src/app/dashboard/visions/page.tsx` (Vision list)
  - Location: `/src/app/dashboard/visions/[id]/page.tsx` (Vision detail)
  - Create mutation: `api.visions.create`
  - Vision count check needed for permission

**Organization Management:**
- ✅ Full CRUD Orgs
  - Location: `/src/components/ui/org-settings-dialog.tsx`
  - Location: `/src/components/ui/notion-sidebar.tsx` (org switcher)

**Channel Management:**
- ✅ Full CRUD Channels
  - Location: `/src/app/dashboard/visions/[id]/page.tsx` (channel creation)
  - Location: `/src/components/vision/channel.tsx` (channel view)
  - Location: `/src/components/vision/settings.tsx` (channel settings/deletion)

**Frame Management:**
- ✅ Full CRUD Frames
  - Location: `/src/app/dashboard/visions/[id]/page.tsx` (frame creation)
  - Location: `/src/components/vision/frame.tsx` (frame view/canvas)
  - Location: `/src/components/vision/settings.tsx` (frame settings/deletion)

**Content Management:**
- ✅ Channels for entering media
  - Location: `/src/components/channel/paste-bin.tsx` (paste/upload content)
  - Location: `/src/components/channel/metadata/` (various content type cards)

**Canvas:**
- ✅ Infinite canvas for working with media
  - Location: `/src/components/vision/frame.tsx` (React Flow canvas)
  - Location: `/src/components/vision/nodes/` (node components)

**Notifications:**
- ✅ Notification system
  - Location: `/src/app/dashboard/notifications/page.tsx`
  - Location: `/src/components/ui/notifications-dropdown.tsx`

**View Mode:**
- ✅ View Mode for public tracking
  - Location: Vision settings (public/private toggle expected)

**Export:**
- ✅ Basic export options
  - Location: Vision settings (export functionality planned)

**Limitations:**
- ❌ No AI-based nodes for ideation
- ❌ No AI linking and tree system for context mapping
- ❌ No commenting system for team comms
- ❌ No collaboration (solo only - 1 user per vision)
- ❌ No advanced export

---

### 💡 Pro – $15/month (Most Popular, 3-day free trial)

**All Free Features Plus:**

**Vision Management:**
- ✅ Unlimited visions (Full CRUD)
  - No vision count limit

**AI Features:**
- ✅ AI-based nodes for ideation
  - Location: `/src/components/vision/nodes/AINode.tsx`
  - Location: `/src/components/ai/chat-input.tsx`
  - Location: `/src/components/ai/chat-list.tsx`

- ✅ AI linking and tree system on frames for context mapping
  - Location: `/src/components/vision/frame.tsx` (AI-powered node connections)
  - Location: `/src/components/ai/improved-chat-list.tsx`

**Export:**
- ✅ Advanced export options
  - Location: Vision settings (enhanced export planned)

**Collaboration:**
- ✅ Invite up to 1 extra person per vision (light collaboration)
  - Location: `/src/components/ui/invite-users-dialogue.tsx`
  - Location: `/src/components/vision/settings.tsx` (user management)
  - Max 2 users per vision (owner + 1 guest)

**Support:**
- ✅ Priority support

**Limitations:**
- ❌ No commenting system for team comms
- ❌ No live canvas collaboration (no real-time multi-user editing)

---

### 👥 Teams – $50/month (3-day free trial, 1–20 users)

**All Pro Features Plus:**

**Enhanced Collaboration:**
- ✅ Team collaboration features
  - Full multi-user access for 1-20 users per vision
  - Location: `/src/components/vision/settings.tsx` (user management)
  - Location: `/src/components/ui/invite-users-dialogue.tsx`

**Commenting System:**
- ✅ Commenting system for team communication
  - Location: `/src/components/comments/comment-chat.tsx`
  - Location: `/src/components/comments/comment-chat-list.tsx`
  - Location: `/src/components/comments/comment-indicator.tsx`
  - Comments on channels and frames

**Live Collaboration:**
- ✅ Live canvas collaboration (real-time editing + comms)
  - Location: `/src/components/vision/frame.tsx` (real-time presence)
  - Location: `/src/components/ui/face-pile.tsx` (presence indicators)
  - Real-time multi-user editing on canvas

---

## Feature Implementation Status

### Implemented Features:
- ✅ Vision CRUD
- ✅ Organization CRUD
- ✅ Channel CRUD
- ✅ Frame CRUD
- ✅ Infinite canvas (React Flow)
- ✅ Notification system
- ✅ AI nodes and chat
- ✅ Commenting system
- ✅ User invitations
- ✅ Real-time collaboration
- ✅ User presence indicators

### Planned Features:
- ⏳ Export functionality (basic & advanced)
- ⏳ View mode (public tracking)

