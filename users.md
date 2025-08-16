# Users API

## GET /api/users/providers-lite
- **Purpose:** List service providers with minimal information.
- **Parameters:** None.
- **Response Example:**
```json
[
  { "id": "provider-1", "name": "Jane Doe" }
]
```

## GET /api/users/providers
- **Purpose:** Search service providers and return detailed information.
- **Parameters:**
  - `q` (query, optional): Search term.
  - `take` (query, optional): Maximum number of records to return.
- **Example Request:**
`GET /api/users/providers?q=jane&take=5`
- **Response Example:**
```json
[
  {
    "id": "provider-1",
    "name": "Jane Doe",
    "userName": "jane",
    "email": "jane@example.com"
  }
]
```