# Blocked Times API

## GET /api/blocked-times
- **Purpose:** List blocked time ranges.
- **Parameters:**
  - `start` (query, optional): Start of range filter.
  - `end` (query, optional): End of range filter.
- **Response Example:**
```json
[
  {
    "id": 1,
    "reason": "Vacation",
    "startTime": "2025-01-10T09:00:00Z",
    "endTime": "2025-01-10T17:00:00Z",
    "resourceId": 1,
    "backColor": "#3a87ad"
  }
]
```

## GET /api/blocked-times/{id}
- **Purpose:** Retrieve a specific blocked time entry.
- **Parameters:**
  - `id` (path): Blocked time id.
- **Response Example:**
```json
{
  "id": 1,
  "reason": "Vacation",
  "startTime": "2025-01-10T09:00:00Z",
  "endTime": "2025-01-10T17:00:00Z",
  "resourceId": 1,
  "backColor": "#3a87ad"
}
```

## POST /api/blocked-times
- **Purpose:** Create a blocked time range.
- **Parameters:**
  - Body:
```json
{
  "reason": "Vacation",
  "startTime": "2025-01-10T09:00:00Z",
  "endTime": "2025-01-10T17:00:00Z",
  "resourceId": 1,
  "backColor": "#3a87ad"
}
```
- **Response Example:** Same as `GET /api/blocked-times/{id}`.

## PUT /api/blocked-times/{id}
- **Purpose:** Update a blocked time range.
- **Parameters:**
  - `id` (path)
  - Body:
```json
{
  "reason": "Team offsite",
  "startTime": "2025-01-12T09:00:00Z",
  "endTime": "2025-01-12T17:00:00Z",
  "resourceId": 1,
  "backColor": "#ffaa00"
}
```
- **Response:** `204 No Content`.

## DELETE /api/blocked-times/{id}
- **Purpose:** Soft delete a blocked time range.
- **Parameters:**
  - `id` (path)
- **Response:** `204 No Content`.