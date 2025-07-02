# BWT-Backend-V2

# Hono - Drizzle - PostgreSQL - Open API - JWT Authentication

A starter template for building fully documented type-safe JSON APIs with Hono and Open API.

- [Hono Open API Starter](#hono-open-api-starter)
  - [Included](#included)
  - [Setup](#setup)
  - [Code Tour](#code-tour)
  - [Endpoints](#endpoints)
  - [References](#references)

## Included

- Structured logging with [pino](https://getpino.io/) / [hono-pino](https://www.npmjs.com/package/hono-pino)
- Documented / type-safe routes with [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
- Interactive API documentation with [scalar](https://scalar.com/#api-docs) / [@scalar/hono-api-reference](https://github.com/scalar/scalar/tree/main/packages/hono-api-reference)
- Convenience methods / helpers to reduce boilerplate with [stoker](https://www.npmjs.com/package/stoker)
- Type-safe schemas and environment variables with [zod](https://zod.dev/)
- Single source of truth database schemas with [drizzle](https://orm.drizzle.team/docs/overview) and [drizzle-zod](https://orm.drizzle.team/docs/zod)
- JWT Authentication with [hono-jwt](https://hono.dev/docs/helpers/jwt)
- Sensible editor, formatting and linting settings with [@antfu/eslint-config](https://github.com/antfu/eslint-config)

## Setup

Clone this template without git history

```sh
npx degit ShahadatAnik/hono-drizzle-postgresql-starter my-api
cd my-api
```

Create `.env` file

```sh
cp .env.example .env
```

Install dependencies

```sh
npm install
```

Create a postgres database and run drizzle generate and migrations

```sh
npm run db-generate
npm run db-migrate
```

Run

```sh
npm run dev
```

Lint

```sh
npm run lint
```

Test

```sh
npm run test
```

## Code Tour

Base hono app exported from [app.ts](./src/app.ts).
Local development uses [@hono/node-server](https://hono.dev/docs/getting-started/nodejs) defined in [index.ts](./src/index.ts)

> update this file or create a new entry point to use your preferred runtime.

Type safe env defined in [env.ts](./src/env.ts) - add any other required environment variables here.

> The application will not start if any required environment variables are missing

I have used very **untraditional** file structure, but it works well for me.

- The `db` folder is only for drizzle migrations and pulling from the database.
- I have used _postgres schema_ feature for better separation of concerns.
- For respected schema, I have created folder under `src/routes` with the same name as the schema.
- For every table in that schema, I have created folder with the same name as the table of that schema.

See [src/routes/hr](./src/routes/hr/) for an example Open API group.

> Copy this folder / use as an example for your route groups.

Routing Folder [routes](./src/routes)

- Schema [hr](./src/routes/hr)
  > In this following schema has 3 tables called `users`, `department` and `designation`.
  > Under each table has these folders, for example in [users](./src/routes/hr/users):
  - Hono request handlers defined in [handlers.ts](./src/routes/hr/users/handlers.ts)
  - Router created in [index.ts](./src/routes/hr/users/index.ts)
  - Route definitions defined in [routes.ts](./src/routes/hr/users/routes.ts)
  - Zod validators defined in [utils.ts](./src/routes/hr/users/utils.ts)

All routes are merged in [index.route.ts](./src/routes/index.route.ts)<br>
All schema are merged in [index.schema.ts](./src/routes/index.schema.ts)<br>
All app routes are grouped together and exported into single type as `AppType` in [app.ts](./src/app.ts) for use in [RPC / hono/client](https://hono.dev/docs/guides/rpc).

## Endpoints of `hr.users`

| Operation | Path             | Description              |
| --------- | ---------------- | ------------------------ |
| GET       | /doc             | Open API Specification   |
| GET       | /reference       | Scalar API Documentation |
| POST      | /hr/users        | Create a user            |
| PATCH     | /hr/users/{uuid} | Patch one user by uuid   |
| DELETE    | /hr/users/{uuid} | Delete one user by uuid  |
| GET       | /hr/users        | List all users           |
| GET       | /hr/users/{uuid} | Get one user by uuid     |

## References

- [Inspiration from - w3cj](https://github.com/w3cj/hono-open-api-starter/)
- [What is Open API?](https://swagger.io/docs/specification/v3_0/about/)
- [Hono](https://hono.dev/)
  - [Zod OpenAPI Example](https://hono.dev/examples/zod-openapi)
  - [Testing](https://hono.dev/docs/guides/testing)
  - [Testing Helper](https://hono.dev/docs/helpers/testing)
- [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
- [Scalar Documentation](https://github.com/scalar/scalar/tree/main/?tab=readme-ov-file#documentation)
  - [Themes / Layout](https://github.com/scalar/scalar/blob/main/documentation/themes.md)
  - [Configuration](https://github.com/scalar/scalar/blob/main/documentation/configuration.md)
