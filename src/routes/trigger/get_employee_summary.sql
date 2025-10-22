CREATE OR REPLACE FUNCTION hr.get_employee_summary(p_employee_uuid text DEFAULT NULL) RETURNS TABLE (
        employee_uuid text,
        employee_name text,
        designation text,
        department text,
        start_date date,
        profile_picture text
    ) AS $$
SELECT e.uuid::uuid,
    u.name,
    des.designation,
    dep.department,
    e.start_date::date,
    e.profile_picture
FROM hr.employee e
    LEFT JOIN hr.users u ON e.user_uuid = u.uuid
    LEFT JOIN hr.designation des ON u.designation_uuid = des.uuid
    LEFT JOIN hr.department dep ON u.department_uuid = dep.uuid
WHERE (
        p_employee_uuid IS NULL
        OR e.uuid = p_employee_uuid
    );
$$ LANGUAGE sql STABLE;