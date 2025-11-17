----------------inserted in database already, no need to run again----------------------
CREATE OR REPLACE FUNCTION affiliate_after_product_variant_insert_and_update_function() RETURNS TRIGGER AS $$ BEGIN -- Update affiliates that reference this product_variant with the l
    IF NEW.commission_rate IS NOT NULL
    AND NEW.unit_type IS NOT NULL THEN
UPDATE store.affiliate
SET commission_rate = NEW.commission_rate,
    unit_type = NEW.unit_type
WHERE product_variant_uuid = NEW.uuid;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create or replace the trigger for both INSERT and UPDATE
CREATE OR REPLACE TRIGGER affiliate_after_product_variant_insert_and_update_trigger
AFTER
INSERT
    OR
UPDATE ON store.product_variant FOR EACH ROW EXECUTE FUNCTION affiliate_after_product_variant_insert_and_update_function();