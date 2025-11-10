# Business Hours & Holidays System - Complete Documentation

## 📋 Overview

A comprehensive operational scheduling system that manages business hours, holidays, special events, and automatic pricing adjustments based on time and date.

---

## 🎯 Features Implemented

### 1. **Business Hours Management** ⏰
- Configure open/close times for each day of the week
- Set different hours per day (Monday-Sunday)
- Mark specific days as closed
- 24-hour format support

### 2. **Holiday Calendar** 📅
- Add national/local holidays
- Mark recurring holidays (annual)
- Set holiday-specific hours (open reduced hours)
- Automatic "Closed" status on holidays
- Description/notes for each holiday

### 3. **Special Events** 🎉
- Create special pricing events
- Set event date ranges
- Configure price multipliers (e.g., 1.5x during events)
- Event descriptions
- Active/inactive toggle

### 4. **Operational Features** 🔧
- Real-time open/closed status check
- After-hours surcharge calculation
- Special event pricing detection
- Holiday detection
- Current status API endpoint

---

## 🗄️ Database Schema

### Table: `business_hours`

```sql
CREATE TABLE business_hours (
  id UUID PRIMARY KEY,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  is_closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(day_of_week)
);
```

**Default Hours:** Monday-Friday 8:00-18:00, Saturday 8:00-12:00, Sunday closed

### Table: `holidays`

