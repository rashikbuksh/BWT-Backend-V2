-- STEP 1: Your original function (no changes needed)
-- This function creates new leave logs for a given year if they don't already exist.
CREATE OR REPLACE FUNCTION hr.ensure_leave_policy_logs_for_year(p_year int) RETURNS void AS $$ BEGIN
INSERT INTO hr.leave_policy_log (
        uuid,
        employee_uuid,
        leave_policy_uuid,
        year,
        created_by,
        created_at
    )
SELECT generate_15_digit_uuid(),
    e.uuid,
    e.leave_policy_uuid,
    p_year,
    COALESCE(e.updated_by, e.created_by),
    now()
FROM hr.employee e
WHERE e.leave_policy_uuid IS NOT NULL
    AND NOT EXISTS (
        SELECT 1
        FROM hr.leave_policy_log l
        WHERE l.employee_uuid = e.uuid
            AND l.year = p_year
    );
END;
$$ LANGUAGE plpgsql;
-- STEP 2: Enable the scheduler extension (run this once)
CREATE EXTENSION IF NOT EXISTS pg_cron;
-- STEP 3: Schedule the function to run automatically every year
-- This schedules the job to run at midnight (00:00) on January 1st.
-- The format '0 0 1 1 *' means: Minute 0, Hour 0, Day 1, Month 1, any Day of the week.
SELECT cron.schedule(
        'run yearly leave log creation',
        -- A unique name for your job
        '0 0 1 1 *',
        -- The schedule: runs on Jan 1st at midnight
        $$SELECT hr.ensure_leave_policy_logs_for_year(
            EXTRACT(
                YEAR
                FROM now()
            )::int
        );
$$
);
-- OPTIONAL: To see all scheduled jobs
-- SELECT * FROM cron.job;
-- OPTIONAL: To unschedule a job
-- SELECT cron.unschedule('run yearly leave log creation');