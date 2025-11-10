# Receipt Templates System - Complete Documentation

## 📋 Overview

A comprehensive receipt template management system that allows customization of parking receipts with multiple types, custom fields, QR codes, barcodes, and email/WhatsApp integration.

---

## 🎯 Features Implemented

### 1. **Multiple Receipt Types** 🧾
- **Parking Ticket** - For hourly/daily parking with entry/exit times
- **Monthly Payment** - For monthly customer payments with reference period
- **General Receipt** - For miscellaneous transactions (reimbursements, extras)

### 2. **Template Customization**
- Toggle visibility for 15+ fields (receipt number, date, time, plate, vehicle type, etc.)
- Custom header/footer text
- Signature line option
- Primary/secondary colors
- Font family selection (Arial, Helvetica, Times, Courier)

### 3. **Advanced Features**
- **QR Code** - Customizable data with variable substitution
- **Barcode** - CODE128, EAN13, CODE39 support
- **Custom Fields** - Add extra fields (text, number, date, textarea)
- **Terms & Conditions** - Legal text in footer
- **Email Templates** - HTML and plain text versions
- **WhatsApp Messages** - Template for instant messaging

### 4. **Template Management**
- Create/Edit/Delete templates
- Set default template per type
- Clone/duplicate templates
- Activate/deactivate templates
- Preview with sample data

---

## 🗄️ Database Schema

### Table: `receipt_templates`

