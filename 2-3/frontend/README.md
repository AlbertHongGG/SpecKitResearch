## Frontend

Development server:

- `pnpm dev`

Default local URL:

- `http://localhost:5173`

Required API base URL for local development:

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`

Example:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000 pnpm dev
```

The server can also run on `http://localhost:5174` when you need a second local frontend origin for CORS testing.
