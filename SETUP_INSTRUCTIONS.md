# ShipMaster Pro Setup Instructions

## Current Status

✅ **Completed:**
1. Restructured project from documentation into organized codebase
2. Implemented Supabase integration with self-healing capabilities
3. Created all database models with Mongoose-compatible API
4. Set up Express server with all routes and middleware
5. Configured development environment

## 🚀 Next Steps to Get Running

### 1. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (remember your database password)
3. Once project is ready, go to Settings > API
4. Copy these values to update your `.env` file:
   - `SUPABASE_URL` - Your project URL
   - `SUPABASE_ANON_KEY` - The "anon" public key
   - `SUPABASE_SERVICE_ROLE_KEY` - The service_role key (keep this secret!)

### 2. Create Database Schema

1. In Supabase dashboard, go to SQL Editor
2. Click "New Query"
3. Copy the entire contents of `backend/src/models/supabase/schema.sql`
4. Paste and run the query
5. This will create all tables, indexes, and security policies

### 3. Update Environment Variables

Edit `backend/.env` with your actual credentials:

```env
# Replace these with your Supabase credentials
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-actual-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key

# Change this to a secure random string
JWT_SECRET=generate-a-secure-random-string-here
```

### 4. Start the Backend

```bash
cd backend
npm run dev
```

You should see:
```
🚀 ShipMaster Pro API server running on port 3002
📊 Environment: development
🔐 Using Supabase with self-healing capabilities
✅ Connected to Supabase successfully
```

### 5. Initialize System Tags

Once the server is running, initialize the system tags:

```bash
curl -X POST http://localhost:3002/api/system/initialize
```

This creates the default tag categories and system tags.

### 6. Test the System

Check the health endpoint:
```bash
curl http://localhost:3002/health
```

You should see connection status and metrics.

## 🔧 Frontend Setup (Next Steps)

The frontend is set up with React/TypeScript and Vite:

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Update `frontend/.env` to point to your backend:
   ```
   VITE_API_URL=http://localhost:3002
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## 📝 API Integration Setup

To connect external services:

### Shopify
1. Create a private app in Shopify admin
2. Get API credentials
3. Use POST `/api/integrations` to add integration

### QuickBooks
1. Register at developer.intuit.com
2. Get OAuth2 credentials
3. Add to `.env` file

### Other Integrations
Follow similar pattern - check `.env.example` for required fields.

## 🐛 Troubleshooting

### Database Connection Issues
- Verify Supabase project is active (not paused)
- Check credentials in `.env` match Supabase dashboard
- Ensure you ran the schema SQL

### Port Conflicts
- Backend defaults to port 3002
- Frontend defaults to port 3000
- Change in `.env` if needed

### Self-Healing System
The Supabase connection includes:
- Automatic retry with exponential backoff
- Circuit breaker pattern
- Connection pooling
- Error classification and recovery

Monitor health at `/health` endpoint.

## 📞 Support

For issues:
1. Check `backend/server.log` for errors
2. Verify all environment variables are set
3. Ensure Supabase project is properly configured
4. Review the documentation in `/docs` folder