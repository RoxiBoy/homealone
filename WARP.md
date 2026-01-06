# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview

This repo contains:
- `HomeAlone/`: **current** React Native app, bootstrapped with `@react-native-community/cli`, using Tamagui for UI.
- `server/`: Node.js + Express + MongoDB backend (`homealone-server`).
- `MyNewApp/`: legacy React Native app. Treat this as deprecated – **do not edit or wire new features into it** unless the user explicitly asks. You may look at it only for reference if needed (it contains an older implementation of check-ins, notifications, and background tasks).

All new frontend work should target `HomeAlone/` and integrate with `server/` APIs.

## Common commands

Run the following from the relevant subdirectory.

### Frontend: `HomeAlone/`

From `HomeAlone/`:

- Install dependencies:
  - `npm install`
- Start Metro bundler:
  - `npm start`
- Run on Android emulator/device:
  - `npm run android`
- Run on iOS simulator:
  - `npm run ios`
- Run Jest tests:
  - `npm test`
- Run a single Jest test file (example):
  - `npm test -- __tests__/App.test.tsx`
- Lint:
  - `npm run lint`

### Backend: `server/`

From `server/`:

- Install dependencies:
  - `npm install`
- Start API server in dev mode (with `nodemon`):
  - `npm run dev`
- Start API server normally:
  - `npm start`

The server expects MongoDB and environment variables (e.g. `MONGODB_URI`, `JWT_SECRET`, mail/notification settings) defined in a `.env` file, loaded via `dotenv`.

## Backend architecture (`server/`)

**Entry & app wiring**
- `server/server.js`: connects to MongoDB via `mongoose` using `MONGODB_URI` and starts listening on `PORT`.
- `server/app.js`: builds the Express app, applies middleware (`helmet`, `cors`, `morgan`, `express.json()`), mounts routes, and adds a final error handler.

**Route layout** (all prefixed with `/api`):
- `/api/auth` → `routes/authRoutes.js` → `controllers/authController.js`
  - `POST /register`: create a new user.
  - `POST /login`: authenticate a user and return a JWT plus basic profile data.
- `/api/users` → `routes/userRoutes.js` → `controllers/userController.js`
  - Protected by `middleware/auth.js` (JWT required).
  - `GET /profile`: return the logged-in user (minus password).
  - `PUT /profile`: update profile (`name`, `email`, `phone`, `age`, and any future settings such as check-in interval).
  - `POST /check-in`: update `lastCheckIn` (to given `timestamp` or now) and reset `checkInStatus` to `'ok'`.
  - `POST /check-in-status`: set `checkInStatus` (e.g. `'pending'` or `'emergency'`) and optionally update `lastCheckIn`.
- `/api/friends` → `routes/friendRoutes.js` → `controllers/friendController.js`
  - Protected by `middleware/auth.js`.
  - CRUD for trusted contacts / “friends”, with a numeric `priority` (1 = highest).
- `/api/emergency-contact` → `routes/emergencyContactRoutes.js`
  - Management for additional emergency-contact information.
- `/api/reminders` → `routes/reminderRoutes.js` → `controllers/reminderController.js`
  - Protected by `middleware/auth.js`.
  - CRUD for reminders (e.g. medicine, checkups) stored in `models/Reminder.js`.
- `/api/tips` → `routes/tipRoutes.js` → `controllers/tipController.js`
  - Tips/education content.

**Auth & security**
- `middleware/auth.js`:
  - Expects an `Authorization: Bearer <JWT>` header.
  - Verifies JWT using `JWT_SECRET` (falls back to a default if unset) and attaches `req.userId`.
- `controllers/authController.js`:
  - `register`: validates uniqueness of `username` / `email` and creates a new `User`.
  - `login`: validates password via `User.comparePassword` and issues a JWT with `id`, `username`, `name`, `email` and a 7‑day expiry.

