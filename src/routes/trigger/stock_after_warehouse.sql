-- Step 1: Create the function
CREATE OR REPLACE FUNCTION add_column_stock_after_warehouse_insert_function()
RETURNS TRIGGER AS $$
DECLARE
    new_column_name TEXT;
    branch_name TEXT;
BEGIN
  
    SELECT name INTO branch_name FROM store.branch WHERE uuid = NEW.branch_uuid;

    new_column_name := branch_name || '_' || NEW.name;

    EXECUTE format('ALTER TABLE store.stock ADD COLUMN %I DECIMAL DEFAULT 0', new_column_name);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER add_column_stock_after_warehouse_insert_trigger
AFTER INSERT ON store.warehouse
FOR EACH ROW
EXECUTE FUNCTION add_column_stock_after_warehouse_insert_function();


CREATE OR REPLACE FUNCTION drop_column_stock_after_warehouse_delete_function()
RETURNS TRIGGER AS $$
DECLARE
    column_name TEXT;
    branch_name TEXT;
BEGIN
    SELECT name INTO branch_name FROM store.branch WHERE uuid = OLD.branch_uuid;
    column_name := branch_name || '_' || OLD.name;
    EXECUTE format('ALTER TABLE store.stock DROP COLUMN IF EXISTS %I', column_name);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create the trigger for delete
CREATE OR REPLACE TRIGGER drop_column_stock_after_warehouse_delete_trigger
AFTER DELETE ON store.warehouse
FOR EACH ROW
EXECUTE FUNCTION drop_column_stock_after_warehouse_delete_function();
