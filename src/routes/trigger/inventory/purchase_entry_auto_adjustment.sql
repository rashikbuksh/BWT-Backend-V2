-- DROP EXISTING TRIGGER AND FUNCTION IF THEY EXIST
DROP TRIGGER IF EXISTS stock_after_purchase_entry_update ON store.purchase_entry;
DROP FUNCTION IF EXISTS stock_after_purchase_entry_update_function();

-- TRIGGER FUNCTIONS FOR AUTOMATIC PROVIDED_QUANTITY MANAGEMENT
CREATE OR REPLACE FUNCTION stock_after_purchase_entry_update_function()
RETURNS TRIGGER AS $$
DECLARE 
    old_warehouse_name TEXT;
    new_warehouse_name TEXT;
BEGIN
    -- Get old and new warehouse names
    SELECT assigned INTO old_warehouse_name FROM store.warehouse WHERE uuid = OLD.warehouse_uuid;
    SELECT assigned INTO new_warehouse_name FROM store.warehouse WHERE uuid = NEW.warehouse_uuid;
    IF old_warehouse_name <> new_warehouse_name OR OLD.provided_quantity <> NEW.provided_quantity THEN
        -- Adjust stock for old warehouse
        UPDATE inventory.product
        SET
            warehouse_1 = CASE WHEN old_warehouse_name = 'warehouse_1' THEN warehouse_1 - OLD.provided_quantity ELSE warehouse_1 END,
            warehouse_2 = CASE WHEN old_warehouse_name = 'warehouse_2' THEN warehouse_2 - OLD.provided_quantity ELSE warehouse_2 END,
            warehouse_3 = CASE WHEN old_warehouse_name = 'warehouse_3' THEN warehouse_3 - OLD.provided_quantity ELSE warehouse_3 END,
            warehouse_4 = CASE WHEN old_warehouse_name = 'warehouse_4' THEN warehouse_4 - OLD.provided_quantity ELSE warehouse_4 END,
            warehouse_5 = CASE WHEN old_warehouse_name = 'warehouse_5' THEN warehouse_5 - OLD.provided_quantity ELSE warehouse_5 END,
            warehouse_6 = CASE WHEN old_warehouse_name = 'warehouse_6' THEN warehouse_6 - OLD.provided_quantity ELSE warehouse_6 END,
            warehouse_7 = CASE WHEN old_warehouse_name = 'warehouse_7' THEN warehouse_7 - OLD.provided_quantity ELSE warehouse_7 END,
            warehouse_8 = CASE WHEN old_warehouse_name = 'warehouse_8' THEN warehouse_8 - OLD.provided_quantity ELSE warehouse_8 END,
            warehouse_9 = CASE WHEN old_warehouse_name = 'warehouse_9' THEN warehouse_9 - OLD.provided_quantity ELSE warehouse_9 END,
            warehouse_10 = CASE WHEN old_warehouse_name = 'warehouse_10' THEN warehouse_10 - OLD.provided_quantity ELSE warehouse_10 END,
            warehouse_11 = CASE WHEN old_warehouse_name = 'warehouse_11' THEN warehouse_11 - OLD.provided_quantity ELSE warehouse_11 END,
            warehouse_12 = CASE WHEN old_warehouse_name = 'warehouse_12' THEN warehouse_12 - OLD.provided_quantity ELSE warehouse_12 END
        WHERE uuid = OLD.product_uuid;

        -- Adjust stock for new warehouse
        UPDATE inventory.product
        SET
            warehouse_1 = CASE WHEN new_warehouse_name = 'warehouse_1' THEN warehouse_1 + NEW.provided_quantity ELSE warehouse_1 END,
            warehouse_2 = CASE WHEN new_warehouse_name = 'warehouse_2' THEN warehouse_2 + NEW.provided_quantity ELSE warehouse_2 END,
            warehouse_3 = CASE WHEN new_warehouse_name = 'warehouse_3' THEN warehouse_3 + NEW.provided_quantity ELSE warehouse_3 END,
            warehouse_4 = CASE WHEN new_warehouse_name = 'warehouse_4' THEN warehouse_4 + NEW.provided_quantity ELSE warehouse_4 END,
            warehouse_5 = CASE WHEN new_warehouse_name = 'warehouse_5' THEN warehouse_5 + NEW.provided_quantity ELSE warehouse_5 END,
            warehouse_6 = CASE WHEN new_warehouse_name = 'warehouse_6' THEN warehouse_6 + NEW.provided_quantity ELSE warehouse_6 END,
            warehouse_7 = CASE WHEN new_warehouse_name = 'warehouse_7' THEN warehouse_7 + NEW.provided_quantity ELSE warehouse_7 END,
            warehouse_8 = CASE WHEN new_warehouse_name = 'warehouse_8' THEN warehouse_8 + NEW.provided_quantity ELSE warehouse_8 END,
            warehouse_9 = CASE WHEN new_warehouse_name = 'warehouse_9' THEN warehouse_9 + NEW.provided_quantity ELSE warehouse_9 END,
            warehouse_10 = CASE WHEN new_warehouse_name = 'warehouse_10' THEN warehouse_10 + NEW.provided_quantity ELSE warehouse_10 END,
            warehouse_11 = CASE WHEN new_warehouse_name = 'warehouse_11' THEN warehouse_11 + NEW.provided_quantity ELSE warehouse_11 END,
            warehouse_12 = CASE WHEN new_warehouse_name = 'warehouse_12' THEN warehouse_12 + NEW.provided_quantity ELSE warehouse_12 END
        WHERE uuid = NEW.product_uuid;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CREATE TRIGGER FOR THE UPDATE FUNCTION
CREATE OR REPLACE TRIGGER stock_after_purchase_entry_update
AFTER UPDATE ON store.purchase_entry
FOR EACH ROW
EXECUTE FUNCTION stock_after_purchase_entry_update_function();