# Game Backend API Docs

This project includes Swagger UI and OpenAPI docs.

## Swagger UI

- URL: `http://localhost:8000/docs`
- Spec file: `backend/docs/openapi.yaml`

## How to run

```bash
cd backend
npm install
npm run server
```

Then open:

- `http://localhost:8000/docs`

## Auth

Protected endpoints require a Bearer token:

```http
Authorization: Bearer <your_jwt_token>
```

You can get a token from:

- `POST /auth/register`
- `POST /auth/login`

## Notes

- Keep `openapi.yaml` updated when adding or changing routes.
- For GitHub docs, this markdown file is the quick reference.
