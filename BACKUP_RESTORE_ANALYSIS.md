# System Backup & Restore - Current State Analysis

## 📊 What Already Exists

### ✅ Partial Export Functionality

1. **Financial Reports CSV Export** (`src/pages/Financeiro.tsx`)
   - Exports filtered financial records to CSV
   - Includes: Type, Date, Value
   - User-initiated download
   - **Scope**: Limited to financial data only

2. **User Management CSV/JSON Export** (`src/pages/Users.tsx`)
   - Exports user list to CSV or JSON
   - Includes: ID, name, login, email, role, permissions
   - User-initiated download
   - **Scope**: Users table only

3. **Yearly Summary Export** (`backend/export-yearly-summary.js`)
   - Command-line script for yearly report backup
   - Creates 3 files: TXT summary, JSON full data, CSV payments
   - **Scope**: Monthly reports table only
   - **Usage**: Manual CLI execution, not integrated in UI

### ✅ Database Schema (Supabase)

**Tables Available for Backup:**

1. `rates` - Pricing/tariff configuration
2. `monthly_customers` - Monthly subscription customers
3. `tickets` - Parking tickets (entry/exit records)
4. `payments` - Payment transactions
5. `users` - User accounts and permissions
6. `company_config` - Company settings (single row)
7. `vehicle_types` - Vehicle type definitions
8. `user_events` - Audit log
9. `monthly_reports` - Financial closure reports
10. `receipts` - Receipt records

**Total: 10 tables** need comprehensive backup

---

## ❌ What's Missing (Implementation Needed)

### 1. **Full Database Backup**

- ❌ No single-click backup of ALL tables
- ❌ No comprehensive JSON export endpoint
- ❌ No backup history tracking
- ❌ No backup metadata (timestamp, size, user who created)

### 2. **Backup Management UI**

- ❌ No dedicated Backup/Restore page
- ❌ No list of previous backups
- ❌ No download backup to local PC functionality
- ❌ No backup file size information
- ❌ No search/filter backups by date

### 3. **Restore Functionality**

- ❌ No restore from backup endpoint
- ❌ No UI to upload backup file
- ❌ No restore preview/validation
- ❌ No selective table restore
- ❌ No restore confirmation dialogs
- ❌ No rollback mechanism

### 4. **Automatic Scheduled Backups**

- ❌ No cron job or scheduler
- ❌ No daily/weekly automatic backup
- ❌ No backup retention policy (old backups cleanup)
- ❌ No backup notification system
- ❌ No failed backup alerts

### 5. **Backup Storage**

- ❌ No centralized backup storage directory
- ❌ No backup versioning
- ❌ No backup compression (ZIP/GZIP)
- ❌ No backup encryption for sensitive data

### 6. **Backup Integrity**

- ❌ No checksum/hash validation
- ❌ No backup corruption detection
- ❌ No backup test restore
- ❌ No backup size limits/warnings

---

## 🎯 Required Features Breakdown

### **PRIORITY 1: Core Backup Functionality** ⭐⭐⭐

#### Backend Requirements:

1. **Full Database Export Endpoint**
   - `GET /api/backup/export` - Export all tables to JSON
   - Returns: Complete database snapshot
   - Format: Structured JSON with metadata
   - Includes: All 10 tables + timestamp + user info

2. **Backup List Endpoint**
   - `GET /api/backup/list` - List all backups
   - Returns: Array of backup metadata
   - Info: Filename, timestamp, size, created_by

3. **Download Backup Endpoint**
   - `GET /api/backup/download/:id` - Download specific backup
   - Returns: ZIP file with JSON data
   - Triggers browser download

#### Frontend Requirements:

1. **Backup Management Page** (`src/pages/Backup.tsx`)
   - "Create Backup" button
   - List of existing backups (table)
   - Download button per backup
   - Delete backup button (with confirmation)
   - Backup size and timestamp display

2. **Backup Progress Indicator**
   - Loading state during backup creation
   - Success/error toast notifications
   - Estimated time remaining (optional)

---

### **PRIORITY 2: Restore Functionality** ⭐⭐

#### Backend Requirements:

1. **Restore Endpoint**
   - `POST /api/backup/restore` - Restore from uploaded backup
   - Accepts: JSON file upload
   - Validates backup structure
   - Options: Full restore or selective tables

2. **Restore Preview Endpoint**
   - `POST /api/backup/preview` - Preview backup contents
   - Returns: Table counts, data summary
   - No actual data modification

#### Frontend Requirements:

1. **Restore Dialog**
   - File upload component
   - Preview backup contents button
   - Table selection checkboxes (for selective restore)
   - Confirmation dialog with warnings
   - "I understand this will overwrite data" checkbox

2. **Restore Progress**
   - Upload progress bar
   - Restore progress indicator
   - Success/error messages

---

### **PRIORITY 3: Automatic Backups** ⭐

#### Backend Requirements:

1. **Scheduled Backup Service**
   - Node-cron or similar scheduler
   - Daily backup at configured time (e.g., 2 AM)
   - Auto-cleanup old backups (keep last 30 days)
   - Error logging and retry logic

2. **Backup Configuration**
   - Enable/disable automatic backups
   - Set schedule (daily, weekly, custom cron)
   - Set retention policy (days to keep)

#### Frontend Requirements:

1. **Backup Settings Section** (in Configurações page)
   - Toggle automatic backups on/off
   - Schedule selector
   - Retention days input
   - Last automatic backup timestamp display

---

## 📁 Proposed File Structure

### Backend:

