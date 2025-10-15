# AUTH TESTING CHECKLIST - EcoPlaza Dashboard
**Complete Testing Guide for Supabase Authentication Implementation**

---

## PRE-TESTING CHECKLIST

**Before you start testing, verify:**

- [ ] ✅ Created 3 users in Supabase Auth UI (gerencia, alonso, leo)
- [ ] ✅ All users have status "Confirmed" in Supabase Auth
- [ ] ✅ Ran SQL inserts to populate `usuarios` table
- [ ] ✅ Verified users exist in `usuarios` table with correct roles
- [ ] ✅ Verified vendedores are correctly linked (Alonso, Leo)
- [ ] ✅ Restarted Next.js dev server (`npm run dev`)
- [ ] ✅ Cleared browser cookies for localhost

---

## TEST 1: ANONYMOUS ACCESS → LOGIN REDIRECT

**Expected Behavior:** Users without session are redirected to login page

### Steps:
1. Open browser in incognito/private mode (or clear cookies)
2. Navigate to: `http://localhost:3000/`

### ✅ Pass Criteria:
- [ ] Redirected to `http://localhost:3000/login`
- [ ] Login page displays correctly
- [ ] See EcoPlaza branding (green/blue colors)
- [ ] See email and password fields
- [ ] See "Iniciar Sesión" button
- [ ] See test credentials hint at bottom (dev only)

### ❌ Fail Scenarios:
- Stays on `/` (middleware not working)
- 404 error (login page not created)
- Infinite redirect loop (auth context issue)

---

## TEST 2: LOGIN AS ADMIN

**Expected Behavior:** Admin user logs in and accesses admin dashboard

### Steps:
1. In login page, enter:
   - Email: `gerencia@ecoplaza.com`
   - Password: `1234`
2. Click **Iniciar Sesión**

### ✅ Pass Criteria:
- [ ] Redirected to `http://localhost:3000/` (admin dashboard)
- [ ] See "Dashboard EcoPlaza" in header
- [ ] See user info in top right: "gerente gerente" + "Administrador"
- [ ] See "Cerrar Sesión" button
- [ ] See all leads in table
- [ ] See stats cards (Total Leads, Completos, Incompletos, etc.)
- [ ] See pie chart
- [ ] Date range filter works
- [ ] Can click on leads to see detail panel

### ❌ Fail Scenarios:
- Invalid credentials error (SQL inserts not run)
- Stuck on login page (auth context not working)
- Redirected to `/operativo` instead of `/` (role logic broken)
- 500 error (Supabase connection issue)

---

## TEST 3: ADMIN ACCESS TO OPERATIVO

**Expected Behavior:** Admin can access operativo dashboard

### Steps:
1. While logged in as admin, navigate to: `http://localhost:3000/operativo`