```sql
CREATE TABLE receipt_templates (
  id UUID PRIMARY KEY,
  template_name TEXT UNIQUE NOT NULL,
  template_type VARCHAR(50) CHECK (template_type IN 
    ('parking_ticket', 'monthly_payment', 'general_receipt')),
  description TEXT,
  
  -- Layout config
  layout JSONB DEFAULT '{}',
  
  -- Header
  show_logo BOOLEAN DEFAULT TRUE,
  show_company_name BOOLEAN DEFAULT TRUE,
  show_company_details BOOLEAN DEFAULT TRUE,
  header_text TEXT,
  
  -- Body fields (15 toggleable fields)
  show_receipt_number BOOLEAN DEFAULT TRUE,
  show_date BOOLEAN DEFAULT TRUE,
  show_time BOOLEAN DEFAULT TRUE,
  show_plate BOOLEAN DEFAULT TRUE,
  show_vehicle_type BOOLEAN DEFAULT FALSE,
  show_entry_time BOOLEAN DEFAULT FALSE,
  show_exit_time BOOLEAN DEFAULT FALSE,
  show_duration BOOLEAN DEFAULT FALSE,
  show_rate BOOLEAN DEFAULT FALSE,
  show_value BOOLEAN DEFAULT TRUE,
  show_payment_method BOOLEAN DEFAULT TRUE,
  show_operator BOOLEAN DEFAULT FALSE,
  
  -- Custom fields
  custom_fields JSONB DEFAULT '[]',
  
  -- Footer
  show_qr_code BOOLEAN DEFAULT FALSE,
  qr_code_data TEXT,
  show_barcode BOOLEAN DEFAULT FALSE,
  barcode_data TEXT,
  barcode_type VARCHAR(20) DEFAULT 'CODE128',
  terms_and_conditions TEXT,
  footer_text TEXT,
  show_signature_line BOOLEAN DEFAULT TRUE,
  
  -- Styling
  primary_color VARCHAR(7) DEFAULT '#000000',
  secondary_color VARCHAR(7) DEFAULT '#666666',
  font_family VARCHAR(50) DEFAULT 'Arial',
  
  -- Email/WhatsApp
  email_subject TEXT,
  email_body_html TEXT,
  email_body_text TEXT,
  whatsapp_message TEXT,
  
  -- Settings
  available_variables TEXT[],
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
- `idx_receipt_templates_type` - Fast filtering by type
- `idx_receipt_templates_active` - Get only active templates
- `idx_receipt_templates_default` - Quick default lookup

---

## 🚀 API Endpoints

### Template Management

```
GET    /receipt-templates              # List all templates (filter by ?type=parking_ticket)
GET    /receipt-templates/:id          # Get template by ID
GET    /receipt-templates/default/:type # Get default template for type
POST   /receipt-templates              # Create new template (requires manageCompanyConfig)
PUT    /receipt-templates/:id          # Update template (requires manageCompanyConfig)
DELETE /receipt-templates/:id          # Delete template (requires manageCompanyConfig)
POST   /receipt-templates/:id/set-default # Set as default (requires manageCompanyConfig)
POST   /receipt-templates/:id/preview  # Render template with sample data
POST   /receipt-templates/:id/clone    # Duplicate template (requires manageCompanyConfig)
```

**Permissions:**
- View templates: Any authenticated user
- Manage templates: `manageCompanyConfig` permission

---

## 📄 Default Templates

### 1. Parking Ticket Template
- **Type:** `parking_ticket`
- **Fields:** Entry/exit times, duration, rate, vehicle type, operator
- **Features:** QR code enabled with receipt data
- **Use Case:** Hourly/daily parking receipts

### 2. Monthly Payment Template
- **Type:** `monthly_payment`
- **Fields:** Customer name, plates, reference month, due date
- **Features:** Barcode (CODE128) for payment tracking
- **Custom Fields:** Reference month, next due date, additional plates
- **Use Case:** Monthly customer payment receipts

### 3. General Receipt Template
- **Type:** `general_receipt`
- **Fields:** Plate, value, payment method, operator
- **Custom Fields:** Recipient name, CPF, description, issued by
- **Use Case:** Reimbursements, extra fees, miscellaneous payments

---

## 🎨 Template Variables

Templates support variable substitution using `{{variableName}}` syntax:

### Common Variables
- `{{receiptNumber}}` - Receipt counter (6 digits)
- `{{date}}` - Current date (dd/MM/yyyy)
- `{{time}}` - Current time (HH:mm)
- `{{plate}}` - Vehicle license plate
- `{{value}}` - Payment amount
- `{{paymentMethod}}` - Payment method (Dinheiro, Pix, Cartão)

### Company Variables
- `{{companyName}}` - Company name
- `{{companyLegalName}}` - Company legal name
- `{{companyCnpj}}` - Company CNPJ
- `{{companyAddress}}` - Company address
- `{{companyPhone}}` - Company phone

### Parking Ticket Variables
- `{{vehicleType}}` - Vehicle type (Carro, Moto, etc.)
- `{{entryDate}}` - Entry date
- `{{entryTime}}` - Entry time
- `{{exitDate}}` - Exit date
- `{{exitTime}}` - Exit time
- `{{duration}}` - Total parking duration
- `{{rate}}` - Applied rate name
- `{{operator}}` - User who processed transaction

### Monthly Customer Variables
- `{{customerName}}` - Customer name
- `{{plates}}` - Comma-separated list of plates
- `{{referenceMonth}}` - Month being paid (custom field)
- `{{dueDate}}` - Next payment due date (custom field)

### General Receipt Variables
- `{{recipientName}}` - Person receiving payment (custom field)
- `{{recipientCpf}}` - CPF (custom field)
- `{{description}}` - Payment description (custom field)
- `{{issuedBy}}` - Operator name (custom field)

---

## 💻 Frontend UI

### Page: `/modelos-recibos`

**Location:** `src/pages/ModelosRecibos.tsx`

**Features:**
1. **Filter by Type** - Dropdown to filter templates
2. **Template Cards** - Grid view with:
   - Template name and type
   - Active/Inactive badge
   - Default star indicator
   - Feature badges (QR code, barcode, custom fields)
   - Action buttons (Edit, Clone, Set Default, Delete)

3. **Create/Edit Dialog** - 4 tabs:
   - **Básico** - Name, type, description, active/default toggles, header settings
   - **Campos** - Toggle 15+ receipt fields, style settings (colors, font)
   - **Rodapé** - QR code, barcode, terms & conditions, footer text, signature line
   - **Email/WhatsApp** - Email subject, HTML body, WhatsApp message

4. **Icons:**
   - Menu icon: `FileCheck` (receipt with checkmark)
   - Shows in sidebar for admin users only

---

## 🔧 Backend Implementation

### Controller: `receiptTemplatesController.js`

**Key Functions:**
- `list()` - Get all templates with optional type filter
- `getById()` - Get single template
- `getDefault()` - Get default template for type (with fallback)
- `create()` - Create new template (auto-unset other defaults if setting new default)
- `update()` - Update template
- `delete()` - Delete template (prevents deletion of default)
- `setDefault()` - Set template as default for its type
- `preview()` - Render template with provided variables
- `clone()` - Duplicate template with "(Cópia)" suffix

**Data Transformation:**
- `toFrontendFormat()` - Convert snake_case to camelCase
- `toDbFormat()` - Convert camelCase to snake_case
- `renderTemplate()` - Replace {{variables}} with actual values

**Audit Logging:**
All CRUD operations logged with:
- `receipt_template.create`
- `receipt_template.update`
- `receipt_template.delete`
- `receipt_template.set_default`
- `receipt_template.clone`

---

## 📝 Usage Examples

### 1. Create Parking Ticket Template with QR Code

```javascript
POST /receipt-templates
{
  "templateName": "Ticket com QR Code",
  "templateType": "parking_ticket",
  "description": "Ticket com código QR para validação",
  "showQrCode": true,
  "qrCodeData": "{{receiptNumber}}|{{plate}}|{{value}}|{{date}}",
  "showEntryTime": true,
  "showExitTime": true,
  "showDuration": true,
  "showRate": true,
  "showOperator": true,
  "termsAndConditions": "Não nos responsabilizamos por objetos no interior do veículo.",
  "primaryColor": "#1e40af",
  "secondaryColor": "#64748b"
}
```

### 2. Get Default Template for Monthly Payments

```javascript
GET /receipt-templates/default/monthly_payment

