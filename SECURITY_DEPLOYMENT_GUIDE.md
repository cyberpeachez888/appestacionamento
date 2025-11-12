# Security Features - Deployment Guide

## ✅ FASE 1 - SECURITY BASICS - IMPLEMENTATION COMPLETE

### Overview

This guide covers the deployment of Phase 1 security enhancements to protect sensitive business data.

**Features Implemented:**

- ✅ Login attempt limiting (5 attempts per 15 minutes)
- ✅ Account lockout (30 minutes after 5 failed attempts)
- ✅ Password strength validation (8+ chars, uppercase, lowercase, digit, symbol)
- ✅ Password reuse prevention (last 3 passwords)
- ✅ Force password change on first login
- ✅ Password expiration (90 days)
- ✅ Enhanced security audit logging
- ✅ Rate limiting on authentication endpoints

---

## 📋 Deployment Steps

### Step 1: Install Dependencies

```bash
cd backend
npm install express-rate-limit password-validator zxcvbn
```

**Dependencies Added:**

- `express-rate-limit@7.1.5` - Rate limiting middleware
- `password-validator@5.3.0` - Password schema validation
- `zxcvbn@4.4.2` - Password strength estimation

### Step 2: Execute Database Migration

Execute the SQL migration in Supabase SQL Editor:

```sql
-- Located in: /backend/create-security-tables.sql
```

**Migration Creates:**

1. **login_attempts** table
   - Tracks all login attempts (success/failure)
   - Records IP address and user agent
   - Auto-cleanup after 30 days

2. **account_locks** table
   - Stores temporary account locks
   - 30-minute lockout duration
   - Tracks failed attempt count

3. **password_history** table
   - Prevents password reuse
   - Stores last 3 passwords
   - Auto-cleanup via trigger

4. **Users table columns:**
   - `must_change_password` - Force password change flag
   - `is_first_login` - First login detection
   - `password_changed_at` - Last password change timestamp
   - `password_expires_at` - Password expiration date (90 days)
   - `last_login_at` - Last successful login
   - `last_login_ip` - IP address of last login

5. **PostgreSQL Functions:**
   - `cleanup_old_login_attempts()` - Remove old login records
   - `is_account_locked()` - Check lock status
   - `unlock_account()` - Manual unlock
   - `add_password_to_history()` - Track password changes

### Step 3: Restart Backend Server

```bash
# Stop current backend process
kill -9 $(cat frontend.pid)

# Or use the start script
./start-backend.sh
```

### Step 4: Verify Installation

Test the security features:

```bash
# Test password validation endpoint
curl -X POST http://localhost:3000/api/auth/validate-password \
  -H "Content-Type: application/json" \
  -d '{"password": "weak"}'

# Expected: Validation errors

# Test password requirements endpoint
curl http://localhost:3000/api/auth/password-requirements

# Expected: Password policy JSON
```

---

## 🔐 Security Features Detail

### 1. Login Attempt Limiting

**Behavior:**

- Maximum 5 failed login attempts per username
- 15-minute rolling window
- Account locked for 30 minutes after 5 failures
- IP-based rate limiting: 5 requests per 15 minutes

**Implementation:**

- `securityService.js::logLoginAttempt()` - Records all attempts
- `securityService.js::getFailedAttempts()` - Counts failures
- `securityService.js::lockAccount()` - Creates lock
- `rateLimiter.js::loginLimiter` - IP-based rate limiting

**Error Messages:**

- `"Credenciais inválidas. X tentativa(s) restante(s)."`
- `"Muitas tentativas falhadas. Conta bloqueada por 30 minutos."`
- `"Conta bloqueada. Tente novamente em X minutos."`

### 2. Password Strength Validation

**Requirements:**

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 digit
- At least 1 special character
- No spaces allowed
- Zxcvbn strength score ≥ 2/4
- Not in weak password blacklist (26 common passwords)

**Weak Password Blacklist:**

```
password, admin, 123456, 12345678, qwerty, abc123, password123,
admin123, letmein, welcome, monkey, 1234567890, changeme,
password1, 123456789, 12345, 1234, 111111, 1234567, dragon,
123123, baseball, iloveyou, trustno1, sunshine, master, welcome1
```

**Implementation:**

- `securityService.js::validatePassword()` - Main validation
- Uses `password-validator` for schema
- Uses `zxcvbn` for strength estimation
- Returns validation errors and suggestions

**API Endpoint:**

```
POST /api/auth/validate-password
Body: { "password": "YourPassword123!" }
Response: {
  "valid": true/false,
  "errors": ["error messages"],
  "strength": { score: 0-4, feedback: {...} },
  "suggestions": ["improvement suggestions"]
}
```

### 3. Password Reuse Prevention

**Behavior:**

- Checks last 3 passwords
- Uses bcrypt for secure comparison
- Automatic cleanup of old password history

**Implementation:**

- `securityService.js::isPasswordReused()` - Checks history
- `password_history` table stores hashed passwords
- Trigger `password_history_trigger` maintains 3-password limit

### 4. Force Password Change

