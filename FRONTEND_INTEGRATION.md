# Frontend-Backend Integration Guide

## ✅ Integration Complete!

Your React frontend is now fully connected to the Node.js + Express backend.

## What Was Changed

### 1. **New API Client** (`src/lib/api.ts`)

Created a centralized API client that handles all HTTP requests to the backend:

- Type-safe request handling
- Error handling and logging
- Configurable base URL via environment variables
- Supports all backend endpoints (rates, customers, tickets, payments, reports)

### 2. **Environment Configuration**

Created `.env` and `.env.example` files:

```env
VITE_API_URL=http://localhost:3000
VITE_DEBUG=true
```

### 3. **Updated ParkingContext** (`src/contexts/ParkingContext.tsx`)

- Replaced all direct `fetch()` calls with the new API client
- Added proper error handling for all operations
- Maintained backward compatibility with existing frontend components

## How to Use

### Starting the Application

1. **Start the Backend** (in `/workspaces/appestacionamento/backend`):

   ```bash
   npm run dev
   ```

   Backend runs on: http://localhost:3000

2. **Start the Frontend** (in `/workspaces/appestacionamento`):
   ```bash
   npm run dev
   ```
   Frontend runs on: http://localhost:5173 (or similar)

### Using the API in Your Components

The ParkingContext now handles all backend communication automatically. Your existing components should work without changes!

#### Example: Adding a Rate

```tsx
import { useParking } from '../contexts/ParkingContext';

function MyComponent() {
  const { addRate } = useParking();

  const handleAddRate = async () => {
    try {
      await addRate({
        vehicleType: 'Carro',
        rateType: 'Hora',
        value: 10,
        unit: 'hora',
        courtesyMinutes: 15,
      });
      // Success!
    } catch (error) {
      console.error('Failed to add rate:', error);
    }
  };

  return <button onClick={handleAddRate}>Add Rate</button>;
}
```

#### Example: Adding a Monthly Customer

```tsx
const { addMonthlyCustomer } = useParking();

await addMonthlyCustomer({
  name: 'João Silva',
  cpf: '12345678900',
  plate: 'ABC1234',
  vehicle_type: 'Carro',
  value: 400,
  paymentMethod: 'pix',
});
```

### Direct API Usage (Advanced)

You can also use the API client directly for custom requests:

```tsx
import api from '../lib/api';

// Get financial report
const report = await api.getFinancialReport({
  start: '2025-11-01',
  end: '2025-11-30',
});

// Create a ticket
const ticket = await api.createTicket({
  vehicle_plate: 'XYZ9876',
  vehicle_type: 'Carro',
});

// Process exit
const exitData = await api.processTicketExit(ticket.id, {
  method: 'cartao',
});
```

## API Client Methods

### Rates

- `api.getRates()` - List all rates
- `api.createRate(rate)` - Create new rate
- `api.updateRate(id, rate)` - Update rate
- `api.deleteRate(id)` - Delete rate

### Monthly Customers

- `api.getMonthlyCustomers()` - List customers
- `api.createMonthlyCustomer(customer)` - Create customer
- `api.updateMonthlyCustomer(id, customer)` - Update customer
- `api.deleteMonthlyCustomer(id)` - Delete customer
- `api.registerMonthlyPayment(id, payment)` - Register payment

### Tickets (Vehicle Entry/Exit)

- `api.createTicket(ticket)` - Vehicle entry
- `api.processTicketExit(id, exitData)` - Vehicle exit
- `api.getTicket(id)` - Get ticket details

### Payments & Reports

- `api.getPayments(filters)` - List payments
- `api.createPayment(payment)` - Create payment
- `api.getFinancialReport(filters)` - Get financial summary

### Company Config

- `api.getCompanyConfig()` - Get configuration
- `api.updateCompanyConfig(config)` - Update configuration

## Backend Data Format

The backend uses slightly different field names. The API client handles the mapping automatically, but here's what you need to know:

### Rate Object

```typescript
{
  id: string;
  vehicle_type: string; // Maps to vehicleType
  rate_type: string; // Maps to rateType
  value: number;
  unit: string;
  courtesy_minutes: number; // Maps to courtesyMinutes
}
```

### Monthly Customer Object

```typescript
{
  id: string;
  name: string;
  cpf: string;
  plate: string;
  vehicle_type: string;
  value: number;
  contract_date: string;
  last_payment: string;
  due_date: string;
  status: string;
}
```

### Ticket Object

```typescript
{
  id: string;
  vehicle_plate: string;
  vehicle_type: string;
  entry_time: string;
  exit_time: string;
  duration_minutes: number;
  amount: number;
  status: 'open' | 'closed';
}
```

## Testing the Integration

1. **Open the Frontend** in your browser (usually http://localhost:5173)

2. **Try these actions**:
   - ✅ Add a new rate
   - ✅ Create a monthly customer
   - ✅ Register a vehicle entry (if using ticket system)
   - ✅ View financial reports
   - ✅ Update company settings

3. **Monitor Console Logs**:
   - Backend logs: Check the terminal running `npm run dev` in `/backend`
   - Frontend logs: Open browser DevTools → Console

## Troubleshooting

### Backend Not Responding

```bash
# Check if backend is running
curl http://localhost:3000/rates

# Restart backend
cd backend
npm run dev
```

### CORS Errors

The backend already has CORS enabled. If you still see errors, ensure:

1. Backend is running on port 3000
2. Frontend `.env` has correct `VITE_API_URL`

### Data Not Loading

1. Check browser console for errors
2. Verify backend is running and responding
3. Check Network tab in DevTools to see actual API calls

### Environment Variables Not Working

After changing `.env`, restart the Vite dev server:

```bash
# Stop with Ctrl+C, then:
npm run dev
```

## Development Tips

### Enable Debug Mode

```env
# In .env
VITE_DEBUG=true
```

### Use Backend In-Memory Store

If you don't have Supabase configured, the backend automatically uses an in-memory store. Perfect for development!

### Hot Reload

- Backend: Auto-reloads on file changes (nodemon)
- Frontend: Auto-reloads on file changes (Vite HMR)

## Production Checklist

Before deploying:

1. ✅ Configure real Supabase credentials in backend `.env`
2. ✅ Run `supabase-schema.sql` to create tables
3. ✅ Update frontend `.env` with production API URL
4. ✅ Build frontend: `npm run build`
5. ✅ Use `npm start` for backend (not `npm run dev`)
6. ✅ Configure CORS for your production domain

## Need Help?

- **Backend API Docs**: `/backend/README.md`
- **Backend Setup**: `/backend/SETUP.md`
- **Supabase Schema**: `/backend/supabase-schema.sql`
- **API Client**: `/src/lib/api.ts`

---

**Status**: 🟢 Frontend and Backend fully integrated and working!
