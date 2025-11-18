-- Migration: Add custom_template_text columns to receipt_templates table
-- Run this in your Supabase SQL Editor

-- Add 'custom_template_text' column if it doesn't exist (for general_receipt and monthly_payment)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'receipt_templates' 
        AND column_name = 'custom_template_text'
    ) THEN
        ALTER TABLE receipt_templates 
        ADD COLUMN custom_template_text TEXT;
        
        RAISE NOTICE 'Column "custom_template_text" added to receipt_templates table.';
    ELSE
        RAISE NOTICE 'Column "custom_template_text" already exists in receipt_templates table.';
    END IF;
END
$$;

-- Add 'custom_template_text_entry' column if it doesn't exist (for parking_ticket entry)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'receipt_templates' 
        AND column_name = 'custom_template_text_entry'
    ) THEN
        ALTER TABLE receipt_templates 
        ADD COLUMN custom_template_text_entry TEXT;
        
        RAISE NOTICE 'Column "custom_template_text_entry" added to receipt_templates table.';
    ELSE
        RAISE NOTICE 'Column "custom_template_text_entry" already exists in receipt_templates table.';
    END IF;
END
$$;

-- Add 'custom_template_text_exit' column if it doesn't exist (for parking_ticket exit)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'receipt_templates' 
        AND column_name = 'custom_template_text_exit'
    ) THEN
        ALTER TABLE receipt_templates 
        ADD COLUMN custom_template_text_exit TEXT;
        
        RAISE NOTICE 'Column "custom_template_text_exit" added to receipt_templates table.';
    ELSE
        RAISE NOTICE 'Column "custom_template_text_exit" already exists in receipt_templates table.';
    END IF;
END
$$;

-- Add comments to document the columns
COMMENT ON COLUMN receipt_templates.custom_template_text IS 'Free text template for custom receipt printing layout (general_receipt, monthly_payment). Supports variables like {{receiptNumber}}, {{date}}, {{time}}, etc.';
COMMENT ON COLUMN receipt_templates.custom_template_text_entry IS 'Free text template for parking ticket entry. Supports variables like {{receiptNumber}}, {{date}}, {{time}}, {{plate}}, {{vehicleType}}, {{entryTime}}, {{operator}}';
COMMENT ON COLUMN receipt_templates.custom_template_text_exit IS 'Free text template for parking ticket exit. Supports variables like {{receiptNumber}}, {{date}}, {{time}}, {{plate}}, {{vehicleType}}, {{entryTime}}, {{exitTime}}, {{duration}}, {{rate}}, {{value}}, {{paymentMethod}}, {{operator}}';