**Triggers:**

- First login (`is_first_login = true`)
- Admin sets `must_change_password = true`
- Password expired (>90 days since `password_changed_at`)

**Flow:**

1. User logs in successfully
2. Login response includes `mustChangePassword: true`
3. Frontend shows password change dialog
4. User must change password before accessing system

**Login Response Example:**

```json
{
  "token": "jwt-token",
  "user": { ... },
  "mustChangePassword": true,
  "isFirstLogin": false
}
```

### 5. Password Expiration

**Policy:**

- Passwords expire after 90 days
- `password_expires_at` set on password creation/change
- Login blocks if password expired

**Implementation:**

- `securityService.js::isPasswordExpired()` - Checks expiration
- Login returns 403 with `mustChangePassword: true`
- Frontend redirects to password change

### 6. Enhanced Audit Logging

**Logged Events:**

- All login attempts (success/failure)
- Account lock/unlock events
- Password changes
- Failed password validations

**Data Captured:**

- Username/login
- IP address
- User agent
- Timestamp
- Success/failure reason

**Implementation:**

- `login_attempts` table stores all login events
- Auto-cleanup after 30 days
- Query for security analytics

### 7. Rate Limiting

**Three Levels:**

1. **Login Limiter** (`loginLimiter`)
   - 5 requests per 15 minutes per IP
   - Applied to `/api/auth/login`

2. **Strict Limiter** (`strictLimiter`)
   - 3 requests per hour per IP
   - Applied to `/api/auth/change-password`

3. **API Limiter** (`apiLimiter`)
   - 100 requests per 15 minutes per IP
   - Can be applied to general API routes (optional)

**Headers Returned:**

- `RateLimit-Limit` - Request limit
- `RateLimit-Remaining` - Remaining requests
- `RateLimit-Reset` - Reset timestamp

---

## 🧪 Testing Guide

### Test 1: Brute-Force Protection

**Objective:** Verify account locks after 5 failed attempts

```bash
# Attempt 1-5: Failed logins
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"login": "testuser", "password": "wrongpassword"}'
  echo "\nAttempt $i"
done

# Attempt 6: Should be locked
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "testuser", "password": "correctpassword"}'

# Expected: "Conta bloqueada. Tente novamente em 30 minutos."
```

### Test 2: Weak Password Rejection

**Objective:** Verify password validation rejects weak passwords

```bash
# Test weak passwords
curl -X POST http://localhost:3000/api/auth/validate-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"password": "password123"}'

# Expected: valid: false, errors: ["Password is too weak or commonly used"]

# Test strong password
curl -X POST http://localhost:3000/api/auth/validate-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"password": "MyStr0ng!Pass2024"}'

# Expected: valid: true
```

### Test 3: Password Reuse Prevention

**Objective:** Verify last 3 passwords cannot be reused

```bash
# Change password 3 times, then try to reuse first password
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "currentPassword": "Current123!",
    "newPassword": "Previous123!"
  }'

# Expected: "Esta senha foi usada recentemente. Escolha uma senha diferente."
```

### Test 4: First Login Flow

**Objective:** Verify first login forces password change

1. Create new user with SQL:

```sql
INSERT INTO users (name, email, login, password_hash, role, is_first_login, must_change_password)
VALUES ('Test User', 'test@example.com', 'testuser',
  '$2a$10$hashedpassword', 'operator', true, true);
```

2. Login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "testuser", "password": "initialpassword"}'
```

3. Expected response:

```json
{
  "token": "...",
  "user": {...},
  "mustChangePassword": true,
  "isFirstLogin": true
}
```

4. Frontend should show password change dialog

### Test 5: Password Expiration

**Objective:** Verify expired passwords force change

1. Set password expiration date to past:

```sql
UPDATE users
SET password_expires_at = NOW() - INTERVAL '1 day'
WHERE login = 'testuser';
```

2. Try to login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "testuser", "password": "correctpassword"}'
```

3. Expected: 403 status with `"Senha expirada. Por favor, altere sua senha."`

### Test 6: Rate Limiting

**Objective:** Verify IP-based rate limiting

```bash
# 6 rapid login attempts from same IP
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"login": "admin", "password": "test"}'
  echo "\nRequest $i"
done

# Request 6 should return 429 Too Many Requests
# Expected: "Muitas tentativas de login. Por favor, tente novamente em 15 minutos."
```

---

## 📊 Database Queries for Monitoring

### View Recent Login Attempts

```sql
SELECT
  login,
  ip_address,
  success,
  failure_reason,
  created_at
FROM login_attempts
ORDER BY created_at DESC
LIMIT 50;
```

### View Locked Accounts

```sql
SELECT
  u.login,
  u.name,
  al.locked_until,
  al.lock_reason,
  al.failed_attempts
FROM account_locks al
JOIN users u ON u.id = al.user_id
WHERE al.locked_until > NOW()
ORDER BY al.locked_until DESC;
```

### View Failed Login Statistics

