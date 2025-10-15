CREATE OR REPLACE FUNCTION roster_insert_after_shift_group_update_function() RETURNS TRIGGER AS $$
BEGIN
    
    -- INSERT INTO hr.roster (
    --     shift_group_uuid, 
    --     shifts_uuid, 
    --     effective_date, 
    --     off_days,
    --     created_by,
    --     created_at
    -- ) VALUES (
    --     OLD.uuid,
    --     OLD.shifts_uuid,
    --     OLD.effective_date,
    --     OLD.off_days,
    --     OLD.created_by,
    --     NOW()
    -- );

    INSERT INTO
    hr.roster (
        shift_group_uuid,
        shifts_uuid,
        effective_date,
        off_days,
        created_by,
        created_at
    ) VALUES (
        NEW.uuid,
        NEW.shifts_uuid,
        NEW.effective_date,
        NEW.off_days,
        NEW.created_by,
        NOW()
    );

    RETURN NULL;

END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER roster_insert_after_shift_group_update_trigger
AFTER UPDATE OF shifts_uuid, effective_date, off_days ON hr.shift_group
FOR EACH ROW
WHEN (
    OLD.shifts_uuid IS DISTINCT FROM NEW.shifts_uuid
    OR OLD.effective_date IS DISTINCT FROM NEW.effective_date
    OR OLD.off_days::text IS DISTINCT FROM NEW.off_days::text
)
EXECUTE FUNCTION roster_insert_after_shift_group_update_function();
