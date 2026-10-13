# 📋 Phase -1: Initial Codebase Audit & 2026 Readiness Report
> **Divine Energy Hub — Event Management System**  
> *Baseline security, architecture, and bug review prior to 2026 modernization.*

---

## 🚨 CRITICAL — Security Vulnerabilities

### 1. Secrets Committed to Repository
**Files:** [`.env`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/.env), [`serviceAccountKey.json`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/serviceAccountKey.json), [`firebase.js`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/firebase.js)

Even though `.gitignore` lists these files, they are **present in the repo** — meaning they were committed before the ignore rules were added. The following are exposed:

| Secret | Location |
|---|---|
| Firebase API key, App ID | `firebase.js` (hardcoded) |
| Firebase private key | `serviceAccountKey.json` |
| SMTP email + App Password | `.env` (line 9-10) |
| Firebase service account full credentials | `serviceAccountKey.json` |

**Fix:** Rotate ALL keys immediately. Use environment variables for `firebase.js` config. Remove committed secrets from git history using `git filter-branch` or BFG Repo Cleaner (you already have `bfg.jar` in the repo).

---

### 2. Plaintext Password Storage & Email
**Files:** [`loginFirestore.js`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/api/loginFirestore.js#L46-L51), [`registerFirestore.js`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/api/registerFirestore.js#L45-L67)

```diff
- // loginFirestore.js L51: plaintext comparison
- if (user.password !== password) return ...
+ // Should use bcrypt.compare(password, user.hashedPassword)

- // loginFirestore.js L46: sends plaintext password via email
- html: `...Password: ${user.password}`
+ // NEVER send passwords via email. Use a password reset link instead.

- // registerFirestore.js L45: stored as plaintext in Firestore
- password,
+ // Should hash: const hashed = await bcrypt.hash(password, 12)
```

**Impact:** Anyone with Firestore read access can see all user passwords. The "forgot password" flow emails passwords in cleartext.

---

### 3. No Authentication/Authorization on Backend API
**File:** [`app.py`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/backend/app.py)

All Flask endpoints (`/api/prasad/update`, `/api/prasad/entry`, `/api/users`, `/api/stats`, `/api/update-sheet`) are completely unauthenticated. Anyone who knows the API URL can:
- Mark any guest's entry/prasad status
- Create fake guests
- View all event statistics
- Trigger Google Sheets sync

**Fix:** Add JWT or API key authentication middleware.

---

### 4. Frontend Auth is Purely Client-Side
**File:** [`App.jsx`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/App.jsx#L17-L36)

```javascript
// Auth is just a localStorage flag — trivially bypassable
const [isAuth, setIsAuth] = useState(() => !!localStorage.getItem("isAuth"));
```

Anyone can open DevTools, run `localStorage.setItem("isAuth", "true")`, and access every protected route. There is no server-side session validation.

---

## 🔴 HIGH — Functional Bugs

### 5. Prasad Type Mismatch — "Prasad1" vs "prasad1"
**File:** [`Homepage.jsx`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/components/Homepage/Homepage.jsx#L69-L71)

```javascript
// Line 70: converts "scanPrasad1" → "prasad1" (lowercase "p")
setPrasadType(action.replace('scan', '').toLowerCase());
// Result: "prasad1" ✓ — this is correct for the backend field

// BUT in QrScanner.jsx the prasadType is passed directly to the Mongo field name
// and in the backend prasad_field_map (mongo_utils.py L70-73) it expects "prasad1"
// This works, but the display in QrScanner.jsx L186 shows lowercase:
//   {prasadType} already given → "prasad1 already given"
```

**Cosmetic but confusing:** The display should capitalize: "Prasad 1 already given"

---

### 6. `withStore` Returns Request Object, Not Result Value
**File:** [`guestCache.js`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/utils/guestCache.js#L30-L39)

```javascript
// Line 35-36: fn(store) returns an IDBRequest, tx.oncomplete resolves to it
const result = fn(store);            // This is the IDBRequest object
tx.oncomplete = () => resolve(result); // Resolves with the *request*, not the *value*
```

For `store.put()` this works by accident (the caller doesn't use the return value), but this pattern is subtly broken for any future `store.get()` usage through `withStore`. The `getCachedGuest` function works because it bypasses `withStore` entirely.

---

### 7. `TokenFinder` Crashes on Null `userData` Fields
**File:** [`TokenFinder.jsx`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/components/TokenFinder.jsx#L137-L231)

```javascript
// Lines 147, 157, 167, 177, 187, 197, 207, 217, 227 — all crash if field is undefined
value={userData.name.firstName}    // TypeError if name is undefined
value={userData.name.middleName}   // same
value={userData.gender}            // renders "undefined" in input
value={userData.age}               // same
value={userData.email}             // same
value={userData.alternatePhoneNumber} // same
```

**Fix:** Add optional chaining and fallbacks: `value={userData?.name?.firstName || ""}`

---

### 8. `TokenFinder` Photo URL Construction is Broken
**File:** [`TokenFinder.jsx`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/components/TokenFinder.jsx#L82-L84)

```javascript
const getPhotoUrl = (photoUrl) => {
  return `${API_BASE_URL}/${photoUrl}`;
};
```

The backend returns `photoUrl` as a Mongo field value (either an empty string or a Firebase Storage path). Prepending `API_BASE_URL` creates an invalid URL like `https://divine-backend.../images/token_First_Last_face.jpg`. This should use the Firebase Storage `getDownloadURL` utility or the value directly if it's already a full URL.

---

### 9. Invalid HTML Input Types
**File:** [`TokenFinder.jsx`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/components/TokenFinder.jsx#L101-L115)

```html
<!-- "firstName" and "phoneNumber" are NOT valid HTML input types -->
<input type="firstName" ... />
<input type="phoneNumber" ... />
```

These fall back to `type="text"` in browsers, but cause validation warnings and break accessibility.

**Fix:** Change to `type="text"` and `type="tel"` respectively.

---

### 10. `NewEntryForm` — `handleSubmit` References `formData` Before Definition
**File:** [`NewEntryForm.jsx`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/components/Homepage/NewEntryForm.jsx#L12-L63)

```javascript
// handleSubmit is defined at line 12
// formData + setFormData is defined at line 63
const handleSubmit = async (e) => {
  // ... uses formData (line 16-27) and setFormData (line 42)
};
// ...
const [formData, setFormData] = useState(initialState); // line 63
```

This works due to JavaScript hoisting of `useState` (it's a `const` but in the same scope), but it's brittle and confusing. The `initialState` object is also defined *after* `handleSubmit` that references `setFormData(initialState)`.

---

### 11. `datetime.utcnow()` is Deprecated in Python 3.12+
**Files:** [`app.py`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/backend/app.py#L38), [`mongo_utils.py`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/backend/mongo_utils.py#L78-L151)

```diff
- datetime.utcnow()  # deprecated since Python 3.12, removed in 3.14
+ datetime.now(datetime.timezone.utc)
```

Used 8+ times across backend files. Will break when upgrading Python.

---

### 12. Camera Stream Memory Leak in `PhotoUploader`
**File:** [`PhotoUploader.jsx`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/components/PhotoUploader.jsx#L91-L96)

```javascript
// Cleanup references videoRef.current inside a closure
return () => {
  if (videoRef.current && videoRef.current.srcObject) { // stale ref possible
    const tracks = videoRef.current.srcObject.getTracks();
    tracks.forEach(track => track.stop());
  }
};
```

The React strict mode warning: accessing `videoRef.current` in cleanup is unreliable — the ref may have already changed. Should capture `videoRef.current` at the top of the effect.

---

## 🟡 MEDIUM — Code Quality & Reliability Issues

### 13. `startOnlineFlush` Called Multiple Times Without Cleanup
**Files:** [`App.jsx`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/App.jsx#L29) + [`EntryGate.jsx`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/components/EntryGate.jsx#L21) + [`QrScanner.jsx`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/components/QrScanner.jsx#L22)

```javascript
// App.jsx L29 — returns cleanup but it's properly assigned
useEffect(() => startOnlineFlush(apiFetch), []);

// EntryGate.jsx L21 — same
useEffect(() => startOnlineFlush(apiFetch), []);

// QrScanner.jsx L22 — same
useEffect(() => startOnlineFlush(apiFetch), []);
```

Three `setInterval` timers + three `online` event listeners are registered when all three components mount. Each runs `flushQueue` every 10s — meaning 3 concurrent flush loops.

**Fix:** Only call `startOnlineFlush` once in the top-level `AuthProvider`.

---

### 14. `react-qr-scanner` Deprecation
**File:** [`package.json`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/package.json#L13)

`react-qr-scanner@1.0.0-alpha.11` is an **alpha** package that hasn't been maintained. It has known issues:
- Memory leaks with camera streams
- No support for React 18's concurrent features
- Breaks on iOS Safari 17+

**Fix for 2026:** Migrate to `@yudiel/react-qr-scanner` or `html5-qrcode`.

---

### 15. Empty `background-image` in CSS
**File:** [`index.css`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/index.css#L94-L97)

```css
.img {
  background-image: url("");  /* Empty URL — triggers a broken HTTP request */
  background-size: 350%;
}
```

An empty `url("")` causes the browser to make a request to the current page URL, wasting bandwidth.

---

### 16. Unused Imports
**File:** [`TokenFinder.jsx`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/components/TokenFinder.jsx#L1)

```javascript
import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
// useMemo, Suspense, lazy are never used
```

---

### 17. No `key` prop stability — Using Array Index
**File:** [`Homepage.jsx`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/components/Homepage/Homepage.jsx#L90)

```javascript
{dashboardButtons.flat().map((button, index) => (
  <button key={index} ...>
```

Since this array is static, index keys work here but it's a bad pattern if the list ever becomes dynamic.

---

### 18. Missing 404/Catch-All Route
**File:** [`App.jsx`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/App.jsx#L60-L98)

No `<Route path="*" ... />` for unmatched URLs — users see a blank page instead of a proper error.

---

### 19. `firebase.js` Hardcodes Config Instead of Using Env Vars
**File:** [`firebase.js`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/firebase.js#L11-L19)

The `.env` file has `REACT_APP_FIREBASE_*` variables, but `firebase.js` hardcodes everything. This means the env vars are completely ignored.

```diff
  const firebaseConfig = {
-   apiKey: "AIzaSyDUqMSyMk6sD9qWaK9xaZrG-uL2A4kImQA",
+   apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    // ... same for all other fields
  };
```

---

### 20. `analytics` Unused Export
**File:** [`firebase.js`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/firebase.js#L23)

`getAnalytics(app)` is called and exported but **never imported** by any component. It also crashes in non-browser environments (SSR, tests).

---

## 🟢 LOW — Minor Issues & Improvements for 2026

### 21. Version String Still Says 2026.1.0
**File:** [`package.json`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/package.json#L3)

Already updated — good. But the backend health endpoint ([`app.py` L39](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/backend/app.py#L39)) also says `"version": "2026.1.0"`. Ensure these stay in sync.

---

### 22. IndexedDB Database Named `divine_event_2026`
**File:** [`guestCache.js`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/utils/guestCache.js#L8)

```javascript
const DB_NAME = "divine_event_2026";
```

If redeployed for a 2026 event without changing this, old cached guest data from the 2025/2026 event will pollute the new event. Consider using `divine_event_2026` or an event-specific name, and add a migration/wipe strategy.

---

### 23. CORS Allows Hardcoded Vercel URL
**File:** [`app.py`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/backend/app.py#L20)

```python
"http://localhost:3000,https://final-event-mangement-app.vercel.app"
```

If the Vercel deployment URL changes for 2026, this will break. Make sure to update via `CORS_ORIGINS` env var.

---

### 24. `Suspense` and `lazy` Imported But Never Used
**File:** [`TokenFinder.jsx`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/components/TokenFinder.jsx#L1)

`ErrorBoundary` class component is defined but also never used in the component tree.

---

### 25. `form.role` is Hardcoded but Stored in State
**File:** [`Register.jsx`](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/src/pages/Register.jsx#L11-L35)

```javascript
role: 'volunteer'  // in state
// but always sends:
role: 'volunteer'  // hardcoded in POST body
```

The `role` in state is dead code.

---

### 26. No Loading/Error Boundary at App Level
The app has no top-level error boundary. An unhandled error in any component will white-screen the entire app — critical for event day.

---

## 📋 Summary — Action Items for 2026

| Priority | Count | Status |
|----------|-------|--------|
| 🚨 Critical (Security) | 4 | **Must fix before deployment** |
| 🔴 High (Functional) | 8 | **Should fix** |
| 🟡 Medium (Quality) | 8 | **Recommended** |
| 🟢 Low (Cleanup) | 6 | **Nice to have** |

### Top 5 Actions Before 2026 Event:
1. **Rotate all exposed credentials** (Firebase, SMTP, service account)
2. **Hash passwords** with bcrypt in `loginFirestore.js` / `registerFirestore.js`
3. **Add API authentication** to Flask backend
4. **Fix `TokenFinder` crashes** (null safety on `userData` fields)
5. **Replace deprecated `react-qr-scanner`** with a maintained package
6. **Fix `datetime.utcnow()` deprecation** in Python backend

> [!CAUTION]
> The `serviceAccountKey.json` and `.env` with SMTP credentials are committed to git. Even if deleted now, they remain in git history. **Rotate these credentials immediately.**
