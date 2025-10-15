# AUTH SETUP GUIDE - EcoPlaza Dashboard
**Complete Step-by-Step Instructions for Implementing Supabase Authentication**

---

## PHASE 1: CREATE AUTH USERS IN SUPABASE UI (MANUAL - YOU MUST DO THIS FIRST)

### Step 1: Navigate to Authentication

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **EcoPlaza AgenteIA Whatsapp**
3. Click **Authentication** in the left sidebar
4. Click **Users** tab

### Step 2: Create User 1 - Admin (gerencia@ecoplaza.com)

1. Click **Add user** or **Invite user** button (top right)
2. Select **Create new user** option
3. Fill in the form:
   - **Email**: `gerencia@ecoplaza.com`
   - **Password**: `1234`
   - **Auto Confirm User**: ✅ CHECK THIS BOX (very important!)
   - Leave other fields default
4. Click **Create user**
5. **IMPORTANT**: Copy the UUID from the new user row
   - Example UUID: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
   - Save this UUID temporarily (you'll need it for SQL inserts)

### Step 3: Create User 2 - Vendedor Alonso (alonso@ecoplaza.com)

1. Click **Add user** or **Invite user** button again
2. Select **Create new user** option
3. Fill in the form:
   - **Email**: `alonso@ecoplaza.com`
   - **Password**: `1234`
   - **Auto Confirm User**: ✅ CHECK THIS BOX
4. Click **Create user**
5. **IMPORTANT**: Copy the UUID from the new user row
   - Save this UUID temporarily

### Step 4: Create User 3 - Vendedor Leo (leo@ecoplaza.com)

1. Click **Add user** or **Invite user** button again
2. Select **Create new user** option
3. Fill in the form:
   - **Email**: `leo@ecoplaza.com`
   - **Password**: `1234`
   - **Auto Confirm User**: ✅ CHECK THIS BOX
4. Click **Create user**
5. **IMPORTANT**: Copy the UUID from the new user row
   - Save this UUID temporarily

### Step 5: Verify Users Created

You should now see 3 users in the Authentication > Users table:
- gerencia@ecoplaza.com
- alonso@ecoplaza.com
- leo@ecoplaza.com

All should have status: **Confirmed** (not "Waiting for verification")

---

## PHASE 2: LINK AUTH USERS TO USUARIOS TABLE (SQL INSERTS)

### Step 1: Navigate to SQL Editor

1. In Supabase Dashboard, click **SQL Editor** in left sidebar
2. Click **New Query**

### Step 2: Run SQL Inserts

**IMPORTANT**: Replace `<UUID_GERENCIA>`, `<UUID_ALONSO>`, `<UUID_LEO>` with the actual UUIDs you copied in Phase 1.

```sql
-- Insert Admin User (gerencia@ecoplaza.com)
INSERT INTO usuarios (id, email, nombre, rol, vendedor_id, activo)
VALUES (
  '<UUID_GERENCIA>',  -- Replace with actual UUID from auth.users
  'gerencia@ecoplaza.com',
  'gerente gerente',
  'admin',
  NULL,  -- Admins don't have vendedor_id
  true
);

-- Insert Vendedor Alonso (alonso@ecoplaza.com)
INSERT INTO usuarios (id, email, nombre, rol, vendedor_id, activo)
VALUES (
  '<UUID_ALONSO>',  -- Replace with actual UUID from auth.users
  'alonso@ecoplaza.com',
  'Alonso Palacios',
  'vendedor',
  '2b8dc336-3755-4097-8f6a-090b48719aaa',  -- Alonso's vendedor_id from vendedores table
  true
);

-- Insert Vendedor Leo (leo@ecoplaza.com)
INSERT INTO usuarios (id, email, nombre, rol, vendedor_id, activo)
VALUES (
  '<UUID_LEO>',  -- Replace with actual UUID from auth.users
  'leo@ecoplaza.com',
  'Leo D Leon',
  'vendedor',
  '9d367391-e382-4314-bdc7-e5f882f6549d',  -- Leo's vendedor_id from vendedores table
  true
);
```

### Step 3: Execute Query

1. Click **Run** button (or press Ctrl+Enter / Cmd+Enter)
2. Verify success message: "Success. No rows returned"
3. If you see error "duplicate key value violates unique constraint", it means users already exist (this is OK)

### Step 4: Verify Data

Run this query to verify all users are correctly linked:

```sql
SELECT
  u.id,
  u.email,
  u.nombre,
  u.rol,
  u.vendedor_id,
  v.nombre AS vendedor_nombre,
  u.activo
FROM usuarios u
LEFT JOIN vendedores v ON u.vendedor_id = v.id
ORDER BY u.rol, u.email;
```

**Expected Result:**
```
| id (UUID)       | email                   | nombre           | rol      | vendedor_id (UUID) | vendedor_nombre  | activo |
|-----------------|-------------------------|------------------|----------|-------------------|------------------|--------|
| <UUID_GERENCIA> | gerencia@ecoplaza.com   | gerente gerente  | admin    | NULL              | NULL             | true   |
| <UUID_ALONSO>   | alonso@ecoplaza.com     | Alonso Palacios  | vendedor | 2b8dc336-...      | Alonso Palacios  | true   |
| <UUID_LEO>      | leo@ecoplaza.com        | Leo D Leon       | vendedor | 9d367391-...      | Leo D Leon       | true   |
```

---

## PHASE 3: IMPORT NEW CODE FILES (AUTOMATED - ALREADY DONE)

The following files have been created by the dashboard implementation:

1. `lib/auth-context.tsx` - Auth Context Provider
2. `app/login/page.tsx` - Login page
3. `middleware.ts` - Route protection
4. Updated: `app/layout.tsx` - Wrapped with AuthProvider
5. Updated: `app/page.tsx` - Added logout button
6. Updated: `app/operativo/page.tsx` - Added logout button
7. Updated: `components/dashboard/OperativoClient.tsx` - Uses auth context

---

## PHASE 4: TESTING THE AUTHENTICATION SYSTEM

### Test 1: Anonymous Access (Should Redirect to Login)

1. Open browser in incognito/private mode
2. Navigate to: `http://localhost:3000/`
3. **Expected**: Redirected to `http://localhost:3000/login`
4. **Expected**: Login page displays (EcoPlaza branding, email/password form)

### Test 2: Login as Admin

1. In login page, enter:
   - Email: `gerencia@ecoplaza.com`
   - Password: `1234`
2. Click **Iniciar Sesión**
3. **Expected**: Redirected to `http://localhost:3000/` (admin dashboard)
4. **Expected**: See "Hola, gerente gerente" in header
5. **Expected**: See logout button in header

### Test 3: Admin Can Access Both Dashboards

1. While logged in as admin, navigate to: `http://localhost:3000/operativo`
2. **Expected**: Access granted (admins can access everything)
3. **Expected**: See operativo dashboard with assignment filters
4. Navigate back to: `http://localhost:3000/`
5. **Expected**: Access granted

### Test 4: Logout as Admin

1. Click **Cerrar Sesión** button in header
2. **Expected**: Redirected to `http://localhost:3000/login`
3. **Expected**: Session destroyed
4. Try navigating to `http://localhost:3000/`
5. **Expected**: Redirected back to login

### Test 5: Login as Vendedor Alonso

1. In login page, enter:
   - Email: `alonso@ecoplaza.com`
   - Password: `1234`
2. Click **Iniciar Sesión**
3. **Expected**: Redirected to `http://localhost:3000/operativo`
4. **Expected**: See "Hola, Alonso Palacios" in header
5. **Expected**: Vendedor selector REMOVED (no longer visible)
6. **Expected**: "Mis Leads" tab shows only leads assigned to Alonso

### Test 6: Vendedor Cannot Access Admin Dashboard

1. While logged in as Alonso, try navigating to: `http://localhost:3000/`
2. **Expected**: Redirected to `http://localhost:3000/operativo`
3. **Expected**: See message or just stay in operativo (middleware blocks access)

### Test 7: Login as Vendedor Leo

1. Logout (if still logged in)
2. Login with:
   - Email: `leo@ecoplaza.com`
   - Password: `1234`
3. **Expected**: Redirected to `http://localhost:3000/operativo`
4. **Expected**: See "Hola, Leo D Leon" in header
5. **Expected**: "Mis Leads" tab shows only leads assigned to Leo

### Test 8: Invalid Credentials

1. Logout (if still logged in)
2. Try logging in with:
   - Email: `invalid@example.com`
   - Password: `wrong`
3. **Expected**: Error message displayed
4. **Expected**: Stay on login page (no redirect)

### Test 9: Session Persistence

1. Login as any user
2. Refresh the page (F5)
3. **Expected**: Still logged in (session persists)
4. **Expected**: No redirect to login
5. Close browser tab, reopen, navigate to dashboard
6. **Expected**: Still logged in (session cookie persists)

---

## TROUBLESHOOTING

### Issue 1: "Redirecting too many times" or "Redirect loop"

**Cause**: Middleware or auth context has issue detecting session

**Solution**:
1. Clear browser cookies for localhost
2. Restart Next.js dev server
3. Check middleware.ts logs in terminal
4. Verify Supabase URL and keys in .env.local

### Issue 2: "Invalid credentials" when using correct password

**Cause**: User not confirmed in Supabase Auth

**Solution**:
1. Go to Authentication > Users in Supabase
2. Check user status is "Confirmed" (not "Waiting for verification")
3. If not confirmed, delete user and recreate with "Auto Confirm User" checked

### Issue 3: "User not found in usuarios table"

**Cause**: SQL inserts not executed or wrong UUID used

**Solution**:
1. Go to SQL Editor
2. Run verification query (see Phase 2, Step 4)
3. Check if user exists in `usuarios` table
4. Re-run INSERT statements if missing

### Issue 4: Vendedor sees all leads instead of only "Mis Leads"

**Cause**: vendedor_id not correctly linked

**Solution**:
1. Check usuarios.vendedor_id matches vendedores.id
2. Run verification query:
   ```sql
   SELECT u.email, u.vendedor_id, v.nombre
   FROM usuarios u
   LEFT JOIN vendedores v ON u.vendedor_id = v.id
   WHERE u.rol = 'vendedor';
   ```
3. Verify vendedor_id UUIDs are correct

### Issue 5: "Middleware error" in terminal

**Cause**: Supabase client not initialized correctly in middleware

**Solution**:
1. Check .env.local has correct NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
2. Restart dev server
3. Check middleware.ts imports are correct

---

## SECURITY NOTES

1. **PASSWORDS**: All users have password "1234" for testing. CHANGE THESE IN PRODUCTION.
2. **SESSION COOKIES**: Stored in browser, httpOnly, secure (in production)
3. **ROLES**: Stored in `usuarios` table, verified server-side in middleware
4. **VENDEDOR_ID**: Used for "Mis Leads" filter, verified server-side
5. **ANON KEY**: Public key, safe to expose in client-side code
6. **SERVICE ROLE KEY**: NEVER use in client-side code (not used in this implementation)

---

## NEXT STEPS (OPTIONAL ENHANCEMENTS)

1. **Password Reset Flow**: Add "Forgot Password?" link in login page
2. **User Profile Page**: Allow users to update their name, change password
3. **Admin User Management**: Page to create/edit/deactivate users
4. **Activity Logging**: Track who assigned which lead (audit trail)
5. **Multi-factor Authentication**: Add SMS or authenticator app 2FA
6. **Session Timeout**: Auto-logout after 30 minutes of inactivity

---

## SUMMARY CHECKLIST

**Phase 1: Create Auth Users (MANUAL)**
- [ ] Created gerencia@ecoplaza.com in Supabase Auth UI
- [ ] Created alonso@ecoplaza.com in Supabase Auth UI
- [ ] Created leo@ecoplaza.com in Supabase Auth UI
- [ ] All users have status "Confirmed"
- [ ] Copied all 3 UUIDs for SQL inserts

**Phase 2: Link to usuarios Table (SQL)**
- [ ] Ran SQL INSERT for gerencia@ecoplaza.com
- [ ] Ran SQL INSERT for alonso@ecoplaza.com
- [ ] Ran SQL INSERT for leo@ecoplaza.com
- [ ] Verified all 3 users in usuarios table with correct roles
- [ ] Verified vendedores are correctly linked (Alonso, Leo)

**Phase 3: Code Implementation (AUTOMATED)**
- [ ] All new files created (auth-context.tsx, login/page.tsx, middleware.ts)
- [ ] All files updated (layout.tsx, page.tsx, operativo/page.tsx, OperativoClient.tsx)
- [ ] Next.js dev server restarted

**Phase 4: Testing (MANUAL)**
- [ ] Test 1: Anonymous redirect to login ✅
- [ ] Test 2: Admin login successful ✅
- [ ] Test 3: Admin can access both dashboards ✅
- [ ] Test 4: Logout works ✅
- [ ] Test 5: Vendedor Alonso login ✅
- [ ] Test 6: Vendedor blocked from admin dashboard ✅
- [ ] Test 7: Vendedor Leo login ✅
- [ ] Test 8: Invalid credentials rejected ✅
- [ ] Test 9: Session persists across refreshes ✅

**Status: READY FOR IMPLEMENTATION** ✅
