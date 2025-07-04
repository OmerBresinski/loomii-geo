# Authentication Setup with Clerk

This document explains how authentication is implemented in the Loomii Geo backend using Clerk.

## Overview

The backend uses Clerk for authentication, which verifies JWT tokens sent from the frontend. All protected routes require a valid session token.

## Environment Variables

Add these environment variables to your `.env` file:

```env
CLERK_SECRET_KEY=your-clerk-secret-key-here
CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key-here
```

You can find these keys in your Clerk dashboard:
1. Go to your Clerk dashboard
2. Select your application
3. Go to "API Keys"
4. Copy the "Secret Key" and "Publishable Key"

## Authentication Middleware

### `requireAuth`
- **Purpose**: Protects routes that require authentication
- **Behavior**: Returns 401 error if no valid token is provided
- **Usage**: Applied to all sensitive API endpoints

### `optionalAuth`
- **Purpose**: Optionally populates user context without requiring authentication
- **Behavior**: Continues execution whether token is valid or not
- **Usage**: For public endpoints that can benefit from user context

## Frontend Integration

### Sending Requests

From your frontend, include the session token in the Authorization header:

```javascript
// Using fetch
const response = await fetch('/api/analytics/123', {
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json',
  },
});

// Using axios
const response = await axios.get('/api/analytics/123', {
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
  },
});
```

### Getting the Session Token

If you're using Clerk's React hooks:

```javascript
import { useAuth } from '@clerk/clerk-react';

function MyComponent() {
  const { getToken } = useAuth();
  
  const makeAuthenticatedRequest = async () => {
    const token = await getToken();
    
    const response = await fetch('/api/user/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return response.json();
  };
}
```

## API Endpoints

### Public Endpoints (No Authentication Required)
- `GET /api/health` - Health check
- `GET /api/public/info` - Public info (with optional user context)

### Protected Endpoints (Authentication Required)
- `GET /api/user/profile` - Get current user profile
- `GET /api/analytics/:companyId` - Get analytics data
- `GET /api/competitors/:companyId` - Get competitor data  
- `GET /api/sources` - Get sources data

## User Context

When authenticated, the `req.auth` object contains:

```typescript
req.auth = {
  userId: string;        // Clerk user ID
  sessionId: string;     // Clerk session ID
  user: {
    id: string;          // User ID
    email: string;       // User email
    firstName: string;   // User first name
    lastName: string;    // User last name
    imageUrl: string;    // User profile image URL
  };
}
```

## Error Handling

Authentication errors return standardized responses:

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

Common authentication errors:
- `401 Unauthorized` - No valid token provided
- `401 Unauthorized` - Invalid or expired token
- `401 Unauthorized` - Token verification failed

## Testing Authentication

### 1. Test Health Check (No Auth Required)
```bash
curl http://localhost:3000/api/health
```

### 2. Test Protected Endpoint (Auth Required)
```bash
# This should return 401
curl http://localhost:3000/api/user/profile

# This should work with valid token
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/user/profile
```

### 3. Test Optional Auth Endpoint
```bash
# Works without token
curl http://localhost:3000/api/public/info

# Works with token (includes user info)
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/public/info
```

## Security Best Practices

1. **Never expose your `CLERK_SECRET_KEY`** - Keep it secure and only use it on the backend
2. **Use HTTPS in production** - Tokens should never be sent over unencrypted connections
3. **Validate user permissions** - Check if the authenticated user has permission to access specific resources
4. **Handle token expiration** - Implement proper token refresh logic on the frontend

## Troubleshooting

### Common Issues

1. **"CLERK_SECRET_KEY is not configured"**
   - Make sure you've added the environment variable to your `.env` file
   - Restart your server after adding the variable

2. **"Authentication failed"**
   - Check that the token is being sent correctly in the Authorization header
   - Verify the token format: `Bearer <token>`
   - Ensure the token hasn't expired

3. **"Invalid session token"**
   - The token might be expired or invalid
   - Try generating a new token from the frontend

### Debug Mode

Add logging to see authentication attempts:

```typescript
// In your middleware
console.log('Auth header:', req.headers.authorization);
console.log('Session verification result:', session);
```

## Next Steps

1. **Add Role-Based Access Control (RBAC)**: Extend the middleware to check user roles
2. **Implement Rate Limiting**: Add user-specific rate limiting
3. **Add Audit Logging**: Track authenticated user actions
4. **Database Integration**: Store user preferences and settings linked to Clerk user IDs 