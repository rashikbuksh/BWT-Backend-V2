---------NOT INSERTED IN DATABASE YET -------------------------
-- Trigger: affiliate_after_ordered_insert_trigger on store.ordered
CREATE OR REPLACE FUNCTION affiliate_after_ordered_insert_function() RETURNS TRIGGER AS $$ BEGIN
UPDATE store.affiliate
SET purchased = purchased + NEW.quantity
WHERE id = NEW.affiliate_id
    AND NEW.product_uuid = product_uuid
    AND NEW.is_paid = TRUE RETURN NEW;
END;
CREATE OR REPLACE TRIGGER affiliate_after_ordered_insert_trigger
AFTER
INSERT ON store.ordered FOR EACH ROW
    WHEN (NEW.affiliate_id IS NOT NULL) EXECUTE FUNCTION affiliate_after_ordered_insert_function();
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION affiliate_after_ordered_update_function() RETURNS TRIGGER AS $$ BEGIN
UPDATE store.affiliate
SET purchased = purchased + NEW.quantity - OLD.quantity
WHERE id = NEW.affiliate_id
    AND NEW.product_uuid = product_uuid
    AND NEW.is_paid = TRUE RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER affiliate_after_ordered_update_trigger
AFTER
UPDATE ON store.ordered FOR EACH ROW
    WHEN (NEW.affiliate_id IS NOT NULL) EXECUTE FUNCTION affiliate_after_ordered_update_function();
CREATE OR REPLACE FUNCTION affiliate_after_ordered_delete_function() RETURNS TRIGGER AS $$ BEGIN
UPDATE store.affiliate
SET purchased = purchased - OLD.quantity
WHERE id = OLD.affiliate_id
    AND OLD.product_uuid = product_uuid
    AND OLD.is_paid = TRUE RETURN OLD;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER affiliate_after_ordered_delete_trigger
AFTER DELETE ON store.ordered FOR EACH ROW
    WHEN (OLD.affiliate_id IS NOT NULL) EXECUTE FUNCTION affiliate_after_ordered_delete_function();