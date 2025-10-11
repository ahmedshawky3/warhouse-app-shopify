# Token API Quick Reference

## Endpoints Summary

| Method | Endpoint                      | Auth   | Description          |
| ------ | ----------------------------- | ------ | -------------------- |
| POST   | `/api/admin/tokens`           | Admin  | Create new token     |
| GET    | `/api/admin/tokens`           | Admin  | Get all tokens       |
| GET    | `/api/admin/tokens/:id`       | Admin  | Get token by ID      |
| GET    | `/api/admin/tokens/my-tokens` | Admin  | Get my tokens        |
| DELETE | `/api/admin/tokens/:id`       | Admin  | Delete token         |
| POST   | `/api/admin/tokens/validate`  | Public | Validate & use token |
| POST   | `/api/admin/tokens/check`     | Public | Check token validity |

## Quick Examples

### Create Token (Admin)

```bash
curl -X POST http://localhost:5003/api/admin/tokens \
  -H "Authorization: Bearer ADMIN_JWT"
```

### Use Token (Public)

```bash
curl -X POST http://localhost:5003/api/admin/tokens/validate \
  -H "Content-Type: application/json" \
  -d '{"token":"64-char-hex-token"}'
```

### Get All Tokens (Admin)

```bash
curl http://localhost:5003/api/admin/tokens \
  -H "Authorization: Bearer ADMIN_JWT"
```

## Token Structure

```json
{
  "_id": "ObjectId",
  "token": "64-char hex string",
  "createdBy": "ObjectId (User)",
  "isUsed": false,
  "usedAt": null,
  "createdAt": "ISO Date",
  "updatedAt": "ISO Date"
}
```

## Key Features

- ✅ One-time use only
- ✅ 64-character random hex tokens
- ✅ Admin-only creation
- ✅ Public validation
- ✅ Usage tracking
- ✅ Creator tracking

## Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (token used/invalid)
- `401` - Unauthorized
- `403` - Forbidden (not admin)
- `404` - Not Found
- `500` - Server Error
