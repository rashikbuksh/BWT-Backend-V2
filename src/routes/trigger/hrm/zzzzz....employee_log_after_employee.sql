CREATE OR REPLACE FUNCTION employee_log_after_employee_insert_function() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO hr.employee_log (
        employee_uuid,
        type,
        type_uuid,
        created_by,
        created_at
    ) VALUES (
        NEW.uuid,
        'leave_policy',
        NEW.leave_policy_uuid,
        NEW.created_by,
        NEW.created_at
    );

    INSERT INTO hr.employee_log (
        employee_uuid,
        type,
        type_uuid,
        created_by,
        created_at
    ) VALUES (
        NEW.uuid,
        'shift_group',
        NEW.shift_group_uuid,
        NEW.created_by,
        NEW.created_at
    );

RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER employee_log_after_employee_insert_trigger
AFTER INSERT ON hr.employee
FOR EACH ROW
EXECUTE FUNCTION employee_log_after_employee_insert_function();


CREATE OR REPLACE FUNCTION employee_log_after_employee_update_function() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.leave_policy_uuid IS DISTINCT FROM NEW.leave_policy_uuid THEN
        INSERT INTO hr.employee_log (
            employee_uuid,
            type,
            type_uuid,
            created_by,
            created_at
        ) VALUES (
            NEW.uuid,
            'leave_policy',
            NEW.leave_policy_uuid,
            NEW.created_by,
            NEW.updated_at
        );
    END IF;

    IF OLD.shift_group_uuid IS DISTINCT FROM NEW.shift_group_uuid THEN
        INSERT INTO hr.employee_log (
            employee_uuid,
            type,
            type_uuid,
            created_by,
            created_at
        ) VALUES (
            NEW.uuid,
            'shift_group',
            NEW.shift_group_uuid,
            NEW.created_by,
            NEW.updated_at
        );
    END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER employee_log_after_employee_update_trigger
AFTER UPDATE ON hr.employee
FOR EACH ROW
EXECUTE FUNCTION employee_log_after_employee_update_function();


