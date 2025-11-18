-- Migration: Add custom_template_text column to receipt_templates table
-- Run this in your Supabase SQL Editor

-- Add 'custom_template_text' column if it doesn't exist
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

-- Add comment to document the column
COMMENT ON COLUMN receipt_templates.custom_template_text IS 'Free text template for custom receipt printing layout. Supports variables like {{receiptNumber}}, {{date}}, {{time}}, etc.';

