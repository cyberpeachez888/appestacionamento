# Parking Management System - Backend API

Complete backend API for the parking management system built with Node.js, Express, and Supabase.

## Features

- 🎫 Complete ticket management system
- 👥 Monthly client management
- 💰 Payment processing and tracking
- 🧾 Receipt generation
- 📊 Comprehensive financial reports
- 💾 Supabase database integration with in-memory fallback
- ✅ Request validation and error handling
- 📝 Request logging
- 🔒 CORS configuration

## Tech Stack

- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **Supabase** - PostgreSQL database and backend-as-a-service
- **express-validator** - Request validation
- **dotenv** - Environment variable management

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account (optional, fallback to in-memory storage)

### Setup

1. **Clone the repository and navigate to backend**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the backend directory:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Note:** If you don't configure Supabase credentials, the API will automatically use in-memory storage for development/testing.

4. **Set up Supabase database** (Optional)

If using Supabase, run the SQL migrations in your Supabase SQL editor:

- First, run `sql/001_create_tables.sql` to create all tables
- Then, run `sql/002_seed_data.sql` to add sample rate data

5. **Start the server**

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start at `http://localhost:3000`

## API Documentation

### Health Check

#### `GET /api/health`
Check if the API is running and Supabase connection status.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "supabase": "connected"
}
```

---

### Tickets Management

#### `POST /api/tickets`
Create a new parking ticket when a vehicle enters.

**Request Body:**
```json
{
  "vehicle_plate": "ABC1234",
  "vehicle_type": "car",
  "is_monthly_client": false,
  "monthly_client_id": null
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "ticket_number": "TKT250101XXXX",
    "vehicle_plate": "ABC1234",
    "vehicle_type": "car",
    "entry_time": "2025-01-01T12:00:00Z",
    "exit_time": null,
    "is_monthly_client": false,
    "monthly_client_id": null,
    "status": "active",
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

#### `GET /api/tickets`
List all tickets with optional filtering.

**Query Parameters:**
- `status` - Filter by status: `active`, `completed`, `cancelled`
- `vehicle_plate` - Search by vehicle plate
- `start_date` - Filter tickets from this date
- `end_date` - Filter tickets until this date

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "...", "ticket_number": "...", ... }
  ]
}
```

#### `GET /api/tickets/:id`
Get specific ticket details.

**Response:**
```json
{
  "success": true,
  "data": { "id": "...", "ticket_number": "...", ... }
}
```

#### `PUT /api/tickets/:id/checkout`
Process vehicle checkout and calculate payment.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "exit_time": "2025-01-01T14:00:00Z",
    "status": "completed",
    "calculated_amount": 12.00
  }
}
```

#### `DELETE /api/tickets/:id`
Delete a ticket (admin only).

**Response:** `204 No Content`

---

### Monthly Clients

#### `POST /api/monthly-clients`
Register a new monthly client.

**Request Body:**
```json
{
  "name": "John Doe",
  "vehicle_plate": "XYZ5678",
  "vehicle_type": "car",
  "phone": "+55 11 99999-9999",
  "email": "john@example.com",
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "monthly_fee": 400.00,
  "is_active": true
}
```

#### `GET /api/monthly-clients`
List all monthly clients.

**Query Parameters:**
- `is_active` - Filter by active status: `true`, `false`
- `vehicle_plate` - Search by vehicle plate

#### `GET /api/monthly-clients/:id`
Get specific client details.

#### `PUT /api/monthly-clients/:id`
Update client information.

#### `DELETE /api/monthly-clients/:id`
Remove a monthly client.

#### `GET /api/monthly-clients/:id/history`
Get client's parking history (tickets and payments).

---

### Vehicle Rates

#### `POST /api/rates`
Create a new rate configuration.

**Request Body:**
```json
{
  "vehicle_type": "car",
  "rate_type": "hourly",
  "amount": 6.00,
  "description": "Hourly rate for cars",
  "is_active": true
}
```

#### `GET /api/rates`
List all rates.

**Query Parameters:**
- `vehicle_type` - Filter by vehicle type
- `rate_type` - Filter by rate type: `hourly`, `daily`, `monthly`
- `is_active` - Filter by active status

#### `GET /api/rates/:id`
Get specific rate details.

#### `PUT /api/rates/:id`
Update rate configuration.

#### `DELETE /api/rates/:id`
Delete a rate.

#### `GET /api/rates/active`
Get all currently active rates.

---

### Payments

#### `POST /api/payments`
Process a payment.

**Request Body:**
```json
{
  "amount": 12.00,
  "payment_method": "cash",
  "ticket_id": "uuid",
  "monthly_client_id": null
}
```

#### `GET /api/payments`
List all payments.

**Query Parameters:**
- `start_date` - Filter from this date
- `end_date` - Filter until this date
- `payment_method` - Filter by method: `cash`, `card`, `pix`
- `ticket_id` - Filter by ticket
- `monthly_client_id` - Filter by client

#### `GET /api/payments/:id`
Get specific payment details.

#### `GET /api/payments/ticket/:ticketId`
Get all payments for a specific ticket.

---

### Receipts

#### `POST /api/receipts`
Generate a receipt for a payment.

**Request Body:**
```json
{
  "payment_id": "uuid",
  "amount": 12.00,
  "ticket_id": "uuid",
  "monthly_client_id": null
}
```

