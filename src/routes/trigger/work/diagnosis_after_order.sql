--inserted into the database
CREATE OR REPLACE FUNCTION generate_15_digit_uuid()
RETURNS VARCHAR AS $$
DECLARE
    result VARCHAR;
BEGIN
    SELECT substring(md5(random()::text), 1, 15) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- CREATE OR REPLACE FUNCTION insert_diagnosis_after_order()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     IF NEW.is_diagnosis_need = true THEN
--         INSERT INTO work.diagnosis (order_uuid, uuid, created_by, created_at, updated_at)
--         VALUES (NEW.uuid, generate_15_digit_uuid(), new.created_by, new.created_at, new.updated_at);
--     END IF;
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;



-- CREATE OR REPLACE TRIGGER after_order_insert_update
-- AFTER INSERT OR UPDATE ON work.order
-- FOR EACH ROW
-- EXECUTE FUNCTION insert_diagnosis_after_order();


CREATE OR REPLACE FUNCTION insert_diagnosis_after_order()
RETURNS TRIGGER AS $$
DECLARE
    info_product_received BOOLEAN;
    old_info_product_received BOOLEAN;
BEGIN

    -- Fetch the is_product_received value from the associated info record
    SELECT i.is_product_received INTO info_product_received
    FROM work.info i
    WHERE i.uuid = NEW.info_uuid;

    -- For UPDATE operations, also fetch the old is_product_received value
    IF TG_OP = 'UPDATE' THEN
        SELECT i.is_product_received INTO old_info_product_received
        FROM work.info i
        WHERE i.uuid = OLD.info_uuid;
    END IF;

    -- Handle diagnosis deletion scenarios:
    -- 1. When is_diagnosis_need changes from true to false
    -- 2. When is_product_received becomes false (regardless of is_diagnosis_need)
    IF TG_OP = 'UPDATE' THEN
        -- Delete diagnosis if is_diagnosis_need transitions from true to false
        IF OLD.is_diagnosis_need = TRUE AND NEW.is_diagnosis_need = FALSE THEN
            DELETE FROM work.diagnosis WHERE order_uuid = NEW.uuid;
        -- Delete diagnosis if is_product_received becomes false (even if is_diagnosis_need is still true)
        ELSIF info_product_received = FALSE AND OLD.is_diagnosis_need = TRUE THEN
            DELETE FROM work.diagnosis WHERE order_uuid = NEW.uuid;
        END IF;
    END IF;

    -- Handle diagnosis updates for existing records
    -- Only update if both conditions remain true: is_diagnosis_need = TRUE AND is_product_received = TRUE
    IF TG_OP = 'UPDATE' 
       AND OLD.is_diagnosis_need = TRUE 
       AND NEW.is_diagnosis_need = TRUE 
       AND info_product_received = TRUE THEN
        UPDATE work.diagnosis
        SET is_proceed_to_repair = NEW.is_proceed_to_repair,
            is_proceed_to_repair_date = CASE WHEN NEW.is_proceed_to_repair = TRUE THEN NEW.is_proceed_to_repair_date END
        WHERE order_uuid = NEW.uuid AND is_proceed_to_repair IS DISTINCT FROM NEW.is_proceed_to_repair;
    END IF;

    -- Insert new diagnosis only if BOTH conditions are true:
    -- 1. is_diagnosis_need = TRUE
    -- 2. is_product_received = TRUE
    -- And it's either an INSERT or is_diagnosis_need changed from false to true
    IF NEW.is_diagnosis_need = TRUE 
       AND info_product_received = TRUE 
       AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.is_diagnosis_need = FALSE)) THEN
        INSERT INTO work.diagnosis (order_uuid, uuid, is_proceed_to_repair, is_proceed_to_repair_date, created_by, created_at, updated_at)
        VALUES (NEW.uuid, generate_15_digit_uuid(), NEW.is_proceed_to_repair, NEW.is_proceed_to_repair_date, NEW.created_by, NEW.created_at, NEW.updated_at);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Keep the existing trigger definition
CREATE OR REPLACE TRIGGER after_order_insert_update
AFTER INSERT OR UPDATE ON work.order
FOR EACH ROW
EXECUTE FUNCTION insert_diagnosis_after_order();

-- Create a new trigger for handling is_product_received changes in work.info
CREATE OR REPLACE FUNCTION handle_info_product_received_change()
RETURNS TRIGGER AS $$
BEGIN
    -- When is_product_received changes from true to false, delete associated diagnosis records
    IF TG_OP = 'UPDATE' AND OLD.is_product_received = TRUE AND NEW.is_product_received = FALSE THEN
        DELETE FROM work.diagnosis 
        WHERE order_uuid IN (
            SELECT o.uuid 
            FROM work.order o 
            WHERE o.info_uuid = NEW.uuid
        );
    END IF;
    
    -- When is_product_received changes from false to true, create diagnosis records for orders that need it
    IF TG_OP = 'UPDATE' AND OLD.is_product_received = FALSE AND NEW.is_product_received = TRUE THEN
        INSERT INTO work.diagnosis (order_uuid, uuid, is_proceed_to_repair, is_proceed_to_repair_date, created_by, created_at, updated_at)
        SELECT 
            o.uuid,
            generate_15_digit_uuid(),
            o.is_proceed_to_repair,
            o.is_proceed_to_repair_date,
            o.created_by,
            o.created_at,
            o.updated_at
        FROM work.order o
        WHERE o.info_uuid = NEW.uuid 
          AND o.is_diagnosis_need = TRUE
          AND NOT EXISTS (
              SELECT 1 FROM work.diagnosis d WHERE d.order_uuid = o.uuid
          );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER after_info_product_received_update
AFTER UPDATE ON work.info
FOR EACH ROW
EXECUTE FUNCTION handle_info_product_received_change();