-- inserted into database
CREATE OR REPLACE FUNCTION product_after_purchase_entry_insert_function() RETURNS TRIGGER AS $$
DECLARE 
    warehouse_name TEXT;
BEGIN
    SELECT assigned INTO warehouse_name FROM store.warehouse WHERE uuid = NEW.warehouse_uuid;
    
    UPDATE store.product
    SET
        warehouse_1 = CASE WHEN warehouse_name = 'warehouse_1' THEN warehouse_1 + NEW.quantity ELSE warehouse_1 END,
        warehouse_2 = CASE WHEN warehouse_name = 'warehouse_2' THEN warehouse_2 + NEW.quantity ELSE warehouse_2 END,
        warehouse_3 = CASE WHEN warehouse_name = 'warehouse_3' THEN warehouse_3 + NEW.quantity ELSE warehouse_3 END,
        warehouse_4 = CASE WHEN warehouse_name = 'warehouse_4' THEN warehouse_4 + NEW.quantity ELSE warehouse_4 END,
        warehouse_5 = CASE WHEN warehouse_name = 'warehouse_5' THEN warehouse_5 + NEW.quantity ELSE warehouse_5 END,
        warehouse_6 = CASE WHEN warehouse_name = 'warehouse_6' THEN warehouse_6 + NEW.quantity ELSE warehouse_6 END,
        warehouse_7 = CASE WHEN warehouse_name = 'warehouse_7' THEN warehouse_7 + NEW.quantity ELSE warehouse_7 END,
        warehouse_8 = CASE WHEN warehouse_name = 'warehouse_8' THEN warehouse_8 + NEW.quantity ELSE warehouse_8 END,
        warehouse_9 = CASE WHEN warehouse_name = 'warehouse_9' THEN warehouse_9 + NEW.quantity ELSE warehouse_9 END,
        warehouse_10 = CASE WHEN warehouse_name = 'warehouse_10' THEN warehouse_10 + NEW.quantity ELSE warehouse_10 END,
        warehouse_11 = CASE WHEN warehouse_name = 'warehouse_11' THEN warehouse_11 + NEW.quantity ELSE warehouse_11 END,
        warehouse_12 = CASE WHEN warehouse_name = 'warehouse_12' THEN warehouse_12 + NEW.quantity ELSE warehouse_12 END
    WHERE uuid = NEW.product_uuid;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Delete Trigger
CREATE OR REPLACE FUNCTION product_after_purchase_entry_delete_function() RETURNS TRIGGER AS $$
DECLARE 
    warehouse_name TEXT;
BEGIN
    SELECT assigned INTO warehouse_name FROM store.warehouse WHERE uuid = OLD.warehouse_uuid;
    
    UPDATE store.product
    SET
        warehouse_1 = CASE WHEN warehouse_name = 'warehouse_1' THEN warehouse_1 - OLD.quantity ELSE warehouse_1 END,
        warehouse_2 = CASE WHEN warehouse_name = 'warehouse_2' THEN warehouse_2 - OLD.quantity ELSE warehouse_2 END,
        warehouse_3 = CASE WHEN warehouse_name = 'warehouse_3' THEN warehouse_3 - OLD.quantity ELSE warehouse_3 END,
        warehouse_4 = CASE WHEN warehouse_name = 'warehouse_4' THEN warehouse_4 - OLD.quantity ELSE warehouse_4 END,
        warehouse_5 = CASE WHEN warehouse_name = 'warehouse_5' THEN warehouse_5 - OLD.quantity ELSE warehouse_5 END,
        warehouse_6 = CASE WHEN warehouse_name = 'warehouse_6' THEN warehouse_6 - OLD.quantity ELSE warehouse_6 END,
        warehouse_7 = CASE WHEN warehouse_name = 'warehouse_7' THEN warehouse_7 - OLD.quantity ELSE warehouse_7 END,
        warehouse_8 = CASE WHEN warehouse_name = 'warehouse_8' THEN warehouse_8 - OLD.quantity ELSE warehouse_8 END,
        warehouse_9 = CASE WHEN warehouse_name = 'warehouse_9' THEN warehouse_9 - OLD.quantity ELSE warehouse_9 END,
        warehouse_10 = CASE WHEN warehouse_name = 'warehouse_10' THEN warehouse_10 - OLD.quantity ELSE warehouse_10 END,
        warehouse_11 = CASE WHEN warehouse_name = 'warehouse_11' THEN warehouse_11 - OLD.quantity ELSE warehouse_11 END,
        warehouse_12 = CASE WHEN warehouse_name = 'warehouse_12' THEN warehouse_12 - OLD.quantity ELSE warehouse_12 END
    WHERE uuid = OLD.product_uuid;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Update Trigger (handles warehouse changes)
