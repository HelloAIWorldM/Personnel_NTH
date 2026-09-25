---
name: api-data-leak-prevention
description: >-
  Detects, prevents, and fixes sensitive data exposure, PII leaks, credential exposure,
  and over-fetching vulnerabilities across APIs (Supabase/PostgREST, Firebase, REST/GraphQL)
  and frontend clients. Use when designing API endpoints, querying databases, handling user
  profiles, reviewing DevTools network payloads, writing database security rules (RLS/Firestore),
  or implementing export/sharing privacy features.
---

# API & Data Leak Prevention Skill

This skill enforces strict data privacy, credential protection, and defense-in-depth principles to prevent sensitive data exposure (OWASP API3:2023 - Broken Object Property Level Authorization, OWASP Top 1:2021 - Broken Access Control, and PII leaks).

---

## 🎯 When to Activate This Skill

Activate this skill when:
- Designing or reviewing database schemas, API routes, or backend queries.
- Querying databases directly from the client using **Supabase / PostgREST**, **Firebase Firestore**, or **GraphQL**.
- Observing suspicious payloads in browser **DevTools > Network > Preview/Response** (e.g., queries returning `email`, `password_hash`, `is_admin`, `phone`, `role`, or internal identifiers).
- Implementing data export, screenshot capture (Canvas/html2canvas), Excel/CSV downloads, or clipboard copy features.
- Writing or auditing database security rules (**PostgreSQL RLS**, **Firebase Security Rules**).
- Ensuring compliance with privacy regulations (GDPR, Vietnam PDPD - Decree 13/2023/NĐ-CP).

---

## 🛑 The "Anti-Pattern" to Eliminate (DevTools Over-fetching)

### ❌ The Common Disaster
```typescript
// FRONTEND DANGER: Directly querying table with wildcard select
const { data: profiles } = await supabase
  .from('profiles')
  .select('*'); 
```
**Consequence (Observed in DevTools Network Preview):**
```json
[
  {
    "id": "14b02503-3641-4e27-be6e-144ff8c8c183",
    "username": "admin",
    "email": "admin@example.com",       // 🚨 LEAKED: Private admin email
    "is_admin": true,                  // 🚨 LEAKED: Privilege escalation target
    "phone": "0901234567",             // 🚨 LEAKED: PII
    "password_hash": "$2b$12$..."      // 🚨 CRITICAL: Hash cracked offline
  }
]
```

---

## 🛡️ 4 Pillars of Prevention

### 1. Database Layer: Separate Public & Private Data (PostgreSQL / Supabase)

Never store public profile attributes (username, avatar, bio) in the same row/table alongside private credentials (email, phone, role, password).

#### Pattern A: Safe Database View (Recommended for Supabase)
```sql
-- 1. Enable RLS on the base table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Restrict direct SELECT on base table to owner only
CREATE POLICY "Users view own sensitive profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 3. Create a public view containing ONLY safe columns
CREATE OR REPLACE VIEW public_member_profiles AS
SELECT 
  id,
  username,
  bio,
  avatar_url,
  created_at
  -- EXCLUDED: email, is_admin, phone, password_hash
FROM profiles;

-- 4. Grant access to the view
GRANT SELECT ON public_member_profiles TO anon, authenticated;
REVOKE SELECT ON profiles FROM anon;
```

#### Pattern B: Client Query Whitelist
Never use `select('*')` in production client code:
```typescript
// ✅ PASS: Explicit field whitelist
const { data, error } = await supabase
  .from('public_member_profiles')
  .select('id, username, bio, avatar_url');
```

---

### 2. Cloud Database Layer: Strict Security Rules (Firebase Firestore)

Never leave Firestore rules open (`allow read, write: if true;`). Separate collections by visibility:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // 🔒 Private User Data: Strictly owner-only
    match /users_private/{userId} {
      allow read, write: if isOwner(userId);
    }

    // 🌐 Public Profiles: Read-only for everyone, update restricted to owner
    match /public_profiles/{userId} {
      allow read: if true;
      allow write: if isOwner(userId) &&
        // Prevent users from granting themselves elevated permissions
        (!request.resource.data.keys().hasAny(['role', 'is_admin', 'balance']));
    }

    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

### 3. Backend API Layer: Data Transfer Objects (DTO) & Sanitization

When building Express, Next.js, or NestJS endpoints:

#### ❌ FAIL: Returning raw database records
```typescript
app.get('/api/users', async (req, res) => {
  const users = await db.query('SELECT * FROM users');
  res.json(users); // Leaks sensitive fields!
});
```

#### ✅ PASS: Strict Whitelist DTO
```typescript
interface SafeUserDTO {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export function toSafeUserDTO(raw: any): SafeUserDTO {
  return {
    id: String(raw.id),
    username: String(raw.username || ''),
    displayName: String(raw.display_name || raw.username || ''),
    avatarUrl: raw.avatar_url ? String(raw.avatar_url) : undefined,
  };
}

app.get('/api/users', async (req, res) => {
  const rawUsers = await db.query(
    'SELECT id, username, display_name, avatar_url FROM users'
  );
  const safeUsers = rawUsers.map(toSafeUserDTO);
  res.json(safeUsers);
});
```

---

### 4. Frontend & Export Layer: Privacy Masking & CSV Defense

When users export data (screenshots, Excel, CSV, clipboard sharing):

#### A. Sensitive Text Masking
```typescript
export function maskSensitiveText(value: string, mode: 'MASK' | 'HIDE' = 'MASK'): string {
  if (!value) return '';
  if (mode === 'HIDE') return '---';

  // Email masking: admin@domain.com -> ad***@domain.com
  if (value.includes('@')) {
    const [user, domain] = value.split('@');
    return user.length <= 2 ? `**@${domain}` : `${user.slice(0, 2)}***@${domain}`;
  }

  // Name / Account masking: NguyenVanA -> Ng***nA
  if (value.length <= 2) return '***';
  if (value.length <= 4) return `${value[0]}***${value[value.length - 1]}`;
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}
```

#### B. CSV Formula Injection Sanitization (CWE-1236)
Always prefix untrusted strings starting with formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) with a single quote:
```typescript
export function sanitizeCsvCell(value: string): string {
  let str = value || '';
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}
```

---

## 🔍 Automated Verification & Audit Checklist

Before releasing any feature handling user data, verify:

- [ ] **DevTools Network Inspection**: Open DevTools > Network tab, trigger list/detail API calls, and inspect the `Response` payload. Confirm zero occurrences of:
  - `email`, `phone`, `address`
  - `password`, `hash`, `salt`
  - `is_admin`, `role`, `permissions`
  - `access_token`, `refresh_token`, `secret`
- [ ] **Database RLS Verification**: Test database queries with an unauthenticated client (`anon`). Verify unauthorized records or columns return `403` or empty sets.
- [ ] **No `SELECT *`**: All database queries explicitly name permitted fields.
- [ ] **Tokens in httpOnly Cookies**: Sensitive auth tokens stored in `httpOnly`, `Secure`, `SameSite=Strict` cookies instead of persistent `localStorage`.
- [ ] **Export Privacy Mode**: User interfaces that export rosters, member lists, or screenshots offer a privacy toggle to mask sensitive columns before sharing.
- [ ] **Automated Test Coverage**: Write tests asserting that public responses never contain blacklisted keys:
  ```typescript
  test('API response never exposes sensitive keys', async () => {
    const res = await request(app).get('/api/members');
    res.body.forEach((member: any) => {
      expect(member).not.toHaveProperty('email');
      expect(member).not.toHaveProperty('is_admin');
      expect(member).not.toHaveProperty('password_hash');
    });
  });
  ```
