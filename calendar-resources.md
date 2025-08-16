# Calendar Resources API

## GET /api/calendar-resources
- **Purpose:** List calendar resources.
- **Parameters:** None.
- **Response Example:**
```json
[
  {
    "id": 1,
    "name": "Room A",
    "backColor": "#d0d0d0",
    "blockedTimes": []
  }
]
```

## GET /api/calendar-resources/{id}
- **Purpose:** Retrieve a calendar resource and optional blocked times.
- **Parameters:**
  - `id` (path): Resource id.
  - `start` (query, optional): Filter blocked times starting before end.
  - `end` (query, optional): Filter blocked times ending after start.
- **Response Example:**
```json
{
  "id": 1,
  "name": "Room A",
  "backColor": "#d0d0d0",
  "blockedTimes": [
    {
      "id": 1,
      "reason": "Maintenance",
      "startTime": "2025-01-15T09:00:00Z",
      "endTime": "2025-01-15T12:00:00Z",
      "resourceId": 1
    }
  ]
}
```

## POST /api/calendar-resources
- **Purpose:** Create a new calendar resource (manager only).
- **Parameters:**
  - Body:
```json
{
  "name": "Room A",
  "backColor": "#d0d0d0"
}
```
- **Response Example:** Same as `GET /api/calendar-resources/{id}`.

## PUT /api/calendar-resources/{id}
- **Purpose:** Update a calendar resource (manager only).
- **Parameters:**
  - `id` (path)
  - Body:
```json
{
  "name": "Room B"
}
```
- **Response:** `204 No Content`.

## DELETE /api/calendar-resources/{id}
- **Purpose:** Soft delete a calendar resource (manager only).
- **Parameters:**
  - `id` (path)
- **Response:** `204 No Content`.