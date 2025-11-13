DROP FUNCTION IF EXISTS hr.get_general_holidays_count(date, date);

CREATE OR REPLACE FUNCTION hr.get_general_holidays_count(p_from date, p_to date) RETURNS integer LANGUAGE plpgsql STABLE AS $$ BEGIN IF p_from IS NULL
    OR p_to IS NULL
    OR p_from > p_to THEN RETURN 0;
END IF;
RETURN (
    SELECT COALESCE(COUNT(DISTINCT gh.date), 0)
    FROM hr.general_holidays gh
    WHERE gh.date BETWEEN p_from AND p_to
);
END;
$$;