<p align="center">
  <img width="112" src="assets/public/solarcord-logo.png" alt="Solarcord logo" />
</p>

<h1 align="center">Solarcord Server</h1>

<p align="center">
  A self-hostable, Discord-compatible chat, voice, and video server written in TypeScript.
</p>

Solarcord contains:

- [HTTP API server](src/api)
- [WebSocket gateway server](src/gateway)
- [HTTP CDN server](src/cdn)
- [Utility and database models](src/util)

## Requirements

- Node.js 18 or newer
- npm

SQLite is used by default. Other database and storage providers can be configured with environment variables.

## Setup

```sh
npm install
npm run setup
npm start
```

The bundled server listens on port `3001` by default. See [env-vars.md](env-vars.md) for commonly used environment variables and [nginx.conf](nginx.conf) for a reverse-proxy example.

## Administration

Operators can open the protected administration panel at [`/admin`](http://localhost:3001/admin). The panel shows instance statistics and provides user verification, enable/disable, and operator-management controls. Admin API routes require the `OPERATOR` or `MANAGE_USERS` instance right.

## Development

```sh
npm run build
npm run start:api
npm run start:gateway
npm run start:cdn
```

## License

Solarcord is distributed under the GNU Affero General Public License v3.0. See [COPYING](COPYING).
