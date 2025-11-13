DROP FUNCTION IF EXISTS hr.is_employee_applied_late(text, date);

CREATE OR REPLACE FUNCTION hr.is_employee_applied_late(employee_uuid text, day_date date) RETURNS boolean LANGUAGE sql STABLE AS $$
SELECT EXISTS (
        SELECT 1
        FROM hr.apply_late al
        WHERE al.employee_uuid = employee_uuid
            AND al.date::date = day_date
            AND al.status = 'approved'
    );
$$;