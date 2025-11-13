DROP FUNCTION IF EXISTS hr.is_general_holiday(date);

CREATE OR REPLACE FUNCTION hr.is_general_holiday(p_date date) RETURNS TABLE(
        is_general_holiday boolean,
        general_holiday_name text
    ) LANGUAGE plpgsql STABLE AS $$ BEGIN -- return first matching general holiday (if any)
    RETURN QUERY
SELECT TRUE,
    gh.name
FROM hr.general_holidays gh
WHERE gh.date = p_date
LIMIT 1;
-- if no row found, return false + null
IF NOT FOUND THEN RETURN QUERY
SELECT FALSE,
    NULL;
END IF;
END;
$$;
CREATE OR REPLACE FUNCTION hr.is_special_holiday(p_date date) RETURNS TABLE(
        is_special_holiday boolean,
        special_holiday_name text
    ) LANGUAGE plpgsql STABLE AS $$ BEGIN -- return first matching special holiday whose range includes p_date
    RETURN QUERY
SELECT TRUE,
    sh.name
FROM hr.special_holidays sh
WHERE p_date BETWEEN sh.from_date::date AND sh.to_date::date
ORDER BY sh.from_date -- optionally prefer earliest range
LIMIT 1;
-- if no row found, return false + null
IF NOT FOUND THEN RETURN QUERY
SELECT FALSE,
    NULL;
END IF;
END;
$$;