# Auth API

## GET /api/auth/status
- **Purpose:** Check authentication status and return user details.
- **Parameters:** None.
- **Response Example:**
```json
{
  "authenticated": true,
  "user": "manager@example.com",
  "userId": "user-123",
  "roles": ["Manager"],
  "organizationId": "org-1"
}
```

## POST /api/auth/logout
- **Purpose:** Sign out the current user.
- **Parameters:** None.
- **Response Example:**
```json
{
  "message": "Logged out succesfully"
}
```

## POST /api/auth/refresh
- **Purpose:** Refresh the user's identity, roles, and organization id.
- **Parameters:** None.
- **Response Example:**
```json
{
  "userId": "user-123",
  "roles": ["Manager"],
  "organizationId": "org-1"
}
```