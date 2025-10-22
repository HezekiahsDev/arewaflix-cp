# Error Handling Update - Login & Authentication

## Overview

Updated the authentication error handling to properly parse and display specific error messages from the API, including validation errors with field-specific messages.

## Changes Made

### 1. Updated API Response Interfaces (`lib/api/auth.ts`)

#### `AuthResponse` Interface

```typescript
export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: AuthUser;
    token: string;
  };
  error?: {
    message: string;
    details?: string;
    stack?: string;
  };
  errors?: Array<{
    field: string;
    message: string;
  }>;
}
```

#### `ProfileResponse` Interface

```typescript
export interface ProfileResponse {
  success: boolean;
  message: string;
  data?: AuthUser;
  error?: {
    message: string;
    details?: string;
    stack?: string;
  };
}
```

### 2. Enhanced Error Handling in API Functions

All API functions (`login`, `signup`, `getProfile`) now:

- Parse JSON responses even when HTTP status is not OK
- Handle multiple error formats:
  - Field-specific validation errors (with `errors` array)
  - General error messages (with `error.message` or `message`)
  - HTTP status fallbacks
- Return structured error responses instead of throwing

### 3. Updated UI Components

#### Login Screen (`app/auth/login.tsx`)

- Handles field-specific validation errors
- Displays multiple error messages (one per line)
- Checks for `response.data` before accessing user/token

#### Signup Screen (`app/auth/signup.tsx`)

- Handles field-specific validation errors
- Displays multiple error messages (one per line)
- Checks for `response.data` before accessing user/token

#### Profile Screen (`app/(tabs)/profile.tsx`)

- Checks for `response.data` before accessing profile data

## Supported Error Formats

### 1. Validation Errors (400, 409)

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    {
      "field": "username",
      "message": "Username is already taken."
    },
    {
      "field": "email",
      "message": "An account with this email already exists."
    }
  ]
}
```

**Display:** Shows field-specific messages like:

```
username: Username is already taken.
email: An account with this email already exists.
```

### 2. Authentication Errors (401)

```json
{
  "success": false,
  "error": {
    "message": "Invalid credentials."
  }
}
```

**Display:** Shows "Invalid credentials."

### 3. General Errors (400, 500)

```json
{
  "success": false,
  "message": "Username, email, password, and gender are required."
}
```

**Display:** Shows the message directly

### 4. Server Errors (500)

```json
{
  "success": false,
  "error": {
    "message": "Something went wrong on the server.",
    "details": "...",
    "stack": "..."
  }
}
```

**Display:** Shows "Something went wrong on the server."

## Benefits

1. **Clear Error Messages**: Users see specific error messages instead of generic HTTP status codes
2. **Field-Level Feedback**: Validation errors show exactly which field has an issue
3. **Better UX**: Users understand what went wrong and how to fix it
4. **Consistent Handling**: All auth endpoints handle errors the same way
5. **Type Safety**: TypeScript ensures proper error handling throughout

## Testing

Test the following scenarios:

1. ✅ Login with wrong password → Shows "Invalid credentials."
2. ✅ Signup with existing username → Shows "username: Username is already taken."
3. ✅ Signup with existing email → Shows "email: An account with this email already exists."
4. ✅ Signup with invalid email → Shows "Invalid email format."
5. ✅ Signup with short password → Shows "Password must be at least 6 characters long."
6. ✅ Network errors → Shows connection error message
