---
name: "create-external-api"
description: "Creates standardized external APIs in PIOC platform under /api/external/. Invoke when user wants to create new external APIs for third-party access with unified authentication and structure."
---

# Create External API Skill

This skill creates standardized external APIs for third-party access in the PIOC platform.

## Overview

All external APIs are placed under `/src/app/api/external/v1/` with unified:
- Authentication (API Key + HMAC-SHA256 Signature)
- Response format
- Error handling
- Permission control (read/write)

## When to Invoke

Invoke this skill when:
- User wants to create a new external API for third-party access
- User needs to expose internal functionality to external systems
- User asks to add API endpoints under `/api/external/`

## API Structure

```
src/app/api/external/v1/
├── {module}/
│   ├── route.ts           # List + Create
│   └── [id]/
│       └── route.ts       # Get + Update + Delete
```

## Authentication

All external APIs use unified authentication:

**Required Headers:**
- `X-API-Key`: API Key (e.g., `pk_xxx`)
- `X-API-Signature`: HMAC-SHA256 signature
- `X-API-Timestamp`: Unix timestamp (seconds)

**Signature Format:**
```
{METHOD}\n{PATH}\n{QUERY_STRING}\n{TIMESTAMP}\n{BODY}
```

## Usage

When user wants to create an external API, ask for:

1. **Module name** (e.g., `configsys`, `documents`, `orders`)
2. **Resource name** (e.g., `versions`, `files`, `items`)
3. **Operations needed**:
   - List (GET /{module}/{resource})
   - Create (POST /{module}/{resource})
   - Get (GET /{module}/{resource}/{id})
   - Update (PUT /{module}/{resource}/{id})
   - Delete (DELETE /{module}/{resource}/{id})
4. **Database table** (if applicable)
5. **Fields to expose** (if applicable)

## Template

### List + Create Route (`route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/auth/api-auth';
import { query } from '@/lib/database/connection';

// GET /api/external/v1/{module}/{resource} - List
const getHandler = createApiHandler(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));

    const offset = (page - 1) * pageSize;

    // Query data
    const data = await query(
      `SELECT * FROM {table} LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );

    // Get total count
    const countResult = await query<Array<{ total: number }>>(
      'SELECT COUNT(*) as total FROM {table}'
    );
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('External API: list failed:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to list', error: String(error) },
      { status: 500 }
    );
  }
}, ['read']);

// POST /api/external/v1/{module}/{resource} - Create
const postHandler = createApiHandler(async (request, auth) => {
  try {
    const body = await request.json();

    // Validate userId
    if (!auth.userId) {
      return NextResponse.json(
        { success: false, message: 'Invalid API key: no associated user' },
        { status: 401 }
      );
    }

    // Build INSERT
    const fields = Object.keys(body);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(body);

    const result = await query<{ insertId: number }>(
      `INSERT INTO {table} (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );

    return NextResponse.json({
      success: true,
      data: { id: result.insertId },
    }, { status: 201 });
  } catch (error) {
    console.error('External API: create failed:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create', error: String(error) },
      { status: 500 }
    );
  }
}, ['write']);

export const GET = getHandler;
export const POST = postHandler;
```

### Single Resource Route (`[id]/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/auth/api-auth';
import { query } from '@/lib/database/connection';

// GET /api/external/v1/{module}/{resource}/{id}
const getHandler = createApiHandler(async (request, auth) => {
  try {
    const id = request.nextUrl.pathname.split('/').pop();

    const data = await query(
      `SELECT * FROM {table} WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!data || (data as any[]).length === 0) {
      return NextResponse.json(
        { success: false, message: 'Not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: (data as any[])[0],
    });
  } catch (error) {
    console.error('External API: get failed:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get', error: String(error) },
      { status: 500 }
    );
  }
}, ['read']);

// PUT /api/external/v1/{module}/{resource}/{id}
const putHandler = createApiHandler(async (request, auth) => {
  try {
    const id = request.nextUrl.pathname.split('/').pop();
    const body = await request.json();

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(body)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(id);

    await query(
      `UPDATE {table} SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('External API: update failed:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update', error: String(error) },
      { status: 500 }
    );
  }
}, ['write']);

// DELETE /api/external/v1/{module}/{resource}/{id}
const deleteHandler = createApiHandler(async (request, auth) => {
  try {
    const id = request.nextUrl.pathname.split('/').pop();

    await query('DELETE FROM {table} WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('External API: delete failed:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete', error: String(error) },
      { status: 500 }
    );
  }
}, ['write']);

export const GET = getHandler;
export const PUT = putHandler;
export const DELETE = deleteHandler;
```

## Response Format

**Success:**
```json
{
  "success": true,
  "data": {...},
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (optional)"
}
```

## Error Codes

| Status | Meaning |
|--------|---------|
| 400 | Bad Request - Missing parameters |
| 401 | Unauthorized - Invalid API key or signature |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

## Best Practices

1. **Always validate auth.userId** in write operations
2. **Use LEFT JOIN for user info** to avoid missing data
3. **Add pagination** for list endpoints
4. **Log errors** with console.error for debugging
5. **Return consistent response format**
6. **Use proper HTTP status codes**

## Example Usage

**Creating a documents API:**

User: "Create an external API for documents"

Required info:
- Module: `documents`
- Resource: `files`
- Table: `pioc_documents`
- Operations: All (List, Create, Get, Update, Delete)

Created files:
- `/src/app/api/external/v1/documents/files/route.ts`
- `/src/app/api/external/v1/documents/files/[id]/route.ts`