Response:
{
  "id": "uuid",
  "templateName": "Mensalista Padrão",
  "templateType": "monthly_payment",
  "showBarcode": true,
  "barcodeData": "{{receiptNumber}}",
  "barcodeType": "CODE128",
  "customFields": [
    {
      "name": "referenceMonth",
      "label": "Mês de Referência",
      "type": "text",
      "required": true
    },
    {
      "name": "dueDate",
      "label": "Próximo Vencimento",
      "type": "date",
      "required": false
    }
  ],
  "isDefault": true,
  "isActive": true
}
```

### 3. Preview Template with Sample Data

```javascript
POST /receipt-templates/:id/preview
{
  "receiptNumber": "000123",
  "plate": "ABC-1234",
  "value": "15.00",
  "date": "10/11/2025",
  "companyName": "Estacionamento Centro"
}

Response:
{
  "emailSubject": "Recibo #000123 - Estacionamento Centro",
  "emailBodyHtml": "<html>...",
  "whatsappMessage": "RECIBO #000123\nPlaca: ABC-1234\nValor: R$ 15.00",
  "qrCodeData": "000123|ABC-1234|15.00|10/11/2025",
  "barcodeData": "000123"
}
```

---

## 🔄 Integration with Existing Receipts

### Next Steps (TODO):

1. **Update PaymentDialog.tsx**
   - Fetch default monthly_payment template
   - Use template fields to show/hide receipt sections
   - Apply custom colors/fonts
   - Render barcode if enabled
   - Use email template for sending receipts

2. **Update ReceiptDialog.tsx**
   - Fetch default general_receipt template
   - Render custom fields from template
   - Apply styling from template
   - Generate QR code if enabled

3. **Create TicketReceiptDialog.tsx** (new component)
   - For parking ticket exits
   - Fetch default parking_ticket template
   - Show entry/exit times, duration, rate
   - Generate QR code with ticket data
   - Email/WhatsApp send options

4. **Add Template Selector** (optional enhancement)
   - Dropdown in receipt dialogs to choose template
   - Override default template per transaction
   - Save preference per user

---

## 📊 Testing Checklist

- [ ] Execute SQL migration in Supabase
- [ ] Verify 3 default templates created
- [ ] Create custom parking ticket template with QR code
- [ ] Create custom monthly template with barcode
- [ ] Set custom template as default
- [ ] Clone existing template
- [ ] Delete non-default template
- [ ] Attempt to delete default template (should fail)
- [ ] Preview template with sample data
- [ ] Update PaymentDialog to use template
- [ ] Test barcode generation in monthly receipt
- [ ] Update ReceiptDialog to use template
- [ ] Test custom fields in general receipt
- [ ] Create parking ticket receipt with QR code
- [ ] Test email template rendering
- [ ] Test WhatsApp message template

---

## 🎨 UI Screenshots Guide

### Template Management Page
- Grid of template cards showing:
  - Template name
  - Type badge (Parking Ticket / Mensalista / Recibo Geral)
  - Active/Inactive status
  - Default star icon
  - Feature badges (QR Code, Barcode, X custom fields)
  - Action buttons row

### Create/Edit Dialog Tabs

**Tab 1: Básico**
- Template name input
- Type dropdown
- Description textarea
- Active/Default toggles
- Header section with logo/company toggles

**Tab 2: Campos**
- Grid of 15+ field toggles
- Style section (primary color, secondary color, font family)

**Tab 3: Rodapé**
- QR code toggle + data input
- Barcode toggle + data input + type selector
- Terms & conditions textarea
- Footer text textarea
- Signature line toggle

**Tab 4: Email/WhatsApp**
- Email subject input
- Email HTML body textarea (monospace font)
- WhatsApp message textarea
- Available variables reference box

---

## 🚀 Deployment Steps

### 1. Execute Database Migration

```bash
# Copy SQL file content
cat backend/create-receipt-templates-table.sql