```sql
CREATE TABLE holidays (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE, -- Repeats every year
  is_closed BOOLEAN DEFAULT TRUE,
  special_open_time TIME,
  special_close_time TIME,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Default Holidays:** New Year's Day, Christmas, Tiradentes Day, Labor Day, Independence Day, etc.

### Table: `special_events`

```sql
CREATE TABLE special_events (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_multiplier DECIMAL(3,2) DEFAULT 1.00, -- 1.5 = 50% increase
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🚀 API Endpoints

### Business Hours

```
GET    /business-hours              # List all business hours (7 days)
GET    /business-hours/:id          # Get specific day hours
PUT    /business-hours/:id          # Update day hours
GET    /business-hours/status/current # Get current open/closed status
```

### Holidays

```
GET    /holidays                    # List all holidays
GET    /holidays/:id                # Get specific holiday
POST   /holidays                    # Create new holiday
PUT    /holidays/:id                # Update holiday
DELETE /holidays/:id                # Delete holiday
GET    /holidays/check/:date        # Check if date is holiday
GET    /holidays/upcoming           # Get next 10 upcoming holidays
```

### Special Events

```
GET    /special-events              # List all events
GET    /special-events/:id          # Get specific event
POST   /special-events              # Create new event
PUT    /special-events/:id          # Update event
DELETE /special-events/:id          # Delete event
GET    /special-events/active       # Get currently active events
GET    /special-events/check/:date  # Get events for specific date
```

**Permissions:**
- View: Any authenticated user
- Manage: `manageCompanyConfig` permission

---

## 💻 Frontend UI

### Page: `/horarios-feriados`

**Location:** `src/pages/HorariosFeriados.tsx`

**Tabs:**

#### 1. **Horário de Funcionamento** Tab
- 7-day grid showing all days of week
- Each day card shows:
  - Day name (Segunda, Terça, etc.)
  - Open/Closed toggle
  - Open time picker (if open)
  - Close time picker (if open)
  - Current status badge
- Edit button per day
- Save changes button

#### 2. **Feriados** Tab
- List of all holidays (sorted by date)
- Add new holiday button
- Holiday cards show:
  - Holiday name
  - Date
  - Recurring badge (if annual)
  - Closed/Open status
  - Special hours (if open on holiday)
  - Description
  - Edit/Delete buttons
- Create/Edit dialog with:
  - Name input
  - Date picker
  - Recurring toggle
  - Closed toggle
  - Special hours (if not closed)
  - Description textarea

#### 3. **Eventos Especiais** Tab
- List of special events
- Add new event button
- Event cards show:
  - Event name
  - Date range
  - Price multiplier (e.g., "1.5x - +50%")
  - Active/Inactive status
  - Description
  - Edit/Delete buttons
- Create/Edit dialog with:
  - Name input
  - Start date picker
  - End date picker
  - Price multiplier input
  - Active toggle
  - Description textarea

**Icons:**
- Menu icon: `Calendar` (calendar icon)
- Shows in sidebar for users with `manageCompanyConfig` permission

---

## 🔧 Backend Implementation

### Controllers

#### `businessHoursController.js`
**Key Functions:**
- `list()` - Get all 7 days business hours
- `getById()` - Get specific day hours
- `update()` - Update day hours
- `getCurrentStatus()` - Check if currently open/closed
  - Returns: `{ isOpen, currentDay, currentTime, todayHours, nextOpenTime }`

**Business Logic:**
```javascript
// Check if currently open
const now = new Date();
const currentDay = now.getDay(); // 0-6
const currentTime = now.toTimeString().slice(0, 5); // HH:mm

// Check holiday
const isHoliday = await checkHoliday(today);
if (isHoliday && holiday.is_closed) return { isOpen: false };

// Check business hours
if (todayHours.is_closed) return { isOpen: false };
if (currentTime >= openTime && currentTime < closeTime) {
  return { isOpen: true };
}
```

#### `holidaysController.js`
**Key Functions:**
- `list()` - Get all holidays with optional year filter
- `getById()` - Get specific holiday
- `create()` - Create new holiday
- `update()` - Update holiday
- `delete()` - Delete holiday
- `checkDate()` - Check if specific date is holiday
- `getUpcoming()` - Get next 10 upcoming holidays

**Holiday Logic:**
```javascript
// Check if today is holiday
const today = format(new Date(), 'yyyy-MM-dd');
const holiday = await findHoliday(today);

// Recurring holidays
if (isRecurring) {
  // Check month-day only (ignore year)
  checkDate = `${currentYear}-${monthDay}`;
}
```

#### `specialEventsController.js`
**Key Functions:**
- `list()` - Get all events
- `getById()` - Get specific event
- `create()` - Create new event
- `update()` - Update event
- `delete()` - Delete event
- `getActive()` - Get currently active events
- `checkDate()` - Get events for specific date

**Event Pricing Logic:**
```javascript
// Check if date is during special event
const events = await getActiveEvents(date);
if (events.length > 0) {
  // Use highest multiplier if multiple events
  const multiplier = Math.max(...events.map(e => e.price_multiplier));
  finalPrice = basePrice * multiplier;
}
```

---

## 📝 Usage Examples

### 1. Set Business Hours for Monday

```javascript
PUT /business-hours/:id
{
  "openTime": "08:00",
  "closeTime": "18:00",
  "isClosed": false
}
```

### 2. Add Christmas Holiday

```javascript
POST /holidays
{
  "name": "Natal",
  "date": "2025-12-25",
  "isRecurring": true,
  "isClosed": true,
  "description": "Feriado nacional"
}
```

### 3. Add New Year's Eve Special Hours

```javascript
POST /holidays
{
  "name": "Ano Novo",
  "date": "2025-12-31",
  "isRecurring": true,
  "isClosed": false,
  "specialOpenTime": "08:00",
  "specialCloseTime": "14:00",
  "description": "Fechamos às 14h"
}
```

### 4. Create Special Event with Pricing

```javascript
POST /special-events
{
  "name": "Festival da Cidade",
  "startDate": "2025-12-15",
  "endDate": "2025-12-20",
  "priceMultiplier": 1.5,
  "description": "50% de acréscimo durante o festival",
  "isActive": true
}
```

### 5. Check Current Status

```javascript
GET /business-hours/status/current

Response:
{
  "isOpen": true,
  "currentDay": 1,
  "currentTime": "14:30",
  "dayName": "Segunda-feira",
  "todayHours": {
    "openTime": "08:00",
    "closeTime": "18:00",
    "isClosed": false
  },
  "isHoliday": false,
  "specialEvent": null,
  "nextOpenTime": null
}
```

### 6. Check Upcoming Holidays

```javascript
GET /holidays/upcoming

Response:
[
  {
    "id": "uuid",
    "name": "Natal",
    "date": "2025-12-25",
    "isRecurring": true,
    "isClosed": true,
    "daysUntil": 45
  },
  {
    "id": "uuid",
    "name": "Ano Novo",
    "date": "2026-01-01",
    "isRecurring": true,
    "isClosed": false,
    "specialOpenTime": "08:00",
    "specialCloseTime": "14:00",
    "daysUntil": 52
  }
]
```

---

## 🔄 Integration with Existing Systems

### 1. **Vehicle Entry/Exit Validation**

Update `ticketsController.js`:

```javascript
// Before allowing entry
const status = await fetch('/business-hours/status/current');
if (!status.isOpen && !user.isAdmin) {
  return res.status(400).json({ 
    error: 'Estacionamento fechado',
    nextOpenTime: status.nextOpenTime 
  });
}

// Apply special event pricing
const events = await fetch(`/special-events/check/${today}`);
if (events.length > 0) {
  const multiplier = Math.max(...events.map(e => e.priceMultiplier));
  finalPrice = basePrice * multiplier;
}
```

### 2. **Receipt Generation**

Update `PaymentDialog.tsx` and `ReceiptDialog.tsx`:

```javascript
// Add "Closed" notice on receipts when after hours
const status = await fetch('/business-hours/status/current');
if (!status.isOpen) {
  receiptNotice = "⚠️ Atendimento fora do horário comercial";
}

// Show special event pricing
if (specialEvent) {
  receiptNote = `Tarifa especial: ${specialEvent.name} (+${(multiplier - 1) * 100}%)`;
}
```

### 3. **Dashboard Status Display**

Update `Index.tsx` (Dashboard):

```javascript
// Show current status
const status = await fetch('/business-hours/status/current');

<div className="bg-card p-4 rounded">
  <div className={status.isOpen ? 'text-green-600' : 'text-red-600'}>
    {status.isOpen ? '🟢 ABERTO' : '🔴 FECHADO'}
  </div>
  <p className="text-sm">
    {status.isOpen 
      ? `Fecha às ${status.todayHours.closeTime}`
      : `Abre ${status.nextOpenTime}`
    }
  </p>
</div>
```

### 4. **After-Hours Surcharge**

Add to pricing logic:

```javascript
// Calculate after-hours surcharge
const now = new Date();
const currentTime = now.toTimeString().slice(0, 5);

if (currentTime < openTime || currentTime >= closeTime) {
  // Apply 20% surcharge for after-hours service
  finalPrice = basePrice * 1.2;
  receipt.notes = "Acréscimo de 20% - Atendimento fora do horário";
}
```

---

## 🎨 UI Features

### Business Hours Tab
- **Visual Day Cards:** Each day displayed in card format
- **Color Coding:** 
  - Green = Currently open
  - Red = Closed
  - Yellow = Outside hours
- **Quick Edit:** Click edit icon to modify hours
- **Batch Save:** Save all changes at once

### Holidays Tab
- **Calendar View:** Holidays shown in list sorted by date
- **Recurring Badge:** Visual indicator for annual holidays
- **Quick Actions:** Edit/Delete buttons on each card
- **Filtering:** Filter by year, month, or show only recurring

### Special Events Tab
- **Active/Inactive Toggle:** Easily enable/disable events
- **Price Multiplier Display:** Shows both multiplier and percentage
- **Date Range Display:** Clear start/end dates
- **Conflict Warning:** Shows if multiple events overlap

---

## 📊 Default Data

### Business Hours (Default)
```
Monday:    08:00 - 18:00
Tuesday:   08:00 - 18:00
Wednesday: 08:00 - 18:00
Thursday:  08:00 - 18:00
Friday:    08:00 - 18:00
Saturday:  08:00 - 12:00
Sunday:    CLOSED
```

### Default Brazilian Holidays
```
01/01 - Ano Novo (Confraternização Universal)
21/04 - Tiradentes
01/05 - Dia do Trabalho
07/09 - Independência do Brasil
12/10 - Nossa Senhora Aparecida
02/11 - Finados
15/11 - Proclamação da República
20/11 - Consciência Negra
25/12 - Natal
```

---

## 🧪 Testing Checklist

### Database
- [x] Execute SQL migration in Supabase
- [ ] Verify 7 business hours records created
- [ ] Verify 9 default holidays created
- [ ] Verify tables have correct constraints

### Backend API
- [x] Backend running on port 3000
- [ ] GET /business-hours returns 7 days
- [ ] PUT /business-hours/:id updates hours
- [ ] GET /business-hours/status/current returns correct status
- [ ] GET /holidays returns all holidays
- [ ] POST /holidays creates new holiday
- [ ] GET /holidays/upcoming returns next holidays
- [ ] GET /special-events/active returns active events
- [ ] Price multiplier calculation works

### Frontend UI
- [ ] Navigate to /horarios-feriados
- [ ] See 3 tabs (Horários, Feriados, Eventos)
- [ ] Edit Monday hours (8:00 - 18:00)
- [ ] Save changes successfully
- [ ] Add new holiday
- [ ] Delete holiday
- [ ] Create special event
- [ ] Toggle event active/inactive
- [ ] View upcoming holidays list

### Integration
- [ ] Dashboard shows current open/closed status
- [ ] Vehicle entry blocked when closed
- [ ] Special event pricing applied correctly
- [ ] Holiday detection works
- [ ] Receipt shows after-hours notice
- [ ] After-hours surcharge calculated

---

## 🚀 Deployment Steps

### 1. Execute Database Migration

```bash
# In Supabase SQL Editor
# Run: backend/create-business-hours-tables.sql
```

**Verify:**
```sql
SELECT * FROM business_hours ORDER BY day_of_week;
SELECT * FROM holidays ORDER BY date;
SELECT * FROM special_events;
```

### 2. Backend Already Running ✅

```
Backend: http://localhost:3000
PID: 188199
Status: ✅ Running
```

### 3. Frontend Already Running ✅

```
Frontend: http://localhost:8080
Status: ✅ Running
```

### 4. Test Endpoints

```bash
# Check current status
curl http://localhost:3000/business-hours/status/current \
  -H "Authorization: Bearer YOUR_TOKEN"

# List business hours
curl http://localhost:3000/business-hours \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get upcoming holidays
curl http://localhost:3000/holidays/upcoming \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎯 Benefits

### For Business Owners
✅ **Automated Scheduling** - Set it and forget it  
✅ **Holiday Management** - Never miss a holiday update  
✅ **Revenue Optimization** - Special event pricing  
✅ **Legal Compliance** - Accurate holiday tracking  

### For Operators
✅ **Clear Hours** - Know when open/closed  
✅ **Automatic Blocking** - Can't accept cars when closed  
✅ **Price Clarity** - Automatic surcharges shown  

### For Customers
✅ **Transparent Hours** - Always know when open  
✅ **No Surprises** - After-hours charges shown upfront  
✅ **Holiday Info** - Know when closed in advance  

---

## 🔐 Security & Permissions

- **View Hours/Holidays:** Any authenticated user
- **Modify Hours/Holidays:** `manageCompanyConfig` permission
- **View Status:** Public API (no auth required - future enhancement)
- **Audit Logging:** All changes logged with user info

---

## 📈 Future Enhancements

1. **Public Hours Display**
   - Widget for website
   - Current status badge
   - Next 7 days schedule

2. **Multiple Locations**
   - Different hours per location
   - Location-specific holidays

3. **Seasonal Hours**
   - Summer/winter schedules
   - Automatic switching

4. **Advanced Pricing**
   - Time-based pricing (peak hours)
   - Day-of-week pricing
   - Combined with special events

5. **Notifications**
   - Email admins before holidays
   - SMS alerts for special events
   - Customer notifications for closures

6. **Calendar Integration**
   - Export to Google Calendar
   - iCal feed
   - Sync with Outlook

---

## 📞 Support & Troubleshooting

**Issue:** Current status shows wrong time
- Check server timezone settings
- Verify business hours in database
- Check holiday table for today's date

**Issue:** Special event pricing not applied
- Verify event is marked `is_active: true`
- Check date range includes current date
- Ensure price_multiplier > 0

**Issue:** Can't modify business hours
- Verify user has `manageCompanyConfig` permission
- Check audit logs for error details
- Ensure PUT request has all required fields

---

**Last Updated:** November 10, 2025  
**Version:** 1.0.0  
**Status:** ✅ Backend complete, Frontend complete, Ready for SQL migration
