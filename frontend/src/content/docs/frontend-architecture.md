---
title: Frontend Architecture
description: Suggested structure for game lobby, scene, and API modules.
---

# Frontend Architecture

Suggested structure:

- `src/app` route pages (`/`, `/docs`, `/play`, `/settings`)
- `src/components/game` game UI and Three.js scene components
- `src/lib/api` backend API client and endpoint functions
- `src/lib/docs` markdown docs loader utilities
- `src/store` zustand state (auth, settings, game progress)

## Core modules

1. **API Client**
   Uses `NEXT_PUBLIC_API_BASE_URL` and centralizes auth headers.
2. **Settings Store**
   Holds mouse sensitivity, keybinds, and graphics level.
3. **Game Session Store**
   Holds player, inventory, battle result, active quest.
4. **Scene Layer**
   Three.js components and post-processing effects.

## Integration priority

1. Auth flow (`/auth/login`, `/auth/register`)
2. Player summary (`/api/players/:id/summary`)
3. Battle flow (`/game/players/:id/battle`)
4. Shop (`/game/shops/:id/purchase`, `/sell`)
5. Leaderboard (`/api/leaderboard`)
