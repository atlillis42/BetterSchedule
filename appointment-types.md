# Appointment Types API

## GET /api/appointmenttype
- **Purpose:** List appointment types visible to the caller.
- **Parameters:** None.
- **Response Example:**
```json
[
  {
    "id": 1,
    "name": "Consultation",
    "duration": "00:30:00",
    "price": 50,
    "description": "Initial consult",
    "assignedResourceId": 1,
    "isPublic": true,
    "requiresWaiver": false
  }
]
```

## GET /api/appointmenttype/{id}
- **Purpose:** Retrieve a specific appointment type.
- **Parameters:**
  - `id` (path): Appointment type id.
- **Response Example:**
```json
{
  "id": 1,
  "name": "Consultation",
  "duration": "00:30:00",
  "price": 50,
  "description": "Initial consult",
  "assignedResourceId": 1,
  "isPublic": true,
  "requiresWaiver": false
}
```

## POST /api/appointmenttype
- **Purpose:** Create a new appointment type.
- **Parameters:**
  - Body:
```json
{
  "name": "Consultation",
  "duration": "00:30:00",
  "price": 50,
  "description": "Initial consult",
  "assignedResourceId": 1,
  "isPublic": true,
  "requiresWaiver": false
}
```
- **Response Example:** Same as `GET /api/appointmenttype/{id}`.

## PUT /api/appointmenttype/{id}
- **Purpose:** Update an existing appointment type.
- **Parameters:**
  - `id` (path)
  - Body:
```json
{
  "name": "Extended Consultation",
  "duration": "00:45:00"
}
```
- **Response:** `204 No Content`.

## DELETE /api/appointmenttype/{id}
- **Purpose:** Soft delete an appointment type.
- **Parameters:**
  - `id` (path)
- **Response:** `204 No Content`.