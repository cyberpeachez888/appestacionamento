# Backend for App Estacionamento

Node.js + Express backend integrated with Supabase for parking management system.

## Quick Start

1. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Configure Supabase** (in `.env`):
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-public-anon-or-service-role-key
   PORT=3000
   ```

3. **Create database tables**:
   - Go to your Supabase project SQL Editor
   - Run the SQL in `supabase-schema.sql`
   - Then run `COMPLETE-MIGRATION.sql` (or at minimum `MIGRATION-parking-slot.sql`) to add enhanced monthly customer fields: `parking_slot`, `plates` (JSONB), `cpf`, `phone`, `operator_name` and related indexes.

4. **Install and run**:
   ```bash
   npm install
   npm run dev    # Development with auto-reload
   npm start      # Production
   ```

## API Endpoints

### Rates
- `GET /rates` - List all rates
- `POST /rates` - Create rate
- `PUT /rates/:id` - Update rate
- `DELETE /rates/:id` - Delete rate

### Monthly Customers
- `GET /monthlyCustomers` - List customers
- `POST /monthlyCustomers` - Create customer (auto-creates payment)
- `PUT /monthlyCustomers/:id` - Update customer
- `DELETE /monthlyCustomers/:id` - Delete customer
- `POST /monthlyCustomers/:id/pay` - Register payment & extend due date
 - `GET /monthlyCustomers/:id/receipt` - Receipt data (customer + latest payment + company config)

### Tickets (Vehicle Entry/Exit)
- `POST /tickets` - Register vehicle entry
- `POST /tickets/:id/exit` - Process vehicle exit (calculates amount)
- `GET /tickets/:id` - Get ticket details

### Payments
- `GET /payments` - List payments (supports ?start=&end= filters)
- `POST /payments` - Create payment record

### Reports
- `GET /reports` - Financial summary (total, count, breakdown by method)

### Company Config
- `GET /companyConfig` - Get company settings
- `PUT /companyConfig` - Update company settings

### Audit Log
- `GET /audit/events` - List audit events (requires viewReports)
- `POST /audit/events` - Create an audit event (for client-triggered logs like cash open/close)

## Development Mode

The backend includes an **in-memory fallback** when Supabase credentials are not configured, allowing development and testing without a database. Perfect for:
- Running smoke tests
- Frontend development
- Demo environments

**Note**: In-memory data is reset on server restart.

In this mode, audit logs are stored in-memory too (user_events), so they will not persist across restarts.

## Testing

Run comprehensive smoke tests:
```bash
# Server must be running on port 3000
bash tests/smoke-test.sh
```

Or test individual endpoints with curl:
```bash
# Create a rate
curl -X POST http://localhost:3000/rates \
  -H "Content-Type: application/json" \
  -d '{"vehicleType":"Carro","rateType":"Hora","value":10,"unit":"hora","courtesyMinutes":15}'
# Create a custom audit event (replace $TOKEN with a valid JWT)
curl -X POST http://localhost:3000/audit/events \
   -H "Authorization: Bearer $TOKEN" \
   -H "Content-Type: application/json" \
   -d '{"action":"cash.open","targetType":"cash_register","details":{"openingAmount":100}}'

# List audit events (requires viewReports permission)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/audit/events

# Create a ticket
curl -X POST http://localhost:3000/tickets \
  -H "Content-Type: application/json" \
  -d '{"vehicle_plate":"ABC1234","vehicle_type":"Carro"}'
```

## Project Structure

```
backend/
├── src/
│   ├── server.js              # Express app & middleware
│   ├── config/
│   │   └── supabase.js        # Supabase client with in-memory fallback
│   ├── routes/
│   │   └── index.js           # API route definitions
│   └── controllers/
│       ├── ratesController.js
│       ├── monthlyController.js
│       ├── ticketsController.js
│       ├── paymentsController.js
│       └── reportsController.js
├── supabase-schema.sql        # Database schema
├── .env.example               # Environment template
└── README.md                  # This file
```

## Integration with Frontend

The frontend (React + Vite) connects to this backend. Configure the API base URL in your frontend `.env`:

```
VITE_API_URL=http://localhost:3000
```

All routes are available on both `/api/*` and `/*` paths for compatibility.

## Migration troubleshooting

If you encounter an error like: `Could not find the 'parkingSlot' column of 'monthly_customers' in the schema cache` or `column "parking_slot" does not exist`, your database schema is missing required columns.

Fix:
- Open Supabase SQL Editor
- Paste and run the contents of `backend/COMPLETE-MIGRATION.sql`
- Re-try the operation in the app