### ✅ Pass Criteria:
- [ ] Access granted (no redirect)
- [ ] See "Dashboard Operativo" in header
- [ ] See user info: "gerente gerente" + "Administrador"
- [ ] See assignment filter tabs: "Todos", "Sin Asignar", "Mis Leads"
- [ ] See leads table with assignment dropdown
- [ ] Can assign leads to vendedores
- [ ] "Mis Leads" tab works (filters by admin's leads if any)

### ❌ Fail Scenarios:
- Redirected back to `/` (middleware blocking admin)
- 403 forbidden (access control too strict)

---

## TEST 4: ADMIN LOGOUT

**Expected Behavior:** Admin logs out and session is destroyed

### Steps:
1. Click **Cerrar Sesión** button in header
2. Confirm in dialog

### ✅ Pass Criteria:
- [ ] Redirected to `http://localhost:3000/login`
- [ ] Session destroyed (no user info in header)
- [ ] Try navigating to `/` → redirected back to login
- [ ] Try navigating to `/operativo` → redirected back to login

### ❌ Fail Scenarios:
- Stays logged in (signOut not working)
- User info still visible (auth context not clearing)
- Can still access protected routes (middleware not checking session)

---

## TEST 5: LOGIN AS VENDEDOR (ALONSO)

**Expected Behavior:** Vendedor logs in and accesses operativo dashboard only

### Steps:
1. Login with:
   - Email: `alonso@ecoplaza.com`
   - Password: `1234`
2. Click **Iniciar Sesión**

### ✅ Pass Criteria:
- [ ] Redirected to `http://localhost:3000/operativo`
- [ ] See "Dashboard Operativo" in header
- [ ] See user info: "Alonso Palacios" + "Vendedor"
- [ ] See assignment filter tabs
- [ ] NO vendedor selector dropdown (removed - uses auth context)
- [ ] See "Mis Leads" tab
- [ ] Click "Mis Leads" → shows only leads assigned to Alonso
- [ ] Can see leads assigned to Alonso in table
- [ ] Can assign/reassign leads

### ❌ Fail Scenarios:
- Redirected to `/` instead of `/operativo` (role redirect broken)
- Vendedor selector still visible (component not updated)
- "Mis Leads" shows all leads instead of Alonso's (auth context not working)
- vendedor_id is null (SQL insert wrong)

---

## TEST 6: VENDEDOR BLOCKED FROM ADMIN DASHBOARD

**Expected Behavior:** Vendedor cannot access admin dashboard

### Steps:
1. While logged in as Alonso, manually navigate to: `http://localhost:3000/`

### ✅ Pass Criteria:
- [ ] Redirected to `http://localhost:3000/operativo`
- [ ] Cannot access admin dashboard
- [ ] See message or just stay in operativo

### ❌ Fail Scenarios:
- Access granted to `/` (middleware not enforcing role)
- Can see admin dashboard (RBAC broken)

---

## TEST 7: LOGIN AS VENDEDOR (LEO)

**Expected Behavior:** Different vendedor logs in and sees only their leads

### Steps:
1. Logout if still logged in
2. Login with:
   - Email: `leo@ecoplaza.com`
   - Password: `1234`

### ✅ Pass Criteria:
- [ ] Redirected to `/operativo`
- [ ] See user info: "Leo D Leon" + "Vendedor"
- [ ] Click "Mis Leads" → shows only leads assigned to Leo
- [ ] Leo's leads are DIFFERENT from Alonso's leads
- [ ] Can assign/reassign leads

### ❌ Fail Scenarios:
- Shows Alonso's leads (vendedor_id wrong)
- Shows all leads (filter not working)

---

## TEST 8: INVALID CREDENTIALS

**Expected Behavior:** Login fails with appropriate error message

### Steps:
1. Logout if still logged in
2. Try logging in with:
   - Email: `invalid@example.com`
   - Password: `wrong`
3. Click **Iniciar Sesión**

### ✅ Pass Criteria:
- [ ] Error message displayed in red box
- [ ] See "Error de autenticación" title
- [ ] See error details (e.g., "Invalid credentials")
- [ ] Stay on login page (no redirect)
- [ ] Can try again with correct credentials

### ❌ Fail Scenarios:
- No error message shown (error handling broken)
- App crashes (try-catch missing)
- Redirected somewhere (should stay on login)

---

## TEST 9: SESSION PERSISTENCE

**Expected Behavior:** Session persists across page reloads and browser restarts

### Steps:
1. Login as any user
2. Refresh the page (F5)
3. Close browser tab
4. Reopen browser and navigate to dashboard

### ✅ Pass Criteria:
- [ ] After F5: Still logged in, no redirect to login
- [ ] After reopen: Still logged in (session cookie persists)
- [ ] User info still displays correctly
- [ ] Can navigate between pages without re-login

### ❌ Fail Scenarios:
- Logged out after refresh (session not persisting)
- Redirected to login after reopen (cookies not set correctly)

---

## TEST 10: ASSIGNMENT FILTERS (OPERATIVO)

**Expected Behavior:** Assignment filter tabs work correctly

### Steps:
1. Login as vendedor (Alonso or Leo)
2. Test each tab:

### Tab: "Todos"
- [ ] Shows all leads (regardless of assignment)
- [ ] Count is total leads

### Tab: "Sin Asignar"
- [ ] Shows only leads with `vendedor_asignado_id = NULL`
- [ ] No leads assigned to any vendedor

### Tab: "Mis Leads"
- [ ] Shows only leads assigned to current vendedor
- [ ] Uses `user.vendedor_id` from auth context
- [ ] Count matches leads assigned to this vendedor

### ❌ Fail Scenarios:
- Tabs don't filter (filter logic broken)
- "Mis Leads" shows all leads (vendedor_id not used)
- Tabs disabled (should be active)

---

## TEST 11: LEAD ASSIGNMENT (OPERATIVO)

**Expected Behavior:** Can assign/reassign leads to vendedores

### Steps:
1. Login as admin or vendedor
2. Find a lead in "Sin Asignar" tab
3. Click assignment dropdown in that row
4. Select a vendedor (e.g., Alonso)
5. Confirm assignment

### ✅ Pass Criteria:
- [ ] Alert shows: "Lead [nombre] asignado a [vendedor]"
- [ ] Page refreshes automatically
- [ ] Lead now appears in vendedor's "Mis Leads" tab
- [ ] Lead removed from "Sin Asignar" tab
- [ ] Assignment persisted in database

### ❌ Fail Scenarios:
- Error alert (assignment action broken)
- Lead doesn't move to "Mis Leads" (DB update failed)
- No refresh (router.refresh not called)

---

## TEST 12: LOGOUT FROM MULTIPLE PAGES

**Expected Behavior:** Logout works from both dashboards

### Steps:
1. Login as admin
2. Logout from `/` (admin dashboard)
3. Login again
4. Navigate to `/operativo`
5. Logout from `/operativo`

### ✅ Pass Criteria:
- [ ] Both logouts redirect to `/login`
- [ ] Session cleared in both cases
- [ ] Cannot access protected routes after logout

### ❌ Fail Scenarios:
- Logout fails from one page
- Different behavior between pages

---

## TEST 13: CONCURRENT SESSIONS (OPTIONAL)

**Expected Behavior:** Multiple users can be logged in simultaneously (different browsers)

### Steps:
1. Browser 1 (Chrome): Login as admin
2. Browser 2 (Firefox): Login as Alonso
3. Verify both can work independently

### ✅ Pass Criteria:
- [ ] Both sessions active
- [ ] No interference between users
- [ ] Each sees their own data correctly

---

## TEST 14: DEACTIVATED USER (OPTIONAL)

**Expected Behavior:** Deactivated user cannot login

### Steps:
1. In Supabase SQL Editor, run:
   ```sql
   UPDATE usuarios SET activo = false WHERE email = 'leo@ecoplaza.com';
   ```
2. Try logging in as Leo

### ✅ Pass Criteria:
- [ ] Login fails with error: "Usuario no autorizado o desactivado"
- [ ] Session not created
- [ ] Redirected back to login

### Cleanup:
```sql
UPDATE usuarios SET activo = true WHERE email = 'leo@ecoplaza.com';
```

---

## TROUBLESHOOTING COMMON ISSUES

### Issue: "Redirecting too many times"
**Fix:**
- Clear browser cookies
- Restart dev server
- Check middleware.ts logs
- Verify .env.local has correct Supabase keys

### Issue: "User not found in usuarios table"
**Fix:**
- Run verification query:
  ```sql
  SELECT * FROM usuarios WHERE email = 'gerencia@ecoplaza.com';
  ```
- Re-run SQL inserts if missing
- Check UUID matches auth.users

### Issue: "Middleware error"
**Fix:**
- Check terminal for error details
- Verify @supabase/ssr installed
- Verify env vars loaded

### Issue: "Mis Leads" shows all leads
**Fix:**
- Check auth context is providing vendedor_id
- Verify SQL: `SELECT vendedor_id FROM usuarios WHERE email = 'alonso@ecoplaza.com';`
- Check OperativoClient is using `user.vendedor_id`

### Issue: Login button disabled/stuck
**Fix:**
- Check browser console for errors
- Verify AuthProvider wrapped app in layout.tsx
- Check network tab for failed Supabase requests

---

## SUMMARY CHECKLIST

**Authentication Tests:**
- [ ] Test 1: Anonymous redirect ✅
- [ ] Test 2: Admin login ✅
- [ ] Test 3: Admin access operativo ✅
- [ ] Test 4: Admin logout ✅
- [ ] Test 5: Vendedor Alonso login ✅
- [ ] Test 6: Vendedor blocked from admin ✅
- [ ] Test 7: Vendedor Leo login ✅
- [ ] Test 8: Invalid credentials ✅
- [ ] Test 9: Session persistence ✅

**Operativo Dashboard Tests:**
- [ ] Test 10: Assignment filters ✅
- [ ] Test 11: Lead assignment ✅
- [ ] Test 12: Logout from both pages ✅

**Optional Advanced Tests:**
- [ ] Test 13: Concurrent sessions ✅
- [ ] Test 14: Deactivated user ✅

**Overall Status:**
- [ ] All critical tests passed (1-12)
- [ ] No errors in browser console
- [ ] No errors in terminal
- [ ] Ready for production

---

## NEXT STEPS AFTER TESTING

1. **Remove dev credentials hint** from login page (production security)
2. **Change passwords** for all users (use strong passwords)
3. **Add password reset flow** (forgot password link)
4. **Add user profile page** (change password, update name)
5. **Add admin user management** (create/edit/deactivate users)
6. **Add activity logging** (who assigned which lead, when)
7. **Add session timeout** (auto-logout after 30 min inactivity)
8. **Add 2FA** (multi-factor authentication for admin)

---

**STATUS: READY FOR TESTING** ✅

All code has been implemented. Follow this checklist to verify everything works as expected.
