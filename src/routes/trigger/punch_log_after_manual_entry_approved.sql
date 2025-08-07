CREATE OR REPLACE FUNCTION hr.punch_log_after_manual_entry_approved()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if approval status has changed
    IF OLD.approval IS DISTINCT FROM NEW.approval THEN
        -- if manual_entry is approved then create a punch log
        IF NEW.approval = 'approved' AND OLD.approval = 'pending' THEN
            -- entry time insert
            INSERT INTO hr.punch_log (
                uuid,
                employee_uuid,
                device_list_uuid,
                punch_type, 
                punch_time,
                manual_entry_uuid
            )
            VALUES (
                generate_15_digit_uuid(),
                NEW.employee_uuid,
                NEW.device_list_uuid,
                'manual',
                NEW.entry_time,
                NEW.uuid
            );
            
            -- exit time insert
            INSERT INTO hr.punch_log (
                uuid,
                employee_uuid,
                device_list_uuid,
                punch_type,
                punch_time,
                manual_entry_uuid
            )
            VALUES (
                generate_15_digit_uuid(),
                NEW.employee_uuid,
                NEW.device_list_uuid,
                'manual',
                NEW.exit_time,
                NEW.uuid
            );
        -- if manual_entry is not approved then delete the punch log
        ELSIF NEW.approval = 'rejected' AND OLD.approval = 'approved' THEN
            DELETE FROM hr.punch_log
            WHERE manual_entry_uuid = NEW.uuid;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE OR REPLACE TRIGGER punch_log_after_manual_entry_approved
    AFTER UPDATE ON hr.manual_entry
    FOR EACH ROW
    EXECUTE FUNCTION hr.punch_log_after_manual_entry_approved();

CREATE OR REPLACE FUNCTION hr.punch_log_after_manual_entry_approved_insert()
RETURNS TRIGGER AS $$
BEGIN
        IF NEW.approval = 'approved' THEN
            -- entry time insert
            INSERT INTO hr.punch_log (
                uuid,
                employee_uuid,
                device_list_uuid,
                punch_type, 
                punch_time,
                manual_entry_uuid
            )
            VALUES (
                generate_15_digit_uuid(),
                NEW.employee_uuid,
                NEW.device_list_uuid,
                'manual',
                NEW.entry_time,
                NEW.uuid
            );
            
            -- exit time insert
            INSERT INTO hr.punch_log (
                uuid,
                employee_uuid,
                device_list_uuid,
                punch_type,
                punch_time,
                manual_entry_uuid
            )
            VALUES (
                generate_15_digit_uuid(),
                NEW.employee_uuid,
                NEW.device_list_uuid,
                'manual',
                NEW.exit_time,
                NEW.uuid
            );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE OR REPLACE TRIGGER punch_log_after_manual_entry_approved_insert
    AFTER INSERT ON hr.manual_entry
    FOR EACH ROW
    EXECUTE FUNCTION hr.punch_log_after_manual_entry_approved_insert();

CREATE OR REPLACE FUNCTION hr.punch_log_after_manual_entry_approved_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if approval status has changed
    IF OLD.approval = 'approved' THEN
            DELETE FROM hr.punch_log
            WHERE manual_entry_uuid = OLD.uuid;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE OR REPLACE TRIGGER punch_log_after_manual_entry_approved_delete
    AFTER DELETE ON hr.manual_entry
    FOR EACH ROW
    EXECUTE FUNCTION hr.punch_log_after_manual_entry_approved_delete();