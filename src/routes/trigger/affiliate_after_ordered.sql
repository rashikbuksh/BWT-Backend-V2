----------------------Not Inserted Yet And no needed anymore----------------------
CREATE OR REPLACE FUNCTION affiliate_after_ordered_insert_function() RETURNS TRIGGER AS $$
DECLARE -- This is the only line that changed.
    pv_product_uuid TEXT;
BEGIN -- 1. Get the parent product_uuid from the variant
-- This query is now safe because pv_product_uuid is TEXT.
SELECT product_uuid INTO pv_product_uuid
FROM store.product_variant
WHERE uuid = NEW.product_variant_uuid
LIMIT 1;
-- 2. Check if the order qualifies for an affiliate update
IF pv_product_uuid IS NOT NULL
AND NEW.affiliate_id IS NOT NULL
AND NEW.is_paid = TRUE THEN -- 3. Perform the update
UPDATE store.affiliate
SET purchased = COALESCE(purchased, 0) + (NEW.quantity::integer)
WHERE id = NEW.affiliate_id -- This comparison is now a safe TEXT-to-TEXT match.
    AND product_uuid = pv_product_uuid;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Don't forget to re-create the trigger to link it to the new function
CREATE OR REPLACE TRIGGER affiliate_after_ordered_insert_trigger
AFTER
INSERT ON store.ordered FOR EACH ROW EXECUTE FUNCTION affiliate_after_ordered_insert_function();
------------Not Inserted Yet------------------
CREATE OR REPLACE FUNCTION affiliate_after_ordered_update_function() RETURNS TRIGGER AS $$
DECLARE pv_product_uuid TEXT;
qty_diff INTEGER;
BEGIN -- 1. Get the parent product_uuid from the variant
SELECT product_uuid INTO pv_product_uuid
FROM store.product_variant
WHERE uuid = NEW.product_variant_uuid
LIMIT 1;
-- 2. Calculate quantity difference
qty_diff := NEW.quantity::integer - OLD.quantity::integer;
-- 3. Check if the order qualifies for an affiliate update
IF pv_product_uuid IS NOT NULL
AND NEW.affiliate_id IS NOT NULL
AND NEW.is_paid = TRUE THEN -- 4. Perform the update
UPDATE store.affiliate
SET purchased = COALESCE(purchased, 0) + qty_diff
WHERE id = NEW.affiliate_id
    AND product_uuid = pv_product_uuid;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Re-create the update trigger
CREATE OR REPLACE TRIGGER affiliate_after_ordered_update_trigger
AFTER
UPDATE ON store.ordered FOR EACH ROW EXECUTE FUNCTION affiliate_after_ordered_update_function();
------------Not Inserted Yet------------------
CREATE OR REPLACE FUNCTION affiliate_after_ordered_delete_function() RETURNS TRIGGER AS $$
DECLARE pv_product_uuid TEXT;
BEGIN -- 1. Get the parent product_uuid from the variant
SELECT product_uuid INTO pv_product_uuid
FROM store.product_variant
WHERE uuid = OLD.product_variant_uuid
LIMIT 1;
-- 2. Check if the order qualifies for an affiliate update
IF pv_product_uuid IS NOT NULL
AND OLD.affiliate_id IS NOT NULL
AND OLD.is_paid = TRUE THEN -- 3. Perform the update
UPDATE store.affiliate
SET purchased = COALESCE(purchased, 0) - (OLD.quantity::integer)
WHERE id = OLD.affiliate_id
    AND product_uuid = pv_product_uuid;
END IF;
RETURN OLD;
END;
$$ LANGUAGE plpgsql;
-- Re-create the delete trigger
CREATE OR REPLACE TRIGGER affiliate_after_ordered_delete_trigger
AFTER DELETE ON store.ordered FOR EACH ROW EXECUTE FUNCTION affiliate_after_ordered_delete_function();