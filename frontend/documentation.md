# Layout Documentation

## Files
- [app/layout.tsx](app/layout.tsx): Root layout for the app.
- [app/app-shell.tsx](app/app-shell.tsx): Persistent header and sidebar UI.
- [app/page.tsx](app/page.tsx): Home page content.

## How it works
1. `layout.tsx` wraps all pages.
2. `layout.tsx` renders `AppShell`.
3. `AppShell` shows:
	- Top header (always visible)
	- Profile icon popout (app/env/api info)
	- Sidebar drawer (opens from hamburger)
	- Main content area (`children`)

## Route note
- Folders in `app/` are routes.
- `page.tsx` inside a folder is that route's page.

## Settings
- Config files: environment-specific only (current: [settings.dev.json](settings.dev.json))
- Sections used: `app` and `api`
- Access module: [lib/settings.ts](lib/settings.ts)
- Example usage: [app/app-shell.tsx](app/app-shell.tsx)
- Env var used: `NEXT_PUBLIC_APP_ENV` (set in [.env](.env))
- API base URL location: `api.baseUrl` in the settings JSON file

## API
- Centralized client class: `FastApiClient` in [lib/api-client.ts](lib/api-client.ts)
- Endpoint file: [app/api/hello/route.ts](app/api/hello/route.ts)
- Method: `GET`
- URL: `/api/hello`
- Behavior: Proxies request to FastAPI `GET /hello`
- Base URL source: `settings.api.baseUrl`

## API usage in UI
- File: [app/page.tsx](app/page.tsx)
- Calls `fetch("/api/hello")` on page load.
- Shows:
	- loading state
	- error state
	- success data
