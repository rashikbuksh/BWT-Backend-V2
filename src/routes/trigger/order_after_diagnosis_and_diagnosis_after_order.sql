
CREATE OR REPLACE FUNCTION order_after_diagnosis_insert_funct()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the `is_proceed_to_repair` field based on the value of `NEW.is_proceed_to_repair`
    UPDATE work.order
    SET is_proceed_to_repair = NEW.is_proceed_to_repair
    WHERE uuid = NEW.order_uuid AND is_proceed_to_repair IS DISTINCT FROM NEW.is_proceed_to_repair;

    -- Return the new record
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION order_after_diagnosis_update_funct()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the `is_proceed_to_repair` field based on the value of `NEW.is_proceed_to_repair`
    UPDATE work.order
    SET is_proceed_to_repair = NEW.is_proceed_to_repair
    WHERE uuid = NEW.order_uuid AND is_proceed_to_repair IS DISTINCT FROM NEW.is_proceed_to_repair;

    -- Return the new record
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE TRIGGER order_after_diagnosis_insert_trigger
AFTER INSERT ON work.diagnosis
FOR EACH ROW
EXECUTE FUNCTION order_after_diagnosis_insert_funct();

CREATE OR REPLACE TRIGGER order_after_diagnosis_update_trigger
AFTER UPDATE ON work.diagnosis
FOR EACH ROW
EXECUTE FUNCTION order_after_diagnosis_update_funct();


CREATE OR REPLACE FUNCTION diagnosis_after_order_insert_funct()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the `is_proceed_to_repair` field based on the value of `NEW.is_proceed_to_repair`
    UPDATE work.diagnosis
    SET is_proceed_to_repair = NEW.is_proceed_to_repair
    WHERE order_uuid = NEW.uuid;
    -- Return the new record
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION diagnosis_after_order_update_funct()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the `is_proceed_to_repair` field based on the value of `NEW.is_proceed_to_repair`
    UPDATE work.diagnosis
    SET is_proceed_to_repair = NEW.is_proceed_to_repair
    WHERE order_uuid = NEW.uuid;
    -- Return the new record
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER diagnosis_after_order_insert_trigger
AFTER INSERT ON work.order
FOR EACH ROW
EXECUTE FUNCTION diagnosis_after_order_insert_funct();

CREATE OR REPLACE TRIGGER diagnosis_after_order_insert_trigger
AFTER UPDATE ON work.order
FOR EACH ROW
EXECUTE FUNCTION diagnosis_after_order_update_funct();




