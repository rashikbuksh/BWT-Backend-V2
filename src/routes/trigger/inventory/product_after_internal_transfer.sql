-- DROP OLD TRIGGER AND FUNCTION IF EXISTS
DROP TRIGGER IF EXISTS product_after_internal_transfer_insert ON store.internal_transfer;
DROP FUNCTION IF EXISTS product_after_internal_transfer_insert_function ();
DROP TRIGGER IF EXISTS product_after_internal_transfer_delete ON store.internal_transfer;
DROP FUNCTION IF EXISTS product_after_internal_transfer_delete_function ();
DROP TRIGGER IF EXISTS product_after_internal_transfer_update ON store.internal_transfer;
DROP FUNCTION IF EXISTS product_after_internal_transfer_update_function ();

-- INSERT FUNCTION - Fixed to use single UPDATE
CREATE OR REPLACE FUNCTION inventory.product_after_internal_transfer_insert_function() RETURNS TRIGGER AS $$
DECLARE 
    from_warehouse_name TEXT;
    to_warehouse_name TEXT;
    product_uuid_new TEXT;
BEGIN
    SELECT assigned INTO from_warehouse_name FROM store.warehouse WHERE uuid = NEW.from_warehouse_uuid;
    SELECT assigned INTO to_warehouse_name FROM store.warehouse WHERE uuid = NEW.to_warehouse_uuid;

    -- Ensure product_uuid is set
    SELECT product_uuid INTO product_uuid_new FROM store.purchase_entry WHERE uuid = NEW.purchase_entry_uuid;
    
    -- Single UPDATE to handle both operations and prevent double processing
    UPDATE inventory.product
    SET
        warehouse_1 = warehouse_1 
            - CASE WHEN from_warehouse_name = 'warehouse_1' THEN NEW.quantity ELSE 0 END
            + CASE WHEN to_warehouse_name = 'warehouse_1' THEN NEW.quantity ELSE 0 END,
        warehouse_2 = warehouse_2 
            - CASE WHEN from_warehouse_name = 'warehouse_2' THEN NEW.quantity ELSE 0 END
            + CASE WHEN to_warehouse_name = 'warehouse_2' THEN NEW.quantity ELSE 0 END,
        warehouse_3 = warehouse_3 
            - CASE WHEN from_warehouse_name = 'warehouse_3' THEN NEW.quantity ELSE 0 END
            + CASE WHEN to_warehouse_name = 'warehouse_3' THEN NEW.quantity ELSE 0 END,
        warehouse_4 = warehouse_4 
            - CASE WHEN from_warehouse_name = 'warehouse_4' THEN NEW.quantity ELSE 0 END
            + CASE WHEN to_warehouse_name = 'warehouse_4' THEN NEW.quantity ELSE 0 END,
        warehouse_5 = warehouse_5 
            - CASE WHEN from_warehouse_name = 'warehouse_5' THEN NEW.quantity ELSE 0 END
            + CASE WHEN to_warehouse_name = 'warehouse_5' THEN NEW.quantity ELSE 0 END,
        warehouse_6 = warehouse_6 
            - CASE WHEN from_warehouse_name = 'warehouse_6' THEN NEW.quantity ELSE 0 END
            + CASE WHEN to_warehouse_name = 'warehouse_6' THEN NEW.quantity ELSE 0 END,
        warehouse_7 = warehouse_7 
            - CASE WHEN from_warehouse_name = 'warehouse_7' THEN NEW.quantity ELSE 0 END
            + CASE WHEN to_warehouse_name = 'warehouse_7' THEN NEW.quantity ELSE 0 END,
        warehouse_8 = warehouse_8 
            - CASE WHEN from_warehouse_name = 'warehouse_8' THEN NEW.quantity ELSE 0 END
            + CASE WHEN to_warehouse_name = 'warehouse_8' THEN NEW.quantity ELSE 0 END,
        warehouse_9 = warehouse_9 
            - CASE WHEN from_warehouse_name = 'warehouse_9' THEN NEW.quantity ELSE 0 END
            + CASE WHEN to_warehouse_name = 'warehouse_9' THEN NEW.quantity ELSE 0 END,
        warehouse_10 = warehouse_10 
            - CASE WHEN from_warehouse_name = 'warehouse_10' THEN NEW.quantity ELSE 0 END
            + CASE WHEN to_warehouse_name = 'warehouse_10' THEN NEW.quantity ELSE 0 END,
        warehouse_11 = warehouse_11 
            - CASE WHEN from_warehouse_name = 'warehouse_11' THEN NEW.quantity ELSE 0 END
            + CASE WHEN to_warehouse_name = 'warehouse_11' THEN NEW.quantity ELSE 0 END,
        warehouse_12 = warehouse_12 
            - CASE WHEN from_warehouse_name = 'warehouse_12' THEN NEW.quantity ELSE 0 END
            + CASE WHEN to_warehouse_name = 'warehouse_12' THEN NEW.quantity ELSE 0 END
    WHERE uuid = product_uuid_new;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- DELETE FUNCTION - Fixed to use single UPDATE and fix warehouse_8 typo
CREATE OR REPLACE FUNCTION inventory.product_after_internal_transfer_delete_function() RETURNS TRIGGER AS $$
DECLARE 
    from_warehouse_name TEXT;
    to_warehouse_name TEXT;
    product_uuid_old TEXT;
BEGIN
    SELECT assigned INTO from_warehouse_name FROM store.warehouse WHERE uuid = OLD.from_warehouse_uuid;
    SELECT assigned INTO to_warehouse_name FROM store.warehouse WHERE uuid = OLD.to_warehouse_uuid;

    -- Ensure product_uuid is set
    SELECT product_uuid INTO product_uuid_old FROM inventory.purchase_entry WHERE uuid = OLD.purchase_entry_uuid;
    
    -- Single UPDATE to reverse the transfer
    UPDATE inventory.product
    SET
        warehouse_1 = warehouse_1 
            + CASE WHEN from_warehouse_name = 'warehouse_1' THEN OLD.quantity ELSE 0 END
            - CASE WHEN to_warehouse_name = 'warehouse_1' THEN OLD.quantity ELSE 0 END,
        warehouse_2 = warehouse_2 
            + CASE WHEN from_warehouse_name = 'warehouse_2' THEN OLD.quantity ELSE 0 END
            - CASE WHEN to_warehouse_name = 'warehouse_2' THEN OLD.quantity ELSE 0 END,
        warehouse_3 = warehouse_3 
            + CASE WHEN from_warehouse_name = 'warehouse_3' THEN OLD.quantity ELSE 0 END
            - CASE WHEN to_warehouse_name = 'warehouse_3' THEN OLD.quantity ELSE 0 END,
        warehouse_4 = warehouse_4 
            + CASE WHEN from_warehouse_name = 'warehouse_4' THEN OLD.quantity ELSE 0 END
            - CASE WHEN to_warehouse_name = 'warehouse_4' THEN OLD.quantity ELSE 0 END,
        warehouse_5 = warehouse_5 
            + CASE WHEN from_warehouse_name = 'warehouse_5' THEN OLD.quantity ELSE 0 END
            - CASE WHEN to_warehouse_name = 'warehouse_5' THEN OLD.quantity ELSE 0 END,
        warehouse_6 = warehouse_6 
            + CASE WHEN from_warehouse_name = 'warehouse_6' THEN OLD.quantity ELSE 0 END
            - CASE WHEN to_warehouse_name = 'warehouse_6' THEN OLD.quantity ELSE 0 END,
        warehouse_7 = warehouse_7 
            + CASE WHEN from_warehouse_name = 'warehouse_7' THEN OLD.quantity ELSE 0 END
            - CASE WHEN to_warehouse_name = 'warehouse_7' THEN OLD.quantity ELSE 0 END,
        warehouse_8 = warehouse_8 
            + CASE WHEN from_warehouse_name = 'warehouse_8' THEN OLD.quantity ELSE 0 END
            - CASE WHEN to_warehouse_name = 'warehouse_8' THEN OLD.quantity ELSE 0 END,
        warehouse_9 = warehouse_9 
            + CASE WHEN from_warehouse_name = 'warehouse_9' THEN OLD.quantity ELSE 0 END
            - CASE WHEN to_warehouse_name = 'warehouse_9' THEN OLD.quantity ELSE 0 END,
        warehouse_10 = warehouse_10 
            + CASE WHEN from_warehouse_name = 'warehouse_10' THEN OLD.quantity ELSE 0 END
            - CASE WHEN to_warehouse_name = 'warehouse_10' THEN OLD.quantity ELSE 0 END,
        warehouse_11 = warehouse_11 
            + CASE WHEN from_warehouse_name = 'warehouse_11' THEN OLD.quantity ELSE 0 END
            - CASE WHEN to_warehouse_name = 'warehouse_11' THEN OLD.quantity ELSE 0 END,
        warehouse_12 = warehouse_12 
            + CASE WHEN from_warehouse_name = 'warehouse_12' THEN OLD.quantity ELSE 0 END
            - CASE WHEN to_warehouse_name = 'warehouse_12' THEN OLD.quantity ELSE 0 END
    WHERE uuid = product_uuid_old;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;
-- Trigger for update

CREATE OR REPLACE FUNCTION inventory.product_after_internal_transfer_update_function() RETURNS TRIGGER AS $$
DECLARE 
    old_from_warehouse_name TEXT;
    new_from_warehouse_name TEXT;
    old_to_warehouse_name TEXT;
    new_to_warehouse_name TEXT;
    product_uuid_old TEXT;
    product_uuid_new TEXT;
BEGIN
    -- Get old and new warehouse names
    SELECT assigned INTO old_from_warehouse_name FROM store.warehouse WHERE uuid = OLD.from_warehouse_uuid;
    SELECT assigned INTO new_from_warehouse_name FROM store.warehouse WHERE uuid = NEW.from_warehouse_uuid;
    SELECT assigned INTO old_to_warehouse_name FROM store.warehouse WHERE uuid = OLD.to_warehouse_uuid;
    SELECT assigned INTO new_to_warehouse_name FROM store.warehouse WHERE uuid = NEW.to_warehouse_uuid;

    -- Ensure product_uuid is set
    SELECT product_uuid INTO product_uuid_old FROM inventory.purchase_entry WHERE uuid = OLD.purchase_entry_uuid;
    SELECT product_uuid INTO product_uuid_new FROM inventory.purchase_entry WHERE uuid = NEW.purchase_entry_uuid;

    IF old_from_warehouse_name <> new_from_warehouse_name THEN
        -- Subtract from old warehouse
        UPDATE inventory.product
        SET
            warehouse_1 = CASE WHEN old_from_warehouse_name = 'warehouse_1' THEN warehouse_1 + OLD.quantity ELSE warehouse_1 END,
            warehouse_2 = CASE WHEN old_from_warehouse_name = 'warehouse_2' THEN warehouse_2 + OLD.quantity ELSE warehouse_2 END,
            warehouse_3 = CASE WHEN old_from_warehouse_name = 'warehouse_3' THEN warehouse_3 + OLD.quantity ELSE warehouse_3 END,
            warehouse_4 = CASE WHEN old_from_warehouse_name = 'warehouse_4' THEN warehouse_4 + OLD.quantity ELSE warehouse_4 END,
            warehouse_5 = CASE WHEN old_from_warehouse_name = 'warehouse_5' THEN warehouse_5 + OLD.quantity ELSE warehouse_5 END,
            warehouse_6 = CASE WHEN old_from_warehouse_name = 'warehouse_6' THEN warehouse_6 + OLD.quantity ELSE warehouse_6 END,
            warehouse_7 = CASE WHEN old_from_warehouse_name = 'warehouse_7' THEN warehouse_7 + OLD.quantity ELSE warehouse_7 END,
            warehouse_8 = CASE WHEN old_from_warehouse_name = 'warehouse_8' THEN warehouse_8 + OLD.quantity ELSE warehouse_8 END,
            warehouse_9 = CASE WHEN old_from_warehouse_name = 'warehouse_9' THEN warehouse_9 + OLD.quantity ELSE warehouse_9 END,
            warehouse_10 = CASE WHEN old_from_warehouse_name = 'warehouse_10' THEN warehouse_10 + OLD.quantity ELSE warehouse_10 END,
            warehouse_11 = CASE WHEN old_from_warehouse_name = 'warehouse_11' THEN warehouse_11 + OLD.quantity ELSE warehouse_11 END,
            warehouse_12 = CASE WHEN old_from_warehouse_name = 'warehouse_12' THEN warehouse_12 + OLD.quantity ELSE warehouse_12 END
        WHERE uuid = product_uuid_old;

        -- Add to new warehouse
        UPDATE inventory.product
        SET
            warehouse_1 = CASE WHEN new_from_warehouse_name = 'warehouse_1' THEN warehouse_1 - NEW.quantity ELSE warehouse_1 END,
            warehouse_2 = CASE WHEN new_from_warehouse_name = 'warehouse_2' THEN warehouse_2 - NEW.quantity ELSE warehouse_2 END,
            warehouse_3 = CASE WHEN new_from_warehouse_name = 'warehouse_3' THEN warehouse_3 - NEW.quantity ELSE warehouse_3 END,
            warehouse_4 = CASE WHEN new_from_warehouse_name = 'warehouse_4' THEN warehouse_4 - NEW.quantity ELSE warehouse_4 END,
            warehouse_5 = CASE WHEN new_from_warehouse_name = 'warehouse_5' THEN warehouse_5 - NEW.quantity ELSE warehouse_5 END,
            warehouse_6 = CASE WHEN new_from_warehouse_name = 'warehouse_6' THEN warehouse_6 - NEW.quantity ELSE warehouse_6 END,
            warehouse_7 = CASE WHEN new_from_warehouse_name = 'warehouse_7' THEN warehouse_7 - NEW.quantity ELSE warehouse_7 END,
            warehouse_8 = CASE WHEN new_from_warehouse_name = 'warehouse_8' THEN warehouse_8 - NEW.quantity ELSE warehouse_8 END,
            warehouse_9 = CASE WHEN new_from_warehouse_name = 'warehouse_9' THEN warehouse_9 - NEW.quantity ELSE warehouse_9 END,
            warehouse_10 = CASE WHEN new_from_warehouse_name = 'warehouse_10' THEN warehouse_10 - NEW.quantity ELSE warehouse_10 END,
            warehouse_11 = CASE WHEN new_from_warehouse_name = 'warehouse_11' THEN warehouse_11 - NEW.quantity ELSE warehouse_11 END,
            warehouse_12 = CASE WHEN new_from_warehouse_name = 'warehouse_12' THEN warehouse_12 - NEW.quantity ELSE warehouse_12 END
        WHERE uuid = product_uuid_new;
    ELSE
    -- Update the quantity in the same warehouse
        UPDATE inventory.product
        SET
            warehouse_1 = CASE WHEN old_from_warehouse_name = 'warehouse_1' THEN warehouse_1 + OLD.quantity - NEW.quantity ELSE warehouse_1 END,
            warehouse_2 = CASE WHEN old_from_warehouse_name = 'warehouse_2' THEN warehouse_2 + OLD.quantity - NEW.quantity ELSE warehouse_2 END,
            warehouse_3 = CASE WHEN old_from_warehouse_name = 'warehouse_3' THEN warehouse_3 + OLD.quantity - NEW.quantity ELSE warehouse_3 END,
            warehouse_4 = CASE WHEN old_from_warehouse_name = 'warehouse_4' THEN warehouse_4 + OLD.quantity - NEW.quantity ELSE warehouse_4 END,
            warehouse_5 = CASE WHEN old_from_warehouse_name = 'warehouse_5' THEN warehouse_5 + OLD.quantity - NEW.quantity ELSE warehouse_5 END,
            warehouse_6 = CASE WHEN old_from_warehouse_name = 'warehouse_6' THEN warehouse_6 + OLD.quantity - NEW.quantity ELSE warehouse_6 END,
            warehouse_7 = CASE WHEN old_from_warehouse_name = 'warehouse_7' THEN warehouse_7 + OLD.quantity - NEW.quantity ELSE warehouse_7 END,
            warehouse_8 = CASE WHEN old_from_warehouse_name = 'warehouse_8' THEN warehouse_8 + OLD.quantity - NEW.quantity ELSE warehouse_8 END,
            warehouse_9 = CASE WHEN old_from_warehouse_name = 'warehouse_9' THEN warehouse_9 + OLD.quantity - NEW.quantity ELSE warehouse_9 END,
            warehouse_10 = CASE WHEN old_from_warehouse_name = 'warehouse_10' THEN warehouse_10 + OLD.quantity - NEW.quantity ELSE warehouse_10 END,
            warehouse_11 = CASE WHEN old_from_warehouse_name = 'warehouse_11' THEN warehouse_11 + OLD.quantity - NEW.quantity ELSE warehouse_11 END,
            warehouse_12 = CASE WHEN old_from_warehouse_name = 'warehouse_12' THEN warehouse_12 + OLD.quantity - NEW.quantity ELSE warehouse_12 END
        WHERE uuid = product_uuid_new;
          
    END IF;

    IF old_to_warehouse_name <> new_to_warehouse_name THEN
        -- Subtract from old warehouse
        UPDATE inventory.product
        SET
            warehouse_1 = CASE WHEN old_to_warehouse_name = 'warehouse_1' THEN warehouse_1 - OLD.quantity ELSE warehouse_1 END,
            warehouse_2 = CASE WHEN old_to_warehouse_name = 'warehouse_2' THEN warehouse_2 - OLD.quantity ELSE warehouse_2 END,
            warehouse_3 = CASE WHEN old_to_warehouse_name = 'warehouse_3' THEN warehouse_3 - OLD.quantity ELSE warehouse_3 END,
            warehouse_4 = CASE WHEN old_to_warehouse_name = 'warehouse_4' THEN warehouse_4 - OLD.quantity ELSE warehouse_4 END,
            warehouse_5 = CASE WHEN old_to_warehouse_name = 'warehouse_5' THEN warehouse_5 - OLD.quantity ELSE warehouse_5 END,
            warehouse_6 = CASE WHEN old_to_warehouse_name = 'warehouse_6' THEN warehouse_6 - OLD.quantity ELSE warehouse_6 END,
            warehouse_7 = CASE WHEN old_to_warehouse_name = 'warehouse_7' THEN warehouse_7 - OLD.quantity ELSE warehouse_7 END,
            warehouse_8 = CASE WHEN old_to_warehouse_name = 'warehouse_8' THEN warehouse_8 - OLD.quantity ELSE warehouse_8 END,
            warehouse_9 = CASE WHEN old_to_warehouse_name = 'warehouse_9' THEN warehouse_9 - OLD.quantity ELSE warehouse_9 END,
            warehouse_10 = CASE WHEN old_to_warehouse_name = 'warehouse_10' THEN warehouse_10 - OLD.quantity ELSE warehouse_10 END,
            warehouse_11 = CASE WHEN old_to_warehouse_name = 'warehouse_11' THEN warehouse_11 - OLD.quantity ELSE warehouse_11 END,
            warehouse_12 = CASE WHEN old_to_warehouse_name = 'warehouse_12' THEN warehouse_12 - OLD.quantity ELSE warehouse_12 END
        WHERE uuid = product_uuid_old;

        -- Add to new warehouse
        UPDATE inventory.product
        SET
            warehouse_1 = CASE WHEN new_to_warehouse_name = 'warehouse_1' THEN warehouse_1 + NEW.quantity ELSE warehouse_1 END,
            warehouse_2 = CASE WHEN new_to_warehouse_name = 'warehouse_2' THEN warehouse_2 + NEW.quantity ELSE warehouse_2 END,
            warehouse_3 = CASE WHEN new_to_warehouse_name = 'warehouse_3' THEN warehouse_3 + NEW.quantity ELSE warehouse_3 END,
            warehouse_4 = CASE WHEN new_to_warehouse_name = 'warehouse_4' THEN warehouse_4 + NEW.quantity ELSE warehouse_4 END,
            warehouse_5 = CASE WHEN new_to_warehouse_name = 'warehouse_5' THEN warehouse_5 + NEW.quantity ELSE warehouse_5 END,
            warehouse_6 = CASE WHEN new_to_warehouse_name = 'warehouse_6' THEN warehouse_6 + NEW.quantity ELSE warehouse_6 END,
            warehouse_7 = CASE WHEN new_to_warehouse_name = 'warehouse_7' THEN warehouse_7 + NEW.quantity ELSE warehouse_7 END,
            warehouse_8 = CASE WHEN new_to_warehouse_name = 'warehouse_8' THEN warehouse_8 + NEW.quantity ELSE warehouse_8 END,
            warehouse_9 = CASE WHEN new_to_warehouse_name = 'warehouse_9' THEN warehouse_9 + NEW.quantity ELSE warehouse_9 END,
            warehouse_10 = CASE WHEN new_to_warehouse_name = 'warehouse_10' THEN warehouse_10 + NEW.quantity ELSE warehouse_10 END,
            warehouse_11 = CASE WHEN new_to_warehouse_name = 'warehouse_11' THEN warehouse_11 + NEW.quantity ELSE warehouse_11 END,
            warehouse_12 = CASE WHEN new_to_warehouse_name = 'warehouse_12' THEN warehouse_12 + NEW.quantity ELSE warehouse_12 END
        WHERE uuid = product_uuid_new;
    ELSE
    -- Update the quantity in the same warehouse
        UPDATE inventory.product
        SET
            warehouse_1 = CASE WHEN old_to_warehouse_name = 'warehouse_1' THEN warehouse_1 - OLD.quantity + NEW.quantity ELSE warehouse_1 END,
            warehouse_2 = CASE WHEN old_to_warehouse_name = 'warehouse_2' THEN warehouse_2 - OLD.quantity + NEW.quantity ELSE warehouse_2 END,
            warehouse_3 = CASE WHEN old_to_warehouse_name = 'warehouse_3' THEN warehouse_3 - OLD.quantity + NEW.quantity ELSE warehouse_3 END,
            warehouse_4 = CASE WHEN old_to_warehouse_name = 'warehouse_4' THEN warehouse_4 - OLD.quantity + NEW.quantity ELSE warehouse_4 END,
            warehouse_5 = CASE WHEN old_to_warehouse_name = 'warehouse_5' THEN warehouse_5 - OLD.quantity + NEW.quantity ELSE warehouse_5 END,
            warehouse_6 = CASE WHEN old_to_warehouse_name = 'warehouse_6' THEN warehouse_6 - OLD.quantity + NEW.quantity ELSE warehouse_6 END,
            warehouse_7 = CASE WHEN old_to_warehouse_name = 'warehouse_7' THEN warehouse_7 - OLD.quantity + NEW.quantity ELSE warehouse_7 END,
            warehouse_8 = CASE WHEN old_to_warehouse_name = 'warehouse_8' THEN warehouse_8 - OLD.quantity + NEW.quantity ELSE warehouse_8 END,
            warehouse_9 = CASE WHEN old_to_warehouse_name = 'warehouse_9' THEN warehouse_9 - OLD.quantity + NEW.quantity ELSE warehouse_9 END,
            warehouse_10 = CASE WHEN old_to_warehouse_name = 'warehouse_10' THEN warehouse_10 - OLD.quantity + NEW.quantity ELSE warehouse_10 END,
            warehouse_11 = CASE WHEN old_to_warehouse_name = 'warehouse_11' THEN warehouse_11 - OLD.quantity + NEW.quantity ELSE warehouse_11 END,
            warehouse_12 = CASE WHEN old_to_warehouse_name = 'warehouse_12' THEN warehouse_12 - OLD.quantity + NEW.quantity ELSE warehouse_12 END
        WHERE uuid = product_uuid_new;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for insert
CREATE OR REPLACE TRIGGER product_after_internal_transfer_insert
AFTER INSERT ON inventory.internal_transfer
FOR EACH ROW
EXECUTE FUNCTION inventory.product_after_internal_transfer_insert_function();

-- Trigger for delete
CREATE OR REPLACE TRIGGER product_after_internal_transfer_delete
AFTER DELETE ON inventory.internal_transfer
FOR EACH ROW
EXECUTE FUNCTION inventory.product_after_internal_transfer_delete_function();

-- Trigger for update
CREATE OR REPLACE TRIGGER product_after_internal_transfer_update
AFTER UPDATE ON inventory.internal_transfer
FOR EACH ROW
EXECUTE FUNCTION inventory.product_after_internal_transfer_update_function();