**Core models relevant to the safety flow**
- `models/User.js`:
  - Identity: `username`, `password` (bcrypt-hashed), `name`, `email`, `phone`, `age`.
  - Safety state: `lastCheckIn` (Date, default now), `checkInStatus` enum: `'ok' | 'pending' | 'emergency'`.
  - `pre('save')` hook hashes passwords; `comparePassword` validates candidate passwords.
- `models/Friend.js`:
  - Emergency/trusted contacts: `user` (owner), `name`, `phone`, optional `email`/`relationship`, `priority` (1–3 with 1 highest).
- `models/Reminder.js`:
  - User reminders: `title`, `type` (`'Medicine' | 'Checkup'`), `time`, optional `date`, notes, etc.

**Server-side emergency policy**
- `userController.updateCheckInStatus`:
  - Persists `checkInStatus` (and optionally `lastCheckIn`).
  - If `status === 'emergency'`, it looks up the user’s highest‑priority friend (`priority: 1`) and logs that they would be contacted (this is the hook for a real SMS/voice integration, e.g. Twilio).

When adding backend features:
- Keep business logic in controllers and data shape in Mongoose models; route files should stay thin.
- Add any new per-user safety settings (e.g. `checkInIntervalMinutes`) to `User` or a dedicated settings schema and expose them via `/api/users`.
- Plug any external notification providers into `updateCheckInStatus('emergency')` so there is a single emergency entry point.

## Frontend architecture & goals (`HomeAlone/`)

At the moment, `HomeAlone/` is a minimal Tamagui-based shell that should evolve into the full client for:
- Authentication (signup/login/logout, profile).
- Check-in / “Are you okay?” safety loop.
- Managing emergency contacts and reminders, backed by the `/server` APIs.

**Entry & bootstrapping**
- `HomeAlone/index.js`:
  - Standard React Native entry point; registers `App` from `./App` via `AppRegistry.registerComponent`.

**Root component & UI system**
- `HomeAlone/App.tsx`:
  - Wraps the app in `SafeAreaProvider`.
  - Initializes Tamagui with `TamaguiProvider` using `tamagui.config.ts`.
  - Currently renders a simple `SafeAreaView` with a Tamagui `View` and `Text` placeholder.
- `tamagui.config.ts`:
  - Defines Tamagui tokens/themes. Use Tamagui primitives (`View`, `Text`, etc.) and theming for layout and visual consistency.

**Testing**
- `HomeAlone/jest.config.js` sets `preset: 'react-native'`.
- `HomeAlone/__tests__/App.test.tsx` renders `<App />` with `react-test-renderer`.

As the app grows, you should introduce a `src/` structure (e.g. `src/screens`, `src/contexts`, `src/services/api`) and keep `App.tsx` focused on wiring providers and navigation.

## Auth & API integration (frontend ↔ backend)

When implementing authentication and basic app flows in `HomeAlone/`:

- **API base URL**
  - Centralize the backend URL (e.g. `http://<your-host>:<port>/api`) in a single module (e.g. `src/config/api.ts`), and use it for all requests.

- **Signup**
  - Call `POST /api/auth/register` with the fields expected by the backend (`username`, `password`, `name`, `email`, `phone`, `age`).
  - On success, gracefully redirect to the login screen; the register endpoint does not currently return a JWT.

- **Login**
  - Call `POST /api/auth/login` with `username` and `password`.
  - Persist the returned `token` (JWT) securely on the device (e.g. `AsyncStorage` or a more secure storage if introduced later).
  - Store the returned user object (id, name, email, phone, age) in an auth context/provider.
  - Attach `Authorization: Bearer <token>` to **all** requests to protected routes (`/api/users`, `/api/friends`, `/api/emergency-contact`, `/api/reminders`, `/api/tips`).

- **Protected data & profile**
  - After login, fetch `GET /api/users/profile` to hydrate user state (including any future settings like check-in interval) and keep the frontend in sync with the backend.
  - Use `PUT /api/users/profile` to update profile details and settings.

- **Logout**
  - Clear the stored JWT and user state; ensure no `Authorization` header is sent afterwards.

