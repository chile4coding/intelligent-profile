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

# Seed the database with sample data (optional)
npm run seed

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
    "age": 30,
    "age_group": "adult",
    "country_id": "US",
    "country_name": "United States",
    "country_probability": 0.85,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get All Profiles (with Advanced Filtering, Sorting & Pagination)

```
GET /api/profiles
```

Query parameters (all optional):

**Filtering:**
- `gender` - Filter by gender (`male` or `female`)
- `country_id` - Filter by 2-letter country code
- `age_group` - Filter by age group (`child`, `teenager`, `adult`, `senior`)
- `min_age` - Minimum age (>= 0, integer)
- `max_age` - Maximum age (>= 0, integer)
- `min_gender_probability` - Minimum gender probability (0-1)
- `min_country_probability` - Minimum country probability (0-1)

**Sorting:**
- `sort_by` - Field to sort by (`age`, `created_at`, `gender_probability`)
- `order` - Sort order (`asc` or `desc`), defaults to `asc`

**Pagination:**
- `page` - Page number (>= 1), defaults to 1
- `limit` - Items per page (1-50), defaults to 10, max 50

Examples:
```
GET /api/profiles?gender=male&age_group=adult
GET /api/profiles?sort_by=created_at&order=desc&page=2&limit=20
GET /api/profiles?min_age=18&max_age=65&min_gender_probability=0.8
```

Response:
```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 50,
  "data": [...]
}
```

### Search Profiles (Natural Language Queries)

```
GET /api/profiles/search?q=<natural_language_query>
```

Supports natural language queries for filtering profiles. Example queries:
- `"female adults from US"`
- `"males over 30"`
- `"senior profiles from Germany with high gender probability"`
- `"adults with age between 25 and 40"`

Additional pagination parameters supported:
- `page` - Page number (default: 1)
- `limit` - Items per page, max 50 (default: 10)

Example:
```
GET /api/profiles/search?q=female+adults+from+US&page=1&limit=10
```

Response:
```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 15,
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

## Database Schema

The `Profile` model stores enriched demographic data:

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (UUID v7) | Primary key, auto-generated |
| `name` | VarChar(255) | Person's name (unique, normalized lowercase) |
| `gender` | VarChar(10) | Predicted gender |
| `gender_probability` | Float? | Confidence score (0-1) |
| `age` | Int? | Predicted age |
| `age_group` | VarChar(20) | Age classification (child/teenager/adult/senior) |
| `country_id` | VarChar(2) | 2-letter country code |
| `country_name` | VarChar(100)? | Full country name |
| `country_probability` | Float? | Country prediction confidence (0-1) |
| `created_at` | DateTime | Timestamp of record creation |

**Indexes:** `gender`, `countryId`, `ageGroup`, `age`, `genderProbability`, `countryProbability`, `createdAt`

## Seed Data

Populate the database with sample profiles:

```bash
npm run seed
```

This reads from `prisma/seed_profiles.json` and enriches each name via external APIs.

## Configuration

### TypeScript

The project uses TypeScript with Node.js type definitions enabled. The `tsconfig.json` includes:
- Strict type checking
- Source maps and declaration files
- `prisma/**/*` included for seed file compilation

### Prisma

Schema located at `prisma/schema.prisma`. The database uses UUID v7 for primary keys, generated at the database level.

## Error Responses

Validation errors return 422:
```json
{
  "status": "error",
  "message": "Invalid query parameters"
}
```

Invalid search queries return 400:
```json
{
  "status": "error",
  "message": "Missing or empty parameter"
}
```

External API failures return 502:
```json
{
  "status": "error",
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

## Breaking Changes (v2.0)

- **UUID generation moved to database**: The `uuidv7` dependency was removed. UUIDs are now auto-generated by PostgreSQL via Prisma's `@default(uuid(7))`.
- **Migration required**: If upgrading from a previous version, drop the old migration and create a new one with the updated schema:
  ```bash
  rm -rf prisma/migrations
  npx prisma migrate dev --name init
  ```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run seed` - Seed database with sample profiles

## License

MIT
