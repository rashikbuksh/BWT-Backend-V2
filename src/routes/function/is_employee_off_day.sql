DROP FUNCTION IF EXISTS hr.is_employee_off_day(text, date);

CREATE OR REPLACE FUNCTION hr.is_employee_off_day(employee_uuid text, day_date date) RETURNS boolean LANGUAGE sql STABLE AS $$
SELECT EXISTS (
        WITH sg AS (
            SELECT el.type_uuid AS shift_group_uuid
            FROM hr.employee_log el
            WHERE el.employee_uuid = $1
                AND el.type = 'shift_group'
                AND el.effective_date::date <= $2
            ORDER BY el.effective_date DESC
            LIMIT 1
        ), roster_sel AS (
            SELECT r.off_days::jsonb AS off_days
            FROM hr.roster r
                JOIN sg ON r.shift_group_uuid = sg.shift_group_uuid
            WHERE r.effective_date <= $2
            ORDER BY r.effective_date DESC
            LIMIT 1
        )
        SELECT 1
        FROM roster_sel rs
            CROSS JOIN LATERAL jsonb_array_elements_text(rs.off_days) AS od(dname)
        WHERE lower(od.dname) = lower(to_char($2, 'Dy'))
        LIMIT 1
    );
$$;