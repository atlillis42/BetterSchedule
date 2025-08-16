# Clients API

## GET /api/clients
- **Purpose:** Search for clients by name or email.
- **Parameters:**
  - `search` (query, optional): Search term.
- **Example Request:**
`GET /api/clients?search=ann`
- **Response Example:**
```json
[
  { "id": "client-1", "name": "Ann Smith" }
]
```