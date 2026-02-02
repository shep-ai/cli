# Research: user-authentication

> Technical analysis for 001-user-authentication

## Status

- **Phase:** Research
- **Updated:** 2026-02-02

## Technology Decisions

### OAuth2 Library

**Options considered:**

1. **next-auth** - Full-featured auth for Next.js
2. **passport.js** - Flexible, middleware-based
3. **Custom implementation** - Direct OAuth2 flow

**Decision:** next-auth

**Rationale:** Native Next.js integration, built-in providers for Google/GitHub, handles session management automatically. Passport.js requires more boilerplate. Custom implementation is error-prone for security-critical code.

### Session Storage

**Options considered:**

1. **JWT (stateless)** - Token in cookie, no server storage
2. **Database sessions** - Session ID in cookie, data in SQLite
3. **Redis sessions** - Session ID in cookie, data in Redis

**Decision:** Database sessions (SQLite)

**Rationale:** Already using SQLite, no additional infrastructure. JWT exposes data in client. Redis is overkill for single-node deployment.

## Library Analysis

| Library    | Version | Purpose              | Pros                           | Cons                  |
| ---------- | ------- | -------------------- | ------------------------------ | --------------------- |
| next-auth  | ^4.24   | OAuth2 + sessions    | Native Next.js, many providers | Opinionated structure |
| @auth/core | ^0.18   | Core auth primitives | Framework-agnostic             | More setup required   |

## Security Considerations

- CSRF protection via next-auth's built-in tokens
- Secure cookie settings (httpOnly, sameSite, secure in prod)
- OAuth state parameter validation
- Rate limiting on auth endpoints

## Performance Implications

- Session lookup on each authenticated request (~1ms with SQLite)
- Consider session caching if becomes bottleneck

## Open Questions

All questions resolved during research.

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
