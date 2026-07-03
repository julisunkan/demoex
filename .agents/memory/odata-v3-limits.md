---
name: OData v3 filter limits
description: Outlook REST v2.0 uses OData v3 — several OData v4 features cause 400 errors
---

## Rule
Outlook REST v2.0 is OData v3. The following **do not work** and cause 400 errors:

- `contains(field,'value')` — OData v4 only; use JS `.includes()` after fetch
- `$orderby` combined with `$filter` — not supported; sort in JS after fetch
- Milliseconds in ISO dates (`2024-01-01T00:00:00.000Z`) — strip with `.replace(/\.\d{3}Z$/, "Z")`

**Why:** The Outlook REST v2.0 endpoint is spec'd against OData v3, which lacks these capabilities. The errors surface as "Scan failed" / "Unexpected token" if the raw 400 body leaks to the client.

**How to apply:** In every route that builds an `$filter` query for Outlook REST: remove `contains()`, remove `$orderby` when `$filter` is present, strip milliseconds from date strings. Apply the removed filters in JS on the fetched results array.
