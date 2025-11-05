# Backend Setup Guide

This guide will help you set up the parking management backend API from scratch.

## Quick Start

### 1. Prerequisites
- Node.js v16 or higher
- npm or yarn
- A Supabase account (optional - the API will work with in-memory storage if not configured)

### 2. Installation

Navigate to the backend directory:
```bash
cd backend
```

Install dependencies:
```bash
npm install
```

### 3. Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and configure your settings:

**Minimum Configuration (works without Supabase):**
```env
PORT=3000
NODE_ENV=development
```

**Full Configuration with Supabase:**
```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
CURRENCY_CODE=BRL
CURRENCY_LOCALE=pt-BR
```

### 4. Database Setup (Optional - for Supabase)

If you want to use Supabase instead of in-memory storage:

1. Create a new Supabase project at https://supabase.com
2. Go to your project's SQL Editor
3. Run the migration scripts in order:
   - First: `sql/001_create_tables.sql`
   - Second: `sql/002_seed_data.sql`
4. Copy your project URL and anon key from Settings > API
5. Add them to your `.env` file

### 5. Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Run the legacy server (old implementation):
```bash
npm run legacy
```

The server will start at `http://localhost:3000` (or the port you configured).

### 6. Verify Installation

Test the health endpoint:
```bash
curl http://localhost:3000/api/health
```

You should see:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "supabase": "connected" // or "not configured (using in-memory storage)"
}
```

## Testing the API

### Create a Ticket
```bash
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_plate": "ABC1234",
    "vehicle_type": "car"
  }'
```

### List All Tickets
```bash
curl http://localhost:3000/api/tickets
```

### Get Active Rates
```bash
curl http://localhost:3000/api/rates/active
```

### Create a Monthly Client
```bash
curl -X POST http://localhost:3000/api/monthly-clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "vehicle_plate": "XYZ5678",
    "vehicle_type": "car",
    "phone": "+55 11 99999-9999",
    "email": "john@example.com",
    "start_date": "2025-01-01",
    "end_date": "2025-12-31",
    "monthly_fee": 400.00
  }'
```

### Get Financial Summary
```bash
curl http://localhost:3000/api/reports/summary
```

## Connecting the Frontend

The React frontend should make requests to `http://localhost:3000` (or your configured URL).

Make sure your backend URL is configured in the frontend:
- The default backend URL in the existing frontend code is `http://localhost:3000`
- The backend has CORS enabled for `http://localhost:5173` (Vite dev server) and `http://localhost:3000`

## Troubleshooting

### Server won't start
- Make sure port 3000 is not already in use
- Check that all dependencies are installed: `npm install`
- Verify your `.env` file is properly formatted

### Supabase connection issues
- Verify your SUPABASE_URL and SUPABASE_ANON_KEY are correct
- Check that you've run the migration scripts
- The API will automatically fall back to in-memory storage if Supabase is not configured

### CORS errors
- Make sure your frontend URL is in the ALLOWED_ORIGINS environment variable
- Check that the frontend is making requests to the correct backend URL

### Data not persisting
- If using in-memory storage (no Supabase), data will be lost when the server restarts
- Configure Supabase to persist data permanently

## Development Tips

### In-Memory vs Supabase
- **In-Memory**: Perfect for quick testing and development. No setup required.
- **Supabase**: For production use and when you need persistent data storage.

### API Documentation
- See `README.md` for complete API documentation
- All endpoints return JSON in the format: `{ success: boolean, data: any }` or `{ success: false, error: string, message: string }`

### Backward Compatibility
The API maintains backward compatibility with the old implementation:
- `/vehicles` - Legacy vehicle endpoints
- `/rates` - Legacy rates endpoint (auto-converts to old format)
- `/monthlyCustomers` - Legacy monthly customers
- `/companyConfig` - Company configuration

## Next Steps

1. **Configure Supabase** for production use
2. **Update frontend** to use new API endpoints (optional - legacy endpoints still work)
3. **Deploy** the backend to your preferred hosting platform
4. **Set up monitoring** and logging
5. **Configure backups** for your Supabase database

## Support

For more information, see:
- `README.md` - Complete API documentation
- `sql/` - Database schema and migration scripts
- Supabase documentation: https://supabase.com/docs