A natural structure on the frontend is to add:
- `AuthContext` in `HomeAlone/src/contexts/AuthContext.tsx` to own `user`, `token`, and methods `login`, `register`, `logout` and attach auth headers for API calls.
- `api` helpers in `HomeAlone/src/services/api.ts` that wrap `fetch`/`axios` with the base URL and JWT header.

## Core "Are you okay?" safety loop – recommended implementation

The product requirement:
- After a user-defined interval, the app should ask **“Are you okay?”**.
- If the user taps **“I’m okay”**, the timer resets and their status is stored as OK.
- If the user taps **“No”**, an emergency protocol should start, contacting the user’s configured emergency contact.

This should be implemented jointly by the frontend and backend:

### Backend responsibilities

- **Persist check-in state and status**
  - Use `POST /api/users/check-in` to update `lastCheckIn` and set `checkInStatus: 'ok'`.
  - Use `POST /api/users/check-in-status` with `{ status: 'emergency' }` when the user is *not* okay.
  - Consider adding a field like `checkInIntervalMinutes` to the `User` schema so the backend can store the user’s preferred interval (and return it via `/api/users/profile`).

- **Emergency escalation**
  - Keep the escalation logic in `userController.updateCheckInStatus`:
    - When `status === 'emergency'`, look up the highest‑priority `Friend` record.
    - Trigger any real-world notification (SMS/voice) integrations here.

### Frontend responsibilities (in `HomeAlone/`)

- **Check-in settings & state**
  - Create a `CheckInContext` (e.g. `HomeAlone/src/contexts/CheckInContext.tsx`) that:
    - Stores `checkInIntervalMinutes`, `lastCheckIn`, and `status` (`'ok' | 'pending' | 'emergency'`).
    - Persists `lastCheckIn` (and optionally interval) with `AsyncStorage`.
    - On mount, fetches the profile from `/api/users/profile` to initialize settings/state.

- **Mapping UI actions to backend**
  - When the user taps **“I’m okay”**:
    - Call `POST /api/users/check-in`.
    - Set local `status` to `'ok'`, update `lastCheckIn` to now, and reset the timer / cancel any pending emergency notifications.
  - When the user taps **“No”**:
    - Call `POST /api/users/check-in-status` with `{ status: 'emergency' }`.
    - Look up the cached highest‑priority friend from `/api/friends` and immediately initiate a phone call using a native module (see below).

- **Emergency call**
  - Add a phone call library to `HomeAlone/package.json` (e.g. `react-native-phone-call` or similar).
  - On “No”, after confirming with the user, invoke the library to place a call to the emergency contact’s `phone` field.

- **Timer + prompt UI**
  - While the app is foregrounded:
    - Use JS timers based on `checkInIntervalMinutes` and `lastCheckIn`.
    - When the threshold is reached, show a full‑screen/modal **“Are you okay?”** component with **“I’m okay”** / **“No”** buttons wired to the actions above.
  - For background behavior:
    - Integrate a local-notification and background-task stack (e.g. `notifee` + `react-native-background-fetch`) *in the `HomeAlone` app*.
    - On background fetch, read `lastCheckIn` and `checkInIntervalMinutes` from storage; if overdue, schedule a notification prompting the user to open the app and respond.
    - Ensure notifications are re-scheduled or canceled whenever the user checks in or an emergency is triggered.

This design keeps:
- The **backend** as the source of truth for last check-in, status, and emergency escalation.
- The **frontend** responsible for user experience (timers, prompts, calls) and for honoring the backend’s REST API contract.

## Guidance for future agents

- Focus all new frontend work in `HomeAlone/` and all new API logic in `server/`; do not add new behavior to `MyNewApp/`.
- When adding UI features, always cross-check the available endpoints under `server/routes` / `server/controllers` and reuse them rather than inventing new ad-hoc paths.
- For auth and safety features, prefer:
  - A single `AuthContext` managing JWT + user profile and wiring headers.
  - A single `CheckInContext` managing timers, prompts, and calls, backed by `/api/users/check-in` and `/api/users/check-in-status`.
  - Emergency integration attached to `updateCheckInStatus('emergency')` on the server side.
