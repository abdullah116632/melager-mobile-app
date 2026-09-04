# Offline data layer

This directory is the local-first boundary for the mobile app.

```text
UI and Redux
  -> feature repository
  -> SQLite transaction + durable outbox
  -> sync engine
  -> backend sync API
```

## Boundaries

- `database/` owns the connection, PRAGMAs, schema version and ordered migrations.
- `repositories/` is the only layer that should issue feature SQL queries.
- `outbox/` defines durable local mutations. Authentication tokens must never be persisted here.
- `sync/` coordinates registered feature processors and incremental pullers.
- `runtime/` owns the shared registry, outbox and single-flight sync engine.
- `features/` owns normalized tables, repositories and sync adapters by domain.
- `controller/` triggers sync when the app opens, resumes or reconnects.
- `background/` defines and registers the OS-managed background sync task.
- `provider/` initializes SQLite before native application controllers start.

The session token lives in native SecureStore and is injected into a sync run
only in memory. Existing AsyncStorage tokens are migrated automatically on the
first launch after this version is installed.

Feature UI must not import `expo-sqlite` directly. Each feature will receive its own normalized tables, repository and sync adapter in a separate migration step.

## Migrated features

- Shared reference data: user profile, mess list, membership role, join requests,
  active mess and consumers. Native reads come from SQLite first; full server
  snapshots then refresh SQLite and Redux in the background.
- Bazar: items, completion state, exact weekday assignments and assignment
  notification read state. Native add/edit/delete/assignment writes are committed
  to SQLite and the durable outbox together, then replayed through the idempotent
  sync endpoint when connectivity returns.
- Notice Board: local notice list, create/edit/delete, drag reorder and unread
  read state. Pending local ordering is preserved while remote data refreshes;
  stale reorder conflicts fall back to the server order instead of retrying forever.
- Meal Schedule and Menu: daily enabled state, breakfast/lunch/dinner menus,
  availability and opt-out windows are cached locally; schedule edits made
  offline are stored in the durable outbox and replayed through the existing
  meal-schedule API, preserving compatibility with older app versions.
- Daily Meals: monthly count snapshots are mirrored in SQLite. A cell update is
  optimistic and durable offline; multiple edits to one consumer/day collapse
  into one operation. The additive daily-meal sync endpoint uses the last
  server count as a compare-and-set base, so a concurrent remote edit is not
  silently overwritten.

The existing AsyncStorage cache and legacy offline queue intentionally remain active until their features are migrated and verified one at a time.
