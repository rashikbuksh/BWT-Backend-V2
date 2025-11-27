-- ! NOT NEEDED ANYMORE
-- DROP OLD TRIGGERS AND FUNCTIONS
DROP TRIGGER IF EXISTS stock_after_purchase_entry_delete ON store.purchase_entry;
DROP FUNCTION IF EXISTS stock_after_purchase_entry_delete_function ();
DROP TRIGGER IF EXISTS stock_after_purchase_entry_update ON store.purchase_entry;
DROP FUNCTION IF EXISTS stock_after_purchase_entry_update_function ();
DROP TRIGGER IF EXISTS stock_after_purchase_entry ON store.purchase_entry;
DROP FUNCTION IF EXISTS stock_after_purchase_entry_insert_function ();
-- DELETED
-- Insert Trigger
CREATE OR REPLACE FUNCTION stock_after_purchase_entry_insert_function() RETURNS TRIGGER AS $$
DECLARE 
    warehouse_name TEXT; 
BEGIN
    SELECT name INTO warehouse_name FROM store.warehouse WHERE uuid = NEW.warehouse_uuid;
    
    UPDATE store.stock
    SET
        warehouse_1 = CASE WHEN warehouse_name = 'warehouse_1' THEN warehouse_1 + NEW.quantity ELSE warehouse_1 END,
        warehouse_2 = CASE WHEN warehouse_name = 'warehouse_2' THEN warehouse_2 + NEW.quantity ELSE warehouse_2 END,
        warehouse_3 = CASE WHEN warehouse_name = 'warehouse_3' THEN warehouse_3 + NEW.quantity ELSE warehouse_3 END
    WHERE uuid = NEW.stock_uuid;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Delete Trigger
CREATE OR REPLACE FUNCTION stock_after_purchase_entry_delete_function() RETURNS TRIGGER AS $$
DECLARE 
    warehouse_name TEXT; 
BEGIN
    SELECT name INTO warehouse_name FROM store.warehouse WHERE uuid = OLD.warehouse_uuid;
    
    UPDATE store.stock
    SET
        warehouse_1 = CASE WHEN warehouse_name = 'warehouse_1' THEN warehouse_1 - OLD.quantity ELSE warehouse_1 END,
        warehouse_2 = CASE WHEN warehouse_name = 'warehouse_2' THEN warehouse_2 - OLD.quantity ELSE warehouse_2 END,
        warehouse_3 = CASE WHEN warehouse_name = 'warehouse_3' THEN warehouse_3 - OLD.quantity ELSE warehouse_3 END
    WHERE uuid = OLD.stock_uuid;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Update Trigger (handles warehouse changes)
CREATE OR REPLACE FUNCTION stock_after_purchase_entry_update_function() RETURNS TRIGGER AS $$
DECLARE 
    old_warehouse_name TEXT;
    new_warehouse_name TEXT;
BEGIN
    -- Get old and new warehouse names
    SELECT name INTO old_warehouse_name FROM store.warehouse WHERE uuid = OLD.warehouse_uuid;
    SELECT name INTO new_warehouse_name FROM store.warehouse WHERE uuid = NEW.warehouse_uuid;

    IF old_warehouse_name <> new_warehouse_name THEN
        -- Subtract from old warehouse
        UPDATE store.stock
        SET
            warehouse_1 = CASE WHEN old_warehouse_name = 'warehouse_1' THEN warehouse_1 - OLD.quantity ELSE warehouse_1 END,
            warehouse_2 = CASE WHEN old_warehouse_name = 'warehouse_2' THEN warehouse_2 - OLD.quantity ELSE warehouse_2 END,
            warehouse_3 = CASE WHEN old_warehouse_name = 'warehouse_3' THEN warehouse_3 - OLD.quantity ELSE warehouse_3 END
        WHERE uuid = OLD.stock_uuid;

        -- Add to new warehouse
        UPDATE store.stock
        SET
            warehouse_1 = CASE WHEN new_warehouse_name = 'warehouse_1' THEN warehouse_1 + NEW.quantity ELSE warehouse_1 END,
            warehouse_2 = CASE WHEN new_warehouse_name = 'warehouse_2' THEN warehouse_2 + NEW.quantity ELSE warehouse_2 END,
            warehouse_3 = CASE WHEN new_warehouse_name = 'warehouse_3' THEN warehouse_3 + NEW.quantity ELSE warehouse_3 END
        WHERE uuid = NEW.stock_uuid;
    ELSE
        -- Same warehouse, update quantity difference
        UPDATE store.stock
        SET
            warehouse_1 = CASE WHEN new_warehouse_name = 'warehouse_1' THEN warehouse_1 + (NEW.quantity - OLD.quantity) ELSE warehouse_1 END,
            warehouse_2 = CASE WHEN new_warehouse_name = 'warehouse_2' THEN warehouse_2 + (NEW.quantity - OLD.quantity) ELSE warehouse_2 END,
            warehouse_3 = CASE WHEN new_warehouse_name = 'warehouse_3' THEN warehouse_3 + (NEW.quantity - OLD.quantity) ELSE warehouse_3 END
        WHERE uuid = NEW.stock_uuid;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers remain the same
CREATE OR REPLACE TRIGGER stock_after_purchase_entry
AFTER INSERT ON inventory.purchase_entry
FOR EACH ROW
EXECUTE FUNCTION stock_after_purchase_entry_insert_function();

CREATE OR REPLACE TRIGGER stock_after_purchase_entry_delete
AFTER DELETE ON inventory.purchase_entry
FOR EACH ROW
EXECUTE FUNCTION stock_after_purchase_entry_delete_function();

CREATE OR REPLACE TRIGGER stock_after_purchase_entry_update
AFTER UPDATE ON inventory.purchase_entry
FOR EACH ROW
EXECUTE FUNCTION stock_after_purchase_entry_update_function();