# nauth — Examples & Community

Example applications for [nauth-toolkit](https://nauth.dev) — a platform-agnostic authentication library for Node.js.

**[Documentation](https://nauth.dev)** · **[npm](https://www.npmjs.com/org/nauth-toolkit)** · **[Discussions](https://github.com/noorixorg/nauth/discussions)** · **[Report a Bug](https://github.com/noorixorg/nauth/issues)**

---

## Examples

| Example | Stack | Description |
|---------|-------|-------------|
| [`express/`](./express) | Express + TypeORM + PostgreSQL | REST API with email/password auth, social login, MFA |
| [`fastify/`](./fastify) | Fastify + TypeORM + PostgreSQL | Same as Express but with Fastify adapter |
| [`react/`](./react) | React + Vite | Frontend SPA using `@nauth-toolkit/client` |

> The backend examples (Express/Fastify) pair with the React frontend. Run one backend and the React app together.

---

## Prerequisites

- **Node.js** >= 22.0.0
- **PostgreSQL** (or MySQL — see comments in `.env.example`)
- **yarn** or **npm**

---

## Getting Started

### 1. Clone this repo

```bash
git clone https://github.com/noorixorg/nauth.git
cd nauth
```

### 2. Set up a backend (Express or Fastify)

```bash
cd express        # or: cd fastify
cp .env.example .env
# Edit .env with your database credentials and JWT secrets
yarn install
yarn dev
```

The backend starts on `http://localhost:3000`.

### 3. Set up the React frontend

```bash
cd react
cp .env.example .env
# VITE_API_BASE_URL defaults to http://localhost:3000 — change if needed
yarn install
yarn dev
```

The frontend starts on `http://localhost:5173`.

---

## Environment Variables

Each example ships with a `.env.example` file. Copy it to `.env` and fill in your values.

**Required for the backend:**
- `DB_*` — PostgreSQL connection details
- `JWT_SECRET` + `JWT_REFRESH_SECRET` — Generate with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```

**Optional:**
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — For Google OAuth (leave blank to disable)
- Email/SMS provider credentials — see `auth.config.ts` in each example

---

## Community

**Questions?** Use [GitHub Discussions](https://github.com/noorixorg/nauth/discussions) — browse existing answers or start a new thread.

**Found a bug?** Open an [issue](https://github.com/noorixorg/nauth/issues) with steps to reproduce.

**Feature request?** Start a [discussion](https://github.com/noorixorg/nauth/discussions/new?category=ideas) under Ideas.

---

## License

These examples are provided under the [NAuth Early Access License](https://nauth.dev/docs/license) — free for commercial and non-commercial use.
