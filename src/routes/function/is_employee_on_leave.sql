DROP FUNCTION IF EXISTS hr.is_employee_on_leave(text, date);

CREATE OR REPLACE FUNCTION hr.is_employee_on_leave(employee_uuid text, day_date date) RETURNS boolean LANGUAGE sql AS $$
SELECT EXISTS (
        SELECT 1
        FROM hr.apply_leave al
        WHERE al.employee_uuid = employee_uuid
            AND al.from_date::date <= day_date
            AND al.to_date::date >= day_date
            AND al.approval = 'approved'
    );
$$;