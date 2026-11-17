# Project rules

- Keep all user-facing app routes in TanStack file-based routing so server rendering, metadata, and navigation stay consistent.
- Keep marketplace catalog reads public and read-only; enforce any future owner-specific writes through authenticated server functions and row-level database policies.
- Keep database structure and access rules in managed Lovable database migrations so the preview and deployed app share the same schema.
