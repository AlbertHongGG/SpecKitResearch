# API Contracts

- OpenAPI: [openapi.yaml](./openapi.yaml)

## Notes

- Auth uses HttpOnly cookie session.
- All state-changing requests require CSRF token (see `GET /auth/csrf`).
- Existence strategy: for certain resources, non-members receive 404 to avoid leaking existence.
