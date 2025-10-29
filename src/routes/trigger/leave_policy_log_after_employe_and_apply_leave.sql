CREATE OR REPLACE FUNCTION hr.leave_policy_log_after_employee_insert_function() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO hr.leave_policy_log (
        uuid,
        employee_uuid,
        leave_policy_uuid,
        year,
        created_by,
        created_at
    )
VALUES (
        generate_15_digit_uuid(),
        NEW.uuid,
        NEW.leave_policy_uuid,
        EXTRACT(
            YEAR
            FROM NEW.created_at
        )::int,
        NEW.created_by,
        NEW.created_at
    );
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create the trigger
CREATE OR REPLACE TRIGGER leave_policy_log_after_employee_insert
AFTER
INSERT ON hr.employee FOR EACH ROW EXECUTE FUNCTION hr.leave_policy_log_after_employee_insert_function();
CREATE OR REPLACE FUNCTION hr.leave_policy_log_after_employee_update_function() RETURNS TRIGGER AS $$
DECLARE new_year int := EXTRACT(
        YEAR
        FROM NEW.updated_at
    )::int;
existing_log_uuid text;
BEGIN IF OLD.leave_policy_uuid IS DISTINCT
FROM NEW.leave_policy_uuid THEN
SELECT uuid INTO existing_log_uuid
FROM hr.leave_policy_log
WHERE employee_uuid = NEW.uuid
    AND year = new_year
LIMIT 1;
IF existing_log_uuid IS NOT NULL THEN
UPDATE hr.leave_policy_log
SET leave_policy_uuid = NEW.leave_policy_uuid,
    updated_by = NEW.updated_by,
    updated_at = NEW.updated_at
WHERE uuid = existing_log_uuid;
ELSE
INSERT INTO hr.leave_policy_log (
        uuid,
        employee_uuid,
        leave_policy_uuid,
        year,
        created_by,
        created_at
    )
VALUES (
        generate_15_digit_uuid(),
        NEW.uuid,
        NEW.leave_policy_uuid,
        new_year,
        NEW.updated_by,
        NEW.updated_at
    );
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER leave_policy_log_after_employee_update
AFTER
UPDATE ON hr.employee FOR EACH ROW EXECUTE FUNCTION hr.leave_policy_log_after_employee_update_function();