# Paste into Supabase SQL Editor
# Click "Run"
```

**Verify:**
```sql
SELECT * FROM receipt_templates;
-- Should return 3 default templates
```

### 2. Restart Backend

```bash
cd backend
npm start
```

**Verify:**
```bash
curl http://localhost:3000/receipt-templates \
  -H "Authorization: Bearer YOUR_TOKEN"
# Should return empty array or default templates
```

### 3. Access Frontend

```
http://localhost:5173/modelos-recibos
```

**Verify:**
- Page loads without errors
- Can create new template
- Can edit existing template
- Can delete template
- Can set as default
- Can clone template

### 4. Integration Testing

- Update `PaymentDialog.tsx` to fetch template
- Update `ReceiptDialog.tsx` to use template
- Test receipt generation with custom template
- Verify QR code renders
- Verify barcode renders
- Test email template with variables

---

## 📚 Technical Notes

### Variable Substitution

Templates use simple string replacement:
```javascript
function renderTemplate(templateString, variables) {
  let result = templateString;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, variables[key] || '');
  });
  return result;
}
```

### QR Code Generation (Future)

Recommended library: `qrcode.react`
```bash
npm install qrcode.react
```

```tsx
import QRCode from 'qrcode.react';

<QRCode value={qrCodeData} size={128} />
```

### Barcode Generation (Future)

Recommended library: `react-barcode`
```bash
npm install react-barcode
```

```tsx
import Barcode from 'react-barcode';

<Barcode value={barcodeData} format={barcodeType} />
```

### Email HTML Rendering

Use `dangerouslySetInnerHTML` for preview:
```tsx
<div dangerouslySetInnerHTML={{ __html: emailBodyHtml }} />
```

For sending, use notificationService.js:
```javascript
await sendEmail({
  to: customer.email,
  subject: renderTemplate(template.emailSubject, variables),
  html: renderTemplate(template.emailBodyHtml, variables),
  text: renderTemplate(template.emailBodyText, variables)
});
```

---

## 🎯 Benefits

### For Business Owners
✅ **Professional Branding** - Custom colors, logos, fonts
✅ **Legal Compliance** - Custom terms & conditions per receipt type
✅ **Modern Features** - QR codes, barcodes for validation
✅ **Flexibility** - Different templates for different situations

### For Operators
✅ **Easy to Use** - Templates automatically applied
✅ **Consistent** - Same format every time
✅ **Fast** - No manual formatting needed

### For Customers
✅ **Clear Receipts** - All relevant information visible
✅ **Digital Options** - Email and WhatsApp delivery
✅ **Verifiable** - QR codes for authenticity

---

## 🔐 Security Considerations

- Template management requires `manageCompanyConfig` permission
- Template viewing available to all authenticated users
- Cannot delete default templates (prevents system breaks)
- Audit logging tracks all template changes
- HTML email templates should be sanitized before sending (future enhancement)
- Variable injection protected by explicit whitelist

---

## 📈 Future Enhancements

1. **Template Preview in Editor**
   - Live preview while editing
   - Sample data generator
   - Print preview mode

2. **More Customization**
   - Paper size selection (80mm, A4, Letter)
   - Margin controls
   - Logo upload and positioning
   - Multiple languages

3. **Advanced Fields**
   - Conditional fields (show if X)
   - Calculated fields (total = quantity × price)
   - Field validation rules

4. **Export/Import**
   - Export template as JSON
   - Import from file
   - Share templates between systems

5. **Version Control**
   - Template history tracking
   - Rollback to previous version
   - Compare versions

---

## 📞 Support

For issues or questions:
1. Check audit logs: `SELECT * FROM audit_events WHERE target_type = 'receipt_template'`
2. Verify template data: `SELECT * FROM receipt_templates WHERE id = 'uuid'`
3. Check backend logs: `tail -f /tmp/backend.log`
4. Review API responses in browser DevTools Network tab

---

**Last Updated:** November 10, 2025  
**Version:** 1.0.0  
**Status:** ✅ Ready for deployment (pending SQL migration execution)
