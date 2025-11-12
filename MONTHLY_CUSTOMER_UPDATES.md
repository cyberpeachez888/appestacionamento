# Monthly Customer Registration Updates

## Overview

Enhanced the monthly customer registration system with improved UX, additional fields, and automatic receipt generation.

## Database Changes

Run the migration script in your Supabase SQL Editor:

```bash
backend/update-monthly-customers-schema.sql
```

This adds:

- `cpf` TEXT field for customer CPF
- `phone` TEXT field for customer phone number
- `plates` JSONB field (array of vehicle plates)
- `operator_name` TEXT field for the operator who registered the customer

## Backend Changes

### New Endpoint

- `GET /monthlyCustomers/:id/receipt` - Generates receipt data with customer, payment, and company info

### Updated Controller

- `monthlyController.create` now accepts: cpf, phone, plates (array), operatorName
- `monthlyController.list` parses JSONB plates to array for frontend
- `monthlyController.getReceipt` provides complete receipt data

## Frontend Changes

### CustomerDialog Enhancements

1. **Plate Management**
   - No initial editable input field
   - Click "+ Adicionar Placa" to show new input
   - Press Enter to confirm and disable the field
   - Edit ✏️ and Delete 🗑️ buttons for each plate
   - Maximum 5 vehicles per customer

2. **Required Fields**
   - Name (existing)
   - CPF (new, with mask: XXX.XXX.XXX-XX)
   - Phone (new, with mask: (XX) XXXXX-XXXX)
   - At least one vehicle plate

3. **Contract Information**
   - Displays current date and time as contract timestamp
   - Shows operator name field (optional)

4. **Payment Section**
   - Active by default for immediate payment
   - Payment methods: Dinheiro, Pix, Cartão Débito, Cartão Crédito
   - Automatic change calculation for cash payments

5. **Button Update**
   - Changed from "Adicionar" to "Salvar + Imprimir Recibo"
   - Green background color for emphasis
   - Automatically generates and prints receipt on save

6. **Receipt Generation**
   - Professional printable format
   - Includes: customer data, vehicle plates, payment info, contract details
   - Company information (name, CNPJ, address, phone)
   - Operator name if provided
   - Automatic print dialog

## Usage

1. Click "Adicionar Cliente" on Mensalistas page
2. Fill in customer name, CPF, and phone
3. Add vehicle plates (1-5 plates)
4. Set monthly value
5. Choose payment method and complete payment info
6. Optionally enter operator name
7. Click "Salvar + Imprimir Recibo"
8. Receipt opens in new window with print dialog

## Testing

Before using in production:

1. Run the database migration in Supabase
2. Test customer creation with all field types
3. Verify plate management (add, edit, delete)
4. Test receipt generation and printing
5. Verify data persistence and retrieval