CREATE OR REPLACE FUNCTION product_after_purchase_entry_update_function() RETURNS TRIGGER AS $$
DECLARE 
    old_warehouse_name TEXT;
    new_warehouse_name TEXT;
BEGIN
    -- Get old and new warehouse names
    SELECT assigned INTO old_warehouse_name FROM store.warehouse WHERE uuid = OLD.warehouse_uuid;
    SELECT assigned INTO new_warehouse_name FROM store.warehouse WHERE uuid = NEW.warehouse_uuid;

    IF old_warehouse_name <> new_warehouse_name THEN
        -- Subtract from old warehouse
        UPDATE store.product
        SET
            warehouse_1 = CASE WHEN old_warehouse_name = 'warehouse_1' THEN warehouse_1 - OLD.quantity ELSE warehouse_1 END,
            warehouse_2 = CASE WHEN old_warehouse_name = 'warehouse_2' THEN warehouse_2 - OLD.quantity ELSE warehouse_2 END,
            warehouse_3 = CASE WHEN old_warehouse_name = 'warehouse_3' THEN warehouse_3 - OLD.quantity ELSE warehouse_3 END,
            warehouse_4 = CASE WHEN old_warehouse_name = 'warehouse_4' THEN warehouse_4 - OLD.quantity ELSE warehouse_4 END,
            warehouse_5 = CASE WHEN old_warehouse_name = 'warehouse_5' THEN warehouse_5 - OLD.quantity ELSE warehouse_5 END,
            warehouse_6 = CASE WHEN old_warehouse_name = 'warehouse_6' THEN warehouse_6 - OLD.quantity ELSE warehouse_6 END,
            warehouse_7 = CASE WHEN old_warehouse_name = 'warehouse_7' THEN warehouse_7 - OLD.quantity ELSE warehouse_7 END,
            warehouse_8 = CASE WHEN old_warehouse_name = 'warehouse_8' THEN warehouse_7 - OLD.quantity ELSE warehouse_8 END,
            warehouse_9 = CASE WHEN old_warehouse_name = 'warehouse_9' THEN warehouse_9 - OLD.quantity ELSE warehouse_9 END,
            warehouse_10 = CASE WHEN old_warehouse_name = 'warehouse_10' THEN warehouse_10 - OLD.quantity ELSE warehouse_10 END,
            warehouse_11 = CASE WHEN old_warehouse_name = 'warehouse_11' THEN warehouse_11 - OLD.quantity ELSE warehouse_11 END,
            warehouse_12 = CASE WHEN old_warehouse_name = 'warehouse_12' THEN warehouse_12 - OLD.quantity ELSE warehouse_12 END

        WHERE uuid = OLD.product_uuid;

        -- Add to new warehouse
        UPDATE store.product
        SET
            warehouse_1 = CASE WHEN new_warehouse_name = 'warehouse_1' THEN warehouse_1 + NEW.quantity ELSE warehouse_1 END,
            warehouse_2 = CASE WHEN new_warehouse_name = 'warehouse_2' THEN warehouse_2 + NEW.quantity ELSE warehouse_2 END,
            warehouse_3 = CASE WHEN new_warehouse_name = 'warehouse_3' THEN warehouse_3 + NEW.quantity ELSE warehouse_3 END,
            warehouse_4 = CASE WHEN new_warehouse_name = 'warehouse_4' THEN warehouse_4 + NEW.quantity ELSE warehouse_4 END,
            warehouse_5 = CASE WHEN new_warehouse_name = 'warehouse_5' THEN warehouse_5 + NEW.quantity ELSE warehouse_5 END,
            warehouse_6 = CASE WHEN new_warehouse_name = 'warehouse_6' THEN warehouse_6 + NEW.quantity ELSE warehouse_6 END,
            warehouse_7 = CASE WHEN new_warehouse_name = 'warehouse_7' THEN warehouse_7 + NEW.quantity ELSE warehouse_7 END,
            warehouse_8 = CASE WHEN new_warehouse_name = 'warehouse_8' THEN warehouse_8 + NEW.quantity ELSE warehouse_8 END,
            warehouse_9 = CASE WHEN new_warehouse_name = 'warehouse_9' THEN warehouse_9 + NEW.quantity ELSE warehouse_9 END,
            warehouse_10 = CASE WHEN new_warehouse_name = 'warehouse_10' THEN warehouse_10 + NEW.quantity ELSE warehouse_10 END,
            warehouse_11 = CASE WHEN new_warehouse_name = 'warehouse_11' THEN warehouse_11 + NEW.quantity ELSE warehouse_11 END,
            warehouse_12 = CASE WHEN new_warehouse_name = 'warehouse_12' THEN warehouse_12 + NEW.quantity ELSE warehouse_12 END
        WHERE uuid = NEW.product_uuid;
        
    ELSE
        -- Update the quantity in the same warehouse
        UPDATE store.product
        SET
            warehouse_1 = CASE WHEN old_warehouse_name = 'warehouse_1' THEN warehouse_1 - OLD.quantity + NEW.quantity ELSE warehouse_1 END,
            warehouse_2 = CASE WHEN old_warehouse_name = 'warehouse_2' THEN warehouse_2 - OLD.quantity + NEW.quantity ELSE warehouse_2 END,
            warehouse_3 = CASE WHEN old_warehouse_name = 'warehouse_3' THEN warehouse_3 - OLD.quantity + NEW.quantity ELSE warehouse_3 END,
            warehouse_4 = CASE WHEN old_warehouse_name = 'warehouse_4' THEN warehouse_4 - OLD.quantity + NEW.quantity ELSE warehouse_4 END,
            warehouse_5 = CASE WHEN old_warehouse_name = 'warehouse_5' THEN warehouse_5 - OLD.quantity + NEW.quantity ELSE warehouse_5 END,
            warehouse_6 = CASE WHEN old_warehouse_name = 'warehouse_6' THEN warehouse_6 - OLD.quantity + NEW.quantity ELSE warehouse_6 END,
            warehouse_7 = CASE WHEN old_warehouse_name = 'warehouse_7' THEN warehouse_7 - OLD.quantity + NEW.quantity ELSE warehouse_7 END,
            warehouse_8 = CASE WHEN old_warehouse_name = 'warehouse_8' THEN warehouse_8 - OLD.quantity + NEW.quantity ELSE warehouse_8 END,
            warehouse_9 = CASE WHEN old_warehouse_name = 'warehouse_9' THEN warehouse_9 - OLD.quantity + NEW.quantity ELSE warehouse_9 END,
            warehouse_10 = CASE WHEN old_warehouse_name = 'warehouse_10' THEN warehouse_10 - OLD.quantity + NEW.quantity ELSE warehouse_10 END,
            warehouse_11 = CASE WHEN old_warehouse_name = 'warehouse_11' THEN warehouse_11 - OLD.quantity + NEW.quantity ELSE warehouse_11 END,
            warehouse_12 = CASE WHEN old_warehouse_name = 'warehouse_12' THEN warehouse_12 - OLD.quantity + NEW.quantity ELSE warehouse_12 END
        WHERE uuid = NEW.product_uuid;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for insert
CREATE OR REPLACE TRIGGER product_after_purchase_entry_insert
AFTER INSERT ON store.purchase_entry
FOR EACH ROW
EXECUTE FUNCTION product_after_purchase_entry_insert_function();

-- Trigger for delete
CREATE OR REPLACE TRIGGER product_after_purchase_entry_delete
AFTER DELETE ON store.purchase_entry
FOR EACH ROW
EXECUTE FUNCTION product_after_purchase_entry_delete_function();

-- Trigger for update
CREATE OR REPLACE TRIGGER product_after_purchase_entry_update
AFTER UPDATE ON store.purchase_entry
FOR EACH ROW
EXECUTE FUNCTION product_after_purchase_entry_update_function();