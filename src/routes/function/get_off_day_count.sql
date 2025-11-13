DROP FUNCTION IF EXISTS hr.get_offday_count(text, date, date);
-- ...existing code...
CREATE OR REPLACE FUNCTION hr.get_offday_count(
        p_employee_uuid TEXT,
        p_start_date DATE,
        p_end_date DATE
    ) RETURNS INTEGER LANGUAGE sql STABLE AS $$ WITH params AS (
        SELECT p_start_date AS start_date,
            p_end_date AS end_date
    ),
    employee_shift_periods AS (
        SELECT el.employee_uuid,
            el.type_uuid AS shift_group_uuid,
            el.effective_date,
            LEAD(el.effective_date) OVER (
                PARTITION BY el.employee_uuid
                ORDER BY el.effective_date
            ) AS next_effective_date
        FROM hr.employee_log el
            CROSS JOIN params p
        WHERE el.type = 'shift_group'
            AND el.effective_date <= p.end_date
            AND el.employee_uuid = p_employee_uuid
    ),
    roster_periods AS (
        SELECT esp.employee_uuid,
            esp.effective_date AS esp_effective_date,
            esp.next_effective_date AS esp_next_effective_date,
            r.shift_group_uuid,
            r.effective_date AS roster_effective_date,
            LEAD(r.effective_date) OVER (
                PARTITION BY r.shift_group_uuid
                ORDER BY r.effective_date
            ) AS roster_next_effective_date,
            r.off_days::jsonb AS off_days
        FROM employee_shift_periods esp
            JOIN hr.roster r ON r.shift_group_uuid = esp.shift_group_uuid
            CROSS JOIN params p
        WHERE r.effective_date <= p.end_date
    ),
    date_ranges AS (
        SELECT employee_uuid,
            shift_group_uuid,
            GREATEST(
                roster_effective_date,
                esp_effective_date,
                (
                    SELECT start_date
                    FROM params
                )
            ) AS period_start,
            LEAST(
                COALESCE(
                    roster_next_effective_date - INTERVAL '1 day',
                    (
                        SELECT end_date
                        FROM params
                    )
                ),
                COALESCE(
                    esp_next_effective_date - INTERVAL '1 day',
                    (
                        SELECT end_date
                        FROM params
                    )
                ),
                (
                    SELECT end_date
                    FROM params
                )
            ) AS period_end,
            off_days
        FROM roster_periods
        WHERE GREATEST(
                roster_effective_date,
                esp_effective_date,
                (
                    SELECT start_date
                    FROM params
                )
            ) <= LEAST(
                COALESCE(
                    roster_next_effective_date - INTERVAL '1 day',
                    (
                        SELECT end_date
                        FROM params
                    )
                ),
                COALESCE(
                    esp_next_effective_date - INTERVAL '1 day',
                    (
                        SELECT end_date
                        FROM params
                    )
                ),
                (
                    SELECT end_date
                    FROM params
                )
            )
    ),
    all_offset_days AS (
        SELECT dr.employee_uuid,
            dr.shift_group_uuid,
            gs::date AS day,
            od.dname
        FROM date_ranges dr
            CROSS JOIN LATERAL generate_series(dr.period_start, dr.period_end, INTERVAL '1 day') AS gs
            CROSS JOIN LATERAL jsonb_array_elements_text(dr.off_days) AS od(dname)
    )
SELECT COALESCE(COUNT(*), 0)::int
FROM all_offset_days aod -- use helper functions to detect holidays; exclude any day that is general OR special holiday
    LEFT JOIN LATERAL hr.is_general_holiday(aod.day) gh ON TRUE
    LEFT JOIN LATERAL hr.is_special_holiday(aod.day) sh ON TRUE
WHERE COALESCE(gh.is_general_holiday, FALSE) = FALSE
    AND COALESCE(sh.is_special_holiday, FALSE) = FALSE
    AND lower(to_char(aod.day, 'Dy')) = lower(left(aod.dname, 3));
$$;
-- ...existing code...