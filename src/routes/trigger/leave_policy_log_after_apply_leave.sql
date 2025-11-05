CREATE OR REPLACE FUNCTION hr.leave_policy_log_after_apply_leave_insert_function() RETURNS TRIGGER AS $$
DECLARE leave_year int := EXTRACT(
        YEAR
        FROM NEW.from_date
    )::int;
leave_days numeric;
year_start date;
year_end date;
category_name text;
BEGIN year_start := make_date(leave_year, 1, 1);
year_end := make_date(leave_year, 12, 31);
IF NEW.approval = 'approved' THEN
SELECT COALESCE(
        SUM(
            CASE
                WHEN LEAST(a.to_date::date, year_end) >= GREATEST(a.from_date::date, year_start) THEN CASE
                    WHEN a.type = 'half'
                    AND (
                        LEAST(a.to_date::date, year_end) - GREATEST(a.from_date::date, year_start) + 1
                    ) = 1 THEN 0.5
                    ELSE (
                        LEAST(a.to_date::date, year_end) - GREATEST(a.from_date::date, year_start) + 1
                    )
                END
                ELSE 0
            END
        ),
        0
    ) INTO leave_days
FROM hr.apply_leave a
WHERE a.employee_uuid = NEW.employee_uuid
    AND a.approval = 'approved'
    AND a.leave_category_uuid = NEW.leave_category_uuid;
SELECT lc.name INTO category_name
FROM hr.leave_category lc
WHERE lc.uuid = NEW.leave_category_uuid;
IF category_name = 'Sick Leave' THEN
UPDATE hr.leave_policy_log
SET sick_used = sick_added + leave_days
WHERE employee_uuid = NEW.employee_uuid
    AND year = leave_year;
ELSIF category_name = 'Casual Leave' THEN
UPDATE hr.leave_policy_log
SET casual_used = casual_added + leave_days
WHERE employee_uuid = NEW.employee_uuid
    AND year = leave_year;
ELSIF category_name = 'Maternity Leave' THEN
UPDATE hr.leave_policy_log
SET maternity_used = maternity_added + leave_days
WHERE employee_uuid = NEW.employee_uuid
    AND year = leave_year;
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER leave_policy_log_after_apply_leave_insert
AFTER
INSERT ON hr.apply_leave FOR EACH ROW EXECUTE FUNCTION hr.leave_policy_log_after_apply_leave_insert_function();
CREATE OR REPLACE FUNCTION hr.leave_policy_log_after_apply_leave_update_function() RETURNS TRIGGER AS $$
DECLARE leave_year int := EXTRACT(
        YEAR
        FROM NEW.from_date
    )::int;
leave_days numeric;
year_start date;
year_end date;
category_name text;
BEGIN year_start := make_date(leave_year, 1, 1);
year_end := make_date(leave_year, 12, 31);
IF NEW.approval = 'approved' THEN
SELECT COALESCE(
        SUM(
            CASE
                WHEN LEAST(a.to_date::date, year_end) >= GREATEST(a.from_date::date, year_start) THEN CASE
                    WHEN a.type = 'half'
                    AND (
                        LEAST(a.to_date::date, year_end) - GREATEST(a.from_date::date, year_start) + 1
                    ) = 1 THEN 0.5
                    ELSE (
                        LEAST(a.to_date::date, year_end) - GREATEST(a.from_date::date, year_start) + 1
                    )
                END
                ELSE 0
            END
        ),
        0
    ) INTO leave_days
FROM hr.apply_leave a
WHERE a.employee_uuid = NEW.employee_uuid
    AND a.approval = 'approved'
    AND a.leave_category_uuid = NEW.leave_category_uuid;
SELECT lc.name INTO category_name
FROM hr.leave_category lc
WHERE lc.uuid = NEW.leave_category_uuid;
IF category_name = 'Sick Leave' THEN
UPDATE hr.leave_policy_log
SET sick_used = sick_used + leave_days
WHERE employee_uuid = NEW.employee_uuid
    AND year = leave_year;
ELSIF category_name = 'Casual Leave' THEN
UPDATE hr.leave_policy_log
SET casual_used = casual_used + leave_days
WHERE employee_uuid = NEW.employee_uuid
    AND year = leave_year;
ELSIF category_name = 'Maternity Leave' THEN
UPDATE hr.leave_policy_log
SET maternity_used = maternity_used + leave_days
WHERE employee_uuid = NEW.employee_uuid
    AND year = leave_year;
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER leave_policy_log_after_apply_leave_update
AFTER
UPDATE ON hr.apply_leave FOR EACH ROW EXECUTE FUNCTION hr.leave_policy_log_after_apply_leave_update_function();