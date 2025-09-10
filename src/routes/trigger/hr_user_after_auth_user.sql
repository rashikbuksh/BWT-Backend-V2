-- NOT NEEDED ANYMORE

-- DROP TRIGGER IF EXISTS after_auth_user_insert ON auth_user.user;
-- DROP FUNCTION IF EXISTS hr.user_insert_after_auth_user_insert;
-- DROP TRIGGER IF EXISTS after_auth_user_delete ON auth_user.user;
-- DROP FUNCTION IF EXISTS hr.user_delete_after_auth_user_delete;

CREATE OR REPLACE FUNCTION hr.user_insert_after_auth_user_insert()
RETURNS TRIGGER AS $$
DECLARE uuid VARCHAR;
BEGIN
    uuid := generate_15_digit_uuid();

    -- Insert a new record into the hr.users table
    INSERT INTO
    hr.users (
        uuid,
        name,
        phone,
        user_type,
        pass,
        department_uuid,
        designation_uuid,
        email,
        ext,
        created_at,
        auth_user_id,
        can_access
    )
    VALUES (
        uuid,
        NEW.name,
        NULL,
        'web',
        NEW.email,
        NULL,
        NULL,
        NEW.email,
        '+880',
        NOW(),
        NEW.id,
        NULL
    );

    -- Return the new record
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER after_auth_user_insert
AFTER INSERT ON auth_user.user
FOR EACH ROW
EXECUTE FUNCTION hr.user_insert_after_auth_user_insert();

CREATE OR REPLACE FUNCTION hr.user_delete_after_auth_user_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete the corresponding record from the hr.users table
    DELETE FROM hr.users
    WHERE auth_user_id = OLD.id;

    -- Return the old record
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER after_auth_user_delete
AFTER DELETE ON auth_user.user
FOR EACH ROW
EXECUTE FUNCTION hr.user_delete_after_auth_user_delete();



