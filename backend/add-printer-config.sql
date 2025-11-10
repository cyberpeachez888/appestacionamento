-- Add Printer Configuration to Company Config
-- Run this in Supabase SQL Editor

-- Add printer_config column to store printer settings
ALTER TABLE company_config 
ADD COLUMN IF NOT EXISTS printer_config JSONB DEFAULT '{
  "printerModel": "Generic ESC/POS",
  "paperWidth": "80mm",
  "connectionType": "usb",
  "autoprint": false,
  "defaultPrinter": "",
  "enableCut": true,
  "enableBeep": false,
  "enableDrawer": false,
  "logoUrl": "",
  "logoEnabled": false,
  "headerText": "",
  "footerText": "Obrigado pela preferência!",
  "fontSize": "normal",
  "lineSpacing": "normal",
  "margins": {
    "top": 10,
    "bottom": 10,
    "left": 5,
    "right": 5
  }
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN company_config.printer_config IS 'Thermal printer configuration including model, connection, layout settings, and ESC/POS features';

-- Verify the update
SELECT id, name, printer_config FROM company_config WHERE id = 'default';
