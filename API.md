# API Documentation

This backend exposes JSON API endpoints under `/api/*`.

## Base URL

- Local backend: `http://localhost:3000`

## Auth Model

- Authentication uses server sessions (`express-session`).
- After successful login, the backend sets the `connect.sid` cookie.
- Include this cookie in subsequent requests.

## Roles

- `admin`: full access, including inventory/user/report management.
- regular user: can view dashboard and return assigned components.

## Common Error Responses

- `401` `{ "message": "Not authenticated" }`
- `403` `{ "message": "Forbidden" }`
- `500` `{ "message": "Server error" }` or `{ "message": "DB error" }`

---

## Auth Endpoints

### POST /api/auth/login

Authenticate user and create session.

- Auth required: no
- Body:

```json
{
  "username": "admin",
  "password": "secret"
}
```

- Success `200`:

```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

- Errors:
  - `401` invalid credentials
  - `500` DB error

### GET /api/auth/me

Get currently authenticated user from session.

- Auth required: yes
- Success `200`:

```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

### POST /api/auth/logout

Destroy session and clear session cookie.

- Auth required: no (works best when logged in)
- Success `200`:

```json
{
  "message": "Logged out"
}
```

---

## Dashboard

### GET /api/dashboard

Returns current user dashboard data.

- Auth required: yes
- Success `200`:

```json
{
  "user": { "id": 2, "username": "tech", "role": "user" },
  "items": [
    {
      "id": 7,
      "name": "Arduino Uno",
      "type": "board",
      "serial": "A-001",
      "status": "призначене",
      "description": "Demo board"
    }
  ],
  "users": [
    { "id": 1, "username": "admin", "role": "admin" },
    { "id": 2, "username": "tech", "role": "user" }
  ],
  "assignedEquipmentIds": [7],
  "assignmentByEquipmentId": { "7": "tech" },
  "warehouseReport": null
}
```

Notes:

- For `admin`, `items` contains all components and `warehouseReport` is populated.
- For regular user, `items` contains only currently assigned components and `warehouseReport` is `null`.

---

## Components

### POST /api/components/add

Create a component.

- Auth required: admin
- Body:

```json
{
  "name": "Arduino Uno",
  "type": "board",
  "serial": "A-001",
  "description": "Demo board",
  "status": "вільне"
}
```

- Success `200`: `{ "message": "Component added" }`

### POST /api/components/update

Update component fields.

- Auth required: admin
- Body:

```json
{
  "id": 7,
  "name": "Arduino Uno",
  "type": "board",
  "serial": "A-001",
  "description": "Updated",
  "status": "вільне"
}
```

- Success `200`: `{ "message": "Component updated" }`
- Error `400`: if `status` is `призначене` (must assign via assignment API)

### POST /api/components/fix

Mark component as fixed (`вільне`).

- Auth required: admin
- Body:

```json
{
  "id": 7
}
```

- Success `200`: `{ "message": "Component fixed" }`

### POST /api/components/remove

Delete a component.

- Auth required: admin
- Body:

```json
{
  "id": 7
}
```

- Success `200`: `{ "message": "Component removed" }`

---

## Assignments

### POST /api/assignments/assign

Assign component to user and set component status to `призначене`.

- Auth required: admin
- Body:

```json
{
  "id": 7,
  "userId": 2
}
```

- Success `200`: `{ "message": "Component assigned" }`
- Errors:
  - `400` selected user not found
  - `400` cannot assign to admin user

### POST /api/assignments/unassign

Unassign latest active assignment for component and set status to `вільне`.

- Auth required: admin
- Body:

```json
{
  "id": 7
}
```

- Success `200`: `{ "message": "Component unassigned" }`
- If no active assignment: `{ "message": "No active assignment" }`

### POST /api/assignments/return

Current user returns their assigned component and status becomes `вільне`.

- Auth required: yes
- Body:

```json
{
  "id": 7
}
```

- Success `200`: `{ "message": "Component returned" }`
- Errors:
  - `400` invalid component id
  - `403` component is not assigned to current user

### POST /api/assignments/return-broken

Current user returns component as broken and status becomes `ремонт`.

- Auth required: yes
- Body:

```json
{
  "id": 7
}
```

- Success `200`: `{ "message": "Component returned broken" }`
- Errors:
  - `400` invalid component id
  - `403` component is not assigned to current user

---

## Users

### POST /api/users/add

Create new user.

- Auth required: admin
- Body:

```json
{
  "username": "newuser",
  "password": "plain-password",
  "role": "user"
}
```

- Success `200`: `{ "message": "User created" }`

### POST /api/users/delete

Delete user by id.

- Auth required: admin
- Body (either field is accepted):

```json
{
  "id": 3
}
```

or

```json
{
  "userId": 3
}
```

- Success `200`: `{ "message": "User deleted" }`
- Errors:
  - `400` invalid user id
  - `400` cannot delete default admin (`id = 1`)

---

## Reports

### GET /api/report/warehouse

Get warehouse report summary and component list.

- Auth required: admin
- Success `200`:

```json
{
  "report": {
    "totalEquipment": 10,
    "damagedEquipment": 1,
    "assignedEquipment": 4,
    "freeEquipment": 5,
    "equipment": []
  }
}
```

---

## Component Status Values

The backend currently uses Ukrainian status strings:

- `вільне` (free)
- `призначене` (assigned)
- `ремонт` (repair)

---

## Database

### POST /api/db/reset

Reset entire database to initial state. Deletes all components, users, usage history, and recreates default admin user.

**⚠️ WARNING: This operation cannot be undone. All data will be permanently deleted.**

- Auth required: admin
- Body: `{}`
- Success `200`: `{ "message": "Database reset successfully" }`
