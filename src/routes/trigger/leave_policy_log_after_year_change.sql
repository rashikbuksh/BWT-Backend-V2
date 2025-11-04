-- ...existing code...
/*
 Ensure leave_policy_log rows exist for all employees for a given year.
 Call this from a trigger when the system/current year is changed.
 */
CREATE OR REPLACE FUNCTION hr.ensure_leave_policy_logs_for_year(p_year int) RETURNS void AS $$ BEGIN
INSERT INTO hr.leave_policy_log (
        uuid,
        employee_uuid,
        leave_policy_uuid,
        year,
        created_by,
        created_at
    )
SELECT generate_15_digit_uuid(),
    e.uuid,
    e.leave_policy_uuid,
    p_year,
    COALESCE(e.updated_by, e.created_by),
    now()
FROM hr.employee e
WHERE e.leave_policy_uuid IS NOT NULL
    AND NOT EXISTS (
        SELECT 1
        FROM hr.leave_policy_log l
        WHERE l.employee_uuid = e.uuid
            AND l.year = p_year
    );
END;
$$ LANGUAGE plpgsql;
-- Create a minimal system_config to track current_year and trigger the function automatically
CREATE TABLE IF NOT EXISTS hr.system_config (
    id boolean PRIMARY KEY DEFAULT true,
    current_year int NOT NULL
);
-- Ensure a single row exists with the current year
INSERT INTO hr.system_config (id, current_year)
SELECT true,
    EXTRACT(
        YEAR
        FROM now()
    )::int
WHERE NOT EXISTS (
        SELECT 1
        FROM hr.system_config
        WHERE id = true
    );
-- Trigger function called when system_config.current_year changes
CREATE OR REPLACE FUNCTION hr.leave_policy_log_after_year_update_function() RETURNS TRIGGER AS $$ BEGIN IF OLD.current_year IS DISTINCT
FROM NEW.current_year THEN PERFORM hr.ensure_leave_policy_logs_for_year(NEW.current_year);
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER leave_policy_log_after_year_update
AFTER
UPDATE ON hr.system_config FOR EACH ROW
    WHEN (
        OLD.current_year IS DISTINCT
        FROM NEW.current_year
    ) EXECUTE FUNCTION hr.leave_policy_log_after_year_update_function();
