---
title: Getting Started
description: Setup guide for frontend development and docs system.
---

# Getting Started

This frontend is built with **Next.js App Router** and supports markdown docs at `/docs`.

## Run frontend

```bash
cd frontend
npm run dev
```

## Environment

Create `frontend/.env` (or keep your existing one):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Docs source

All docs markdown files live in:

`src/content/docs/*.md`

Each file can include frontmatter:

```md
---
title: Page title
description: Small summary
---
```
