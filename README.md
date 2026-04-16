# Profile Intelligence Service API

A REST API that enriches names with demographic data (gender, age, country) by querying external APIs and stores the results in a PostgreSQL database.

## Overview

This service takes a person's name and enriches it with demographic information from three public APIs:
- **Genderize.io** - Predicts gender based on name
- **Agify.io** - Predicts age based on name
- **Nationalize.io** - Predicts country of origin based on name

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (via Prisma ORM)
- **Language**: TypeScript

## Prerequisites

- Node.js (v18+)
- PostgreSQL database

## Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
PORT=4888
```

## Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Build the project
npm run build

# Start the server
npm start
```

## Development

```bash
npm run dev
```

The server runs on `http://localhost:4888` by default.

## API Endpoints

### Health Check
```
GET /health
```

Response:
```json
{ "status": "ok" }
```

### Create Profile
```
POST /api/profiles
```

Request body:
```json
{
  "name": "John Doe"
}
```

Response (201):
```json
{
  "status": "success",
  "data": {
    "id": "...",
    "name": "john doe",
    "gender": "male",
    "gender_probability": 0.99,
    "sample_size": 12345,
    "age": 30,
    "age_group": "adult",
    "country_id": "US",
    "country_probability": 0.85,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get All Profiles
```
GET /api/profiles
```

Query parameters (all optional):
- `gender` - Filter by gender
- `country_id` - Filter by country code
- `age_group` - Filter by age group (child, teenager, adult, senior)

Response:
```json
{
  "status": "success",
  "count": 10,
  "data": [...]
}
```

### Get Profile by ID
```
GET /api/profiles/:id
```

Response (200):
```json
{
  "status": "success",
  "data": {...}
}
```

Response (404):
```json
{
  "status": "error",
  "message": "Profile not found"
}
```

### Delete Profile
```
DELETE /api/profiles/:id
```

Response: 204 No Content

## Age Group Classification

| Age Range | Group |
|----------|-------|
| 0-12 | child |
| 13-19 | teenager |
| 20-59 | adult |
| 60+ | senior |

## Error Responses

Validation errors return 400:
```json
{
  "status": "error",
  "message": "Missing or empty name"
}
```

External API failures return 502:
```json
{
  "status": "502",
  "message": "Error message from external API"
}
```

Database errors return 500:
```json
{
  "status": "error",
  "message": "Internal server error"
}
```

## License

MIT# intelligent-profile
