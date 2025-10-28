CREATE OR REPLACE FUNCTION hr.get_total_leave_days(
        p_employee_uuid text,
        p_from_date date,
        p_to_date date
    ) RETURNS INTEGER LANGUAGE sql STABLE AS $$
SELECT COALESCE(
        SUM(
            CASE
                WHEN LEAST(al.to_date::date, p_to_date) >= GREATEST(al.from_date::date, p_from_date) THEN (
                    LEAST(al.to_date::date, p_to_date) - GREATEST(al.from_date::date, p_from_date) + 1
                )
                ELSE 0
            END
        ),
        0
    )::integer
FROM hr.apply_leave al
WHERE al.employee_uuid = p_employee_uuid
    AND al.approval = 'approved'
    AND al.to_date::date >= p_from_date
    AND al.from_date::date <= p_to_date;
$$;