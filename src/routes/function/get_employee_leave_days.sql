DROP FUNCTION IF EXISTS hr.get_total_leave_days(text, date, date);

CREATE OR REPLACE FUNCTION hr.get_total_leave_days(
        p_employee_uuid text,
        p_from_date date,
        p_to_date date
    ) RETURNS numeric LANGUAGE sql STABLE AS $$
SELECT COALESCE(
        SUM(
            CASE
                WHEN LEAST(al.to_date::date, p_to_date) >= GREATEST(al.from_date::date, p_from_date) THEN CASE
                    WHEN al.type = 'half'
                    AND (
                        LEAST(al.to_date::date, p_to_date) - GREATEST(al.from_date::date, p_from_date) + 1
                    ) = 1 THEN 0.5
                    ELSE (
                        LEAST(al.to_date::date, p_to_date) - GREATEST(al.from_date::date, p_from_date) + 1
                    )
                END
                ELSE 0
            END
        ),
        0
    )::numeric
FROM hr.apply_leave al
WHERE al.employee_uuid = p_employee_uuid
    AND al.approval = 'approved'
    AND al.to_date::date >= p_from_date
    AND al.from_date::date <= p_to_date;
$$;