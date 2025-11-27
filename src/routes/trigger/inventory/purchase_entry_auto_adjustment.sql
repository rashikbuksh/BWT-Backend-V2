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
        UPDATE store.stock
        SET
            warehouse_1 = CASE WHEN old_warehouse_name = 'warehouse_1' THEN warehouse_1 - OLD.provided_quantity ELSE warehouse_1 END,
            warehouse_2 = CASE WHEN old_warehouse_name = 'warehouse_2' THEN warehouse_2 - OLD.provided_quantity ELSE warehouse_2 END,
            warehouse_3 = CASE WHEN old_warehouse_name = 'warehouse_3' THEN warehouse_3 - OLD.provided_quantity ELSE warehouse_3 END
        WHERE uuid = OLD.stock_uuid;

        -- Adjust stock for new warehouse
        UPDATE store.stock
        SET
            warehouse_1 = CASE WHEN new_warehouse_name = 'warehouse_1' THEN warehouse_1 + NEW.provided_quantity ELSE warehouse_1 END,
            warehouse_2 = CASE WHEN new_warehouse_name = 'warehouse_2' THEN warehouse_2 + NEW.provided_quantity ELSE warehouse_2 END,
            warehouse_3 = CASE WHEN new_warehouse_name = 'warehouse_3' THEN warehouse_3 + NEW.provided_quantity ELSE warehouse_3 END
        WHERE uuid = NEW.stock_uuid;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;