```
backend/
├── src/
│   ├── controllers/
│   │   └── backupController.js        # NEW: Backup/restore logic
│   ├── services/
│   │   ├── backupService.js           # NEW: Core backup functions
│   │   └── scheduledBackupService.js  # NEW: Cron job for auto-backups
│   ├── routes/
│   │   └── index.js                   # ADD: Backup routes
│   └── middleware/
│       └── upload.js                  # NEW: File upload handling
├── backups/                           # NEW: Storage directory
│   ├── manual/                        # User-initiated backups
│   └── automatic/                     # Scheduled backups
└── package.json                       # ADD: multer, node-cron
```

### Frontend:

```
src/
├── pages/
│   └── Backup.tsx                     # NEW: Backup management page
├── components/
│   ├── BackupListTable.tsx            # NEW: Backup list component
│   ├── RestoreDialog.tsx              # NEW: Restore dialog
│   └── BackupSettingsSection.tsx      # NEW: Settings component
├── lib/
│   └── api.ts                         # ADD: Backup API methods
└── contexts/
    └── BackupContext.tsx              # OPTIONAL: Backup state management
```

---

## 🛠️ Implementation Plan

### Phase 1: Manual Backup/Restore (Weeks 1-2)

1. ✅ Create backup controller and routes
2. ✅ Implement full database export
3. ✅ Create backup storage system
4. ✅ Build Backup management page
5. ✅ Add backup list and download
6. ✅ Implement restore upload
7. ✅ Add restore validation and execution
8. ✅ Test backup/restore cycle

### Phase 2: Automatic Backups (Week 3)

1. ✅ Install node-cron
2. ✅ Create scheduled backup service
3. ✅ Add backup retention logic
4. ✅ Create backup settings UI
5. ✅ Test automatic backup execution

### Phase 3: Advanced Features (Week 4)

1. ✅ Add backup compression (ZIP)
2. ✅ Implement checksum validation
3. ✅ Add selective table restore
4. ✅ Create backup preview
5. ✅ Add email notifications (optional)
6. ✅ Performance optimization

---

## 📦 Dependencies Needed

```json
{
  "dependencies": {
    "multer": "^1.4.5", // File upload handling
    "node-cron": "^3.0.3", // Scheduled tasks
    "archiver": "^6.0.1", // ZIP compression
    "crypto": "built-in" // Checksum generation
  }
}
```

---

## 🎨 UI/UX Design Mockup

### Backup Page Layout:

```
┌─────────────────────────────────────────────┐
│  Backup & Restore                          │
│  [Create Backup]  [Configure Schedule]     │
├─────────────────────────────────────────────┤
│                                             │
│  📊 Backup History                          │
│  ┌───────────────────────────────────────┐ │
│  │ Date       │ Size  │ By    │ Actions  │ │
│  ├───────────────────────────────────────┤ │
│  │ 2025-11-10 │ 2.3MB │ Admin │ ⬇️ 🗑️   │ │
│  │ 2025-11-09 │ 2.1MB │ Auto  │ ⬇️ 🗑️   │ │
│  │ 2025-11-08 │ 2.0MB │ Auto  │ ⬇️ 🗑️   │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  [⬆️ Restore from Backup]                  │
│                                             │
│  💡 Automatic Backups: ✅ Enabled          │
│     Schedule: Daily at 2:00 AM             │
│     Retention: 30 days                     │
│                                             │
└─────────────────────────────────────────────┘
```

---

## ⚠️ Security Considerations

1. **Access Control**
   - Only admins can create/restore backups
   - Require `manageBackups` permission (new)
   - Log all backup/restore actions in audit

2. **Data Protection**
   - Backup files contain sensitive data
   - Store in secure directory (outside public)
   - Consider encryption for production

3. **Validation**
   - Validate backup file structure before restore
   - Prevent SQL injection in restore
   - Limit file upload size (e.g., 50MB max)

4. **Audit Trail**
   - Log who created each backup
   - Log all restore operations
   - Track failed backups/restores

---

## 📈 Success Metrics

- ✅ Full database backup in <10 seconds
- ✅ Restore completes in <30 seconds
- ✅ Automatic backups run successfully daily
- ✅ Backup files are downloadable
- ✅ Zero data loss in backup/restore cycle
- ✅ User-friendly UI with clear feedback

---

## 🔄 Backup Data Structure Example

```json
{
  "metadata": {
    "version": "1.0",
    "timestamp": "2025-11-10T14:30:00Z",
    "created_by": "admin",
    "tables": [
      "rates", "monthly_customers", "tickets",
      "payments", "users", "company_config",
      "vehicle_types", "user_events",
      "monthly_reports", "receipts"
    ],
    "checksum": "a1b2c3d4e5f6..."
  },
  "data": {
    "rates": [...],
    "monthly_customers": [...],
    "tickets": [...],
    "payments": [...],
    "users": [...],
    "company_config": {...},
    "vehicle_types": [...],
    "user_events": [...],
    "monthly_reports": [...],
    "receipts": [...]
  }
}
```

---

## 🎯 Summary

### What Exists:

- ✅ Partial CSV/JSON exports (financial, users)
- ✅ CLI script for yearly reports
- ✅ Database schema ready

### What's Needed:

- ❌ Full database backup endpoint
- ❌ Backup management UI
- ❌ Restore functionality
- ❌ Automatic scheduled backups
- ❌ Backup history and download

### Estimated Effort:

- **Phase 1 (Manual Backup/Restore)**: 12-16 hours
- **Phase 2 (Automatic Backups)**: 6-8 hours
- **Phase 3 (Advanced Features)**: 8-10 hours
- **Total**: ~26-34 hours for complete implementation

### Priority:

⭐ **HIGH PRIORITY** - Critical for data protection and business continuity

---

**Next Steps**: Ready to implement? I can start building:

1. Backend backup controller and routes
2. Frontend Backup management page
3. Automatic backup scheduler
4. Restore functionality

Let me know if you'd like to proceed! 🚀
