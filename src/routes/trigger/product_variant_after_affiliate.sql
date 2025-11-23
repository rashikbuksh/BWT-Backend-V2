--------------inserted in DB----------------------
CREATE OR REPLACE FUNCTION product_variant_after_affiliate_update_function() RETURNS TRIGGER AS $$ BEGIN -- Check if commission_rate OR unit_type actually changed
    IF (
        NEW.commission_rate IS DISTINCT
        FROM OLD.commission_rate
    )
    OR (
        NEW.unit_type IS DISTINCT
        FROM OLD.unit_type
    ) THEN
UPDATE store.product_variant
SET commission_rate = NEW.commission_rate,
    unit_type = NEW.unit_type
WHERE uuid = NEW.product_variant_uuid;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER product_variant_after_affiliate_update_trigger
AFTER
UPDATE ON store.affiliate FOR EACH ROW EXECUTE FUNCTION product_variant_after_affiliate_update_function();