#### `GET /api/receipts`
List all receipts.

**Query Parameters:**
- `start_date` - Filter from this date
- `end_date` - Filter until this date
- `payment_id` - Filter by payment

#### `GET /api/receipts/:id`
Get specific receipt details.

#### `GET /api/receipts/payment/:paymentId`
Get receipt(s) for a specific payment.

---

### Financial Reports

#### `GET /api/reports/daily`
Get daily revenue report.

**Query Parameters:**
- `date` - Specific date (defaults to today)

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2025-01-01",
    "total_revenue": 1250.00,
    "total_payments": 25,
    "payments_by_method": {
      "cash": 500.00,
      "card": 600.00,
      "pix": 150.00
    },
    "payments": [...]
  }
}
```

#### `GET /api/reports/monthly`
Get monthly revenue report.

**Query Parameters:**
- `year` - Year (defaults to current)
- `month` - Month (defaults to current)

#### `GET /api/reports/summary`
Get financial summary (total revenue, tickets, clients).

#### `GET /api/reports/by-vehicle-type`
Get revenue breakdown by vehicle type.

**Query Parameters:**
- `start_date` - Filter from this date
- `end_date` - Filter until this date

#### `GET /api/reports/date-range`
Get custom date range report.

**Query Parameters:**
- `start_date` - Required
- `end_date` - Required

---

## Database Schema

The system uses the following tables in Supabase:

### tickets
- `id` (UUID) - Primary key
- `ticket_number` (TEXT) - Unique ticket number
- `vehicle_plate` (TEXT) - Vehicle license plate
- `vehicle_type` (TEXT) - Type: car, motorcycle, truck
- `entry_time` (TIMESTAMP) - Entry timestamp
- `exit_time` (TIMESTAMP) - Exit timestamp
- `is_monthly_client` (BOOLEAN) - Monthly client flag
- `monthly_client_id` (UUID) - Foreign key to monthly_clients
- `status` (TEXT) - Status: active, completed, cancelled
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### monthly_clients
- `id` (UUID) - Primary key
- `name` (TEXT) - Client name
- `vehicle_plate` (TEXT) - Unique vehicle plate
- `vehicle_type` (TEXT) - Vehicle type
- `phone` (TEXT) - Phone number
- `email` (TEXT) - Email address
- `start_date` (DATE) - Contract start date
- `end_date` (DATE) - Contract end date
- `monthly_fee` (DECIMAL) - Monthly fee amount
- `is_active` (BOOLEAN) - Active status
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### rates
- `id` (UUID) - Primary key
- `vehicle_type` (TEXT) - Vehicle type
- `rate_type` (TEXT) - Type: hourly, daily, monthly
- `amount` (DECIMAL) - Rate amount
- `description` (TEXT) - Description
- `is_active` (BOOLEAN) - Active status
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### payments
- `id` (UUID) - Primary key
- `ticket_id` (UUID) - Foreign key to tickets
- `monthly_client_id` (UUID) - Foreign key to monthly_clients
- `amount` (DECIMAL) - Payment amount
- `payment_method` (TEXT) - Method: cash, card, pix
- `payment_date` (TIMESTAMP) - Payment timestamp
- `created_at` (TIMESTAMP)

### receipts
- `id` (UUID) - Primary key
- `receipt_number` (TEXT) - Unique receipt number
- `payment_id` (UUID) - Foreign key to payments
- `ticket_id` (UUID) - Foreign key to tickets
- `monthly_client_id` (UUID) - Foreign key to monthly_clients
- `amount` (DECIMAL) - Receipt amount
- `issued_date` (TIMESTAMP) - Issue timestamp
- `created_at` (TIMESTAMP)

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `409` - Conflict (duplicate entries)
- `500` - Internal Server Error

Error response format:
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Error description",
  "details": []
}
```

## Backward Compatibility

The new API maintains backward compatibility with the old endpoints:

- `/vehicles` - Legacy vehicle management
- `/rates` - Legacy rates (auto-converts to new format)
- `/monthlyCustomers` - Legacy monthly customers
- `/companyConfig` - Company configuration

## Development

### Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   └── supabase.js  # Supabase client setup
│   ├── controllers/     # Route controllers
│   │   ├── ticketsController.js
│   │   ├── monthlyClientsController.js
│   │   ├── ratesController.js
│   │   ├── paymentsController.js
│   │   ├── receiptsController.js
│   │   └── reportsController.js
│   ├── middleware/      # Express middleware
│   │   ├── errorHandler.js
│   │   ├── requestLogger.js
│   │   └── validators.js
│   ├── routes/          # API routes
│   │   ├── tickets.js
│   │   ├── monthlyClients.js
│   │   ├── rates.js
│   │   ├── payments.js
│   │   ├── receipts.js
│   │   └── reports.js
│   ├── utils/           # Utility functions
│   │   └── calculations.js
│   ├── app.js           # Express app setup
│   └── server.js        # Server entry point
├── sql/                 # Database migrations
│   ├── 001_create_tables.sql
│   └── 002_seed_data.sql
├── .env.example         # Environment variables template
├── package.json
└── README.md
```

### Running Tests

```bash
npm test
```

## License

ISC

## Support

For issues or questions, please open an issue in the repository.
