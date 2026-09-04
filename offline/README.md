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
- `provider/` initializes SQLite before native application controllers start.

Feature UI must not import `expo-sqlite` directly. Each feature will receive its own normalized tables, repository and sync adapter in a separate migration step.

The existing AsyncStorage cache and legacy offline queue intentionally remain active until their features are migrated and verified one at a time.
