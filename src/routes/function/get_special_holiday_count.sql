DROP FUNCTION IF EXISTS hr.get_special_holidays_count(date, date);

CREATE OR REPLACE FUNCTION hr.get_special_holidays_count(p_from date, p_to date) RETURNS integer LANGUAGE plpgsql STABLE AS $$ BEGIN IF p_from IS NULL
    OR p_to IS NULL
    OR p_from > p_to THEN RETURN 0;
END IF;
RETURN (
    SELECT COALESCE(count(DISTINCT d), 0)
    FROM (
            -- produce every date that is in any special_holidays row overlapping the input range
            SELECT generate_series(
                    GREATEST(sh.from_date::date, p_from),
                    LEAST(sh.to_date::date, p_to),
                    '1 day'
                )::date AS d
            FROM hr.special_holidays sh
            WHERE sh.to_date::date >= p_from
                AND sh.from_date::date <= p_to
        ) AS special_days
        LEFT JOIN hr.general_holidays gh ON gh.date = special_days.d
    WHERE gh.date IS NULL -- exclude any date that is a general holiday
);
END;
$$;