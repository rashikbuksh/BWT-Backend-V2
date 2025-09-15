-- CREATE OR REPLACE FUNCTION product_variant_after_bill_info_and_ordered_insert_update_function()
-- RETURNS TRIGGER AS $$
-- DECLARE 
--     selling_quantity INTEGER; 
--     product_variant_uuid_v2 TEXT;
-- BEGIN
--     -- Select quantity and product_variant_uuid from store.ordered based on bill_info_uuid
--     SELECT quantity, product_variant_uuid INTO selling_quantity, product_variant_uuid_v2 
--     FROM store.ordered 
--     WHERE bill_info_uuid = NEW.uuid;
    
--     -- Handle INSERT: Subtract if is_paid is true
--     IF TG_OP = 'INSERT' THEN
--         IF NEW.is_paid = true THEN
--             UPDATE store.product_variant
--             SET selling_warehouse = selling_warehouse - selling_quantity
--             WHERE uuid = product_variant_uuid_v2;
--         END IF;
--     -- Handle UPDATE: Check transition of is_paid
--     ELSIF TG_OP = 'UPDATE' THEN
--         IF OLD.is_paid <> NEW.is_paid THEN
--             -- If is_paid changed from false to true, subtract
--             IF OLD.is_paid = false AND NEW.is_paid = true THEN
--                 UPDATE store.product_variant
--                 SET selling_warehouse = selling_warehouse - selling_quantity
--                 WHERE uuid = product_variant_uuid_v2;
--             -- If is_paid changed from true to false, add
--             ELSIF OLD.is_paid = true AND NEW.is_paid = false THEN
--                 UPDATE store.product_variant
--                 SET selling_warehouse = selling_warehouse + selling_quantity
--                 WHERE uuid = product_variant_uuid_v2;
--             END IF;
--         END IF;
--     END IF;
    
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION product_variant_after_bill_info_and_ordered_insert_update_function()
RETURNS TRIGGER AS $$
DECLARE 
    ordered_record RECORD;
BEGIN
    -- Loop through all ordered items for this bill_info_uuid
    FOR ordered_record IN
        SELECT quantity, product_variant_uuid 
        FROM store.ordered 
        WHERE bill_info_uuid = NEW.uuid
    LOOP
        -- Handle INSERT: Subtract if is_paid is true
        IF TG_OP = 'INSERT' THEN
            IF NEW.is_paid = true THEN
                UPDATE store.product_variant
                SET selling_warehouse = selling_warehouse - ordered_record.quantity
                WHERE uuid = ordered_record.product_variant_uuid;
            END IF;
        -- Handle UPDATE: Check transition of is_paid
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.is_paid <> NEW.is_paid THEN
                -- If is_paid changed from false to true, subtract
                IF OLD.is_paid = false AND NEW.is_paid = true THEN
                    UPDATE store.product_variant
                    SET selling_warehouse = selling_warehouse - ordered_record.quantity
                    WHERE uuid = ordered_record.product_variant_uuid;
                -- If is_paid changed from true to false, add
                ELSIF OLD.is_paid = true AND NEW.is_paid = false THEN
                    UPDATE store.product_variant
                    SET selling_warehouse = selling_warehouse + ordered_record.quantity
                    WHERE uuid = ordered_record.product_variant_uuid;
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER product_variant_after_bill_info_and_ordered_insert_update_trigger
AFTER INSERT OR UPDATE ON store.bill_info
FOR EACH ROW
EXECUTE FUNCTION product_variant_after_bill_info_and_ordered_insert_update_function();