```sql
SELECT
  login,
  COUNT(*) as failed_attempts,
  MAX(created_at) as last_attempt
FROM login_attempts
WHERE success = false
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY login
ORDER BY failed_attempts DESC;
```

### View Password Expiration Status

```sql
SELECT
  login,
  name,
  password_changed_at,
  password_expires_at,
  CASE
    WHEN password_expires_at < NOW() THEN 'EXPIRED'
    WHEN password_expires_at < NOW() + INTERVAL '7 days' THEN 'EXPIRING SOON'
    ELSE 'VALID'
  END as status,
  DATE_PART('day', password_expires_at - NOW()) as days_remaining
FROM users
ORDER BY password_expires_at ASC;
```

### Unlock Account Manually

```sql
-- Use the built-in function
SELECT unlock_account(user_id);

-- Or delete lock record directly
DELETE FROM account_locks WHERE user_id = 'user-id-here';
```

---

## 🚨 Troubleshooting

### Issue: Account Locked Forever

**Cause:** Lock didn't expire or database function issue

**Solution:**

```sql
-- Check lock status
SELECT * FROM account_locks WHERE user_id = 'user-id';

-- Manual unlock
SELECT unlock_account('user-id');

-- Or delete lock
DELETE FROM account_locks WHERE user_id = 'user-id';
```

### Issue: Password Validation Too Strict

**Cause:** Zxcvbn strength requirement or weak password blacklist

**Solution:**
Edit `/backend/src/services/securityService.js`:

```javascript
// Change minimum strength score (0-4)
if (strength.score < 2) { // Change to 1 for less strict
  ...
}
```

### Issue: Rate Limiting Blocks Legitimate Users

**Cause:** Multiple failed attempts from shared IP

**Solution:**
Edit `/backend/src/middleware/rateLimiter.js`:

```javascript
// Increase max attempts or window
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Increase from 5 to 10
  ...
});
```

### Issue: Password Expiration Too Frequent

**Cause:** 90-day policy may be too strict

**Solution:**
Edit `/backend/src/services/securityService.js`:

```javascript
// Change expiration period
const PASSWORD_EXPIRATION_DAYS = 180; // Change from 90 to 180
```

Update migration SQL:

```sql
-- Change default expiration in create-security-tables.sql
password_expires_at = NOW() + INTERVAL '180 days'
```

---

## 📝 API Endpoints Reference

### POST /api/auth/login

**Rate Limit:** 5 requests / 15 minutes per IP
**Body:** `{ "login": "string", "password": "string" }`
**Response:**

```json
{
  "token": "jwt-token",
  "user": { ... },
  "mustChangePassword": true/false,
  "isFirstLogin": true/false
}
```

### POST /api/auth/validate-password

**Auth Required:** Yes
**Body:** `{ "password": "string" }`
**Response:**

```json
{
  "valid": true/false,
  "errors": ["error1", "error2"],
  "strength": { score: 0-4, ... },
  "suggestions": ["suggestion1"]
}
```

### POST /api/auth/change-password

**Auth Required:** Yes
**Rate Limit:** 3 requests / hour per IP
**Body:** `{ "currentPassword": "string", "newPassword": "string" }`
**Response:**

```json
{
  "message": "Senha alterada com sucesso",
  "success": true
}
```

### GET /api/auth/password-requirements

**Auth Required:** No
**Response:**

```json
{
  "minLength": 8,
  "requireUppercase": true,
  "requireLowercase": true,
  "requireDigit": true,
  "requireSpecialChar": true,
  "passwordExpirationDays": 90,
  "passwordHistoryLimit": 3,
  "maxLoginAttempts": 5,
  "lockoutDurationMinutes": 30
}
```

---

## 🎯 Next Steps (Future Phases)

### Phase 2: Session Management (4h)

- Inactivity timeout (30 minutes)
- Auto-logout on browser close
- Session refresh mechanism

### Phase 3: Two-Factor Authentication (8h)

- SMS/Email OTP
- TOTP (Google Authenticator)
- Backup codes

### Phase 4: IP Whitelist/Blacklist (4h)

- Admin IP whitelist
- Suspicious IP blacklist
- Geolocation blocking

---

## ✅ Security Checklist

Before deploying to production:

- [ ] SQL migration executed successfully
- [ ] Dependencies installed (`npm install`)
- [ ] Backend restarted
- [ ] Test brute-force protection (6 failed attempts)
- [ ] Test weak password rejection
- [ ] Test password reuse prevention
- [ ] Test first login flow
- [ ] Test password expiration
- [ ] Test rate limiting
- [ ] Monitor `login_attempts` table
- [ ] Set up alerts for locked accounts
- [ ] Document unlock procedure for support team
- [ ] Train users on new password requirements
- [ ] Update user documentation

---

## 📞 Support

For issues or questions:

- Check troubleshooting section above
- Review `login_attempts` table for detailed logs
- Check backend logs: `tail -f /tmp/backend.log`
- Verify database migration: `SELECT * FROM login_attempts LIMIT 1;`

---

**Last Updated:** 2024
**Version:** 1.0 (Phase 1 - Security Basics)
