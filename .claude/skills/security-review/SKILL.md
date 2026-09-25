---
name: security-review
description: Use this skill when adding authentication, handling user input, working with secrets, creating API endpoints, or implementing payment/sensitive features. Provides comprehensive security checklist and patterns. Apply automatically whenever code touches logins, passwords, tokens/API keys, user input, forms, uploads, payments or bots.
metadata:
  origin: ECC
---

# Security Review Skill

This skill ensures all code follows security best practices and identifies potential vulnerabilities.

## When to Activate

- Implementing authentication or authorization
- Handling user input or file uploads
- Creating new API endpoints
- Working with secrets or credentials
- Implementing payment features
- Storing or transmitting sensitive data
- Integrating third-party APIs


> **Token-saving core.** Code examples and details for each area are in `patterns.md` (same folder) — Grep the heading and read only the section the current code needs:
> `### 1. Secrets Management` · `### 2. Input Validation` · `### 3. SQL Injection Prevention` · `### 4. Authentication & Authorization` · `### 5. XSS Prevention` · `### 6. CSRF Protection` · `### 7. Rate Limiting` · `### 8. Sensitive Data Exposure` · `### 10. Dependency Security` · `## Security Testing`. Cloud/infra: `cloud-infrastructure-security.md`.

## Core rules (always)
- Never hard-code secrets (API keys, bot tokens, passwords); use environment variables / .env that is git-ignored; never paste them into chat.
- Validate and sanitize all user input on the server side; use parameterized queries; escape output to prevent XSS.
- Check auth on every protected route; hash passwords (bcrypt/argon2); least privilege.
- Rate-limit public endpoints and bot commands; don't leak stack traces or personal data in errors/logs.
- Keep dependencies updated; commit lock files.

## Pre-Deployment Security Checklist

Before ANY production deployment:

- [ ] **Secrets**: No hardcoded secrets, all in env vars
- [ ] **Input Validation**: All user inputs validated
- [ ] **SQL Injection**: All queries parameterized
- [ ] **XSS**: User content sanitized
- [ ] **CSRF**: Protection enabled
- [ ] **Authentication**: Proper token handling
- [ ] **Authorization**: Role checks in place
- [ ] **Rate Limiting**: Enabled on all endpoints
- [ ] **HTTPS**: Enforced in production
- [ ] **Security Headers**: CSP, X-Frame-Options configured
- [ ] **Error Handling**: No sensitive data in errors
- [ ] **Logging**: No sensitive data logged
- [ ] **Dependencies**: Up to date, no vulnerabilities
- [ ] **Row Level Security**: Enabled in Supabase
- [ ] **CORS**: Properly configured
- [ ] **File Uploads**: Validated (size, type)
- [ ] **Wallet Signatures**: Verified (if blockchain)

