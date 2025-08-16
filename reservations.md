# Reservations API

## GET /api/reservation
- **Purpose:** List reservations visible to the caller.
- **Parameters:**
  - `start` (query, optional): Start of range filter.
  - `end` (query, optional): End of range filter.
- **Response Example:**
```json
[
  {
    "id": 1,
    "clientId": "client-1",
    "serviceProviderId": "provider-1",
    "appointmentTypeId": 1,
    "startTime": "2025-02-01T09:00:00Z",
    "endTime": "2025-02-01T09:30:00Z",
    "status": "Booked"
  }
]
```

## GET /api/reservation/{id}
- **Purpose:** Retrieve a specific reservation.
- **Parameters:**
  - `id` (path): Reservation id.
- **Response Example:**
```json
{
  "id": 1,
  "clientId": "client-1",
  "serviceProviderId": "provider-1",
  "appointmentTypeId": 1,
  "startTime": "2025-02-01T09:00:00Z",
  "endTime": "2025-02-01T09:30:00Z",
  "status": "Booked"
}
```

## POST /api/reservation
- **Purpose:** Create a reservation.
- **Parameters:**
  - Body:
```json
{
  "clientId": "client-1",
  "serviceProviderId": "provider-1",
  "appointmentTypeId": 1,
  "startTime": "2025-02-01T09:00:00Z",
  "endTime": "2025-02-01T09:30:00Z",
  "resourceId": 1,
  "notes": "Bring documents"
}
```
- **Response Example:** Same as `GET /api/reservation/{id}`.

## PUT /api/reservation/{id}
- **Purpose:** Update a reservation.
- **Parameters:**
  - `id` (path)
  - Body:
```json
{
  "startTime": "2025-02-01T10:00:00Z",
  "endTime": "2025-02-01T10:30:00Z",
  "status": "Booked"
}
```
- **Response:** `204 No Content`.

## DELETE /api/reservation/{id}
- **Purpose:** Soft delete a reservation.
- **Parameters:**
  - `id` (path)
- **Response:** `204 No Content`.