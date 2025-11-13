------------Not Inserted Yet------------------
CREATE OR REPLACE FUNCTION affiliate_after_bill_info_insert_function() RETURNS TRIGGER AS $$
DECLARE ord_row RECORD;
pv_product_uuid TEXT;
BEGIN -- only proceed when bill_info is paid
IF COALESCE(NEW.is_paid, FALSE) = FALSE THEN RETURN NEW;
END IF;
-- on UPDATE, only act when it changed from not-paid -> paid
IF TG_OP = 'UPDATE'
AND COALESCE(OLD.is_paid, FALSE) = TRUE THEN RETURN NEW;
END IF;
FOR ord_row IN
SELECT uuid,
    product_variant_uuid,
    quantity,
    affiliate_id
FROM store.ordered
WHERE bill_info_uuid = NEW.uuid LOOP
SELECT product_uuid INTO pv_product_uuid
FROM store.product_variant
WHERE uuid = ord_row.product_variant_uuid
LIMIT 1;
IF pv_product_uuid IS NOT NULL
AND ord_row.affiliate_id IS NOT NULL THEN
UPDATE store.affiliate
SET purchased = COALESCE(purchased, 0) + (ord_row.quantity::integer)
WHERE id = ord_row.affiliate_id
    AND product_uuid = pv_product_uuid;
END IF;
END LOOP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- create trigger on bill_info insert or update
CREATE OR REPLACE TRIGGER affiliate_after_bill_info_insert_trigger
AFTER
INSERT
    OR
UPDATE ON store.bill_info FOR EACH ROW EXECUTE FUNCTION affiliate_after_bill_info_insert_function();
------------Not Inserted Yet------------------
CREATE OR REPLACE FUNCTION affiliate_after_bill_info_update_function() RETURNS TRIGGER AS $$
DECLARE ord_row RECORD;
pv_product_uuid TEXT;
BEGIN -- trigger WHEN clause ensures we only reach here when is_paid changed false -> true,
-- so no extra checks are necessary.
FOR ord_row IN
SELECT uuid,
    product_variant_uuid,
    quantity,
    affiliate_id
FROM store.ordered
WHERE bill_info_uuid = NEW.uuid LOOP
SELECT product_uuid INTO pv_product_uuid
FROM store.product_variant
WHERE uuid = ord_row.product_variant_uuid
LIMIT 1;
IF pv_product_uuid IS NOT NULL
AND ord_row.affiliate_id IS NOT NULL THEN
UPDATE store.affiliate
SET purchased = COALESCE(purchased, 0) + (ord_row.quantity::integer)
WHERE id = ord_row.affiliate_id
    AND product_uuid = pv_product_uuid;
END IF;
END LOOP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- UPDATE-only trigger: fires only when is_paid changed from false (or null) -> true
CREATE OR REPLACE TRIGGER affiliate_after_bill_info_update_trigger
AFTER
UPDATE ON store.bill_info FOR EACH ROW
    WHEN (
        COALESCE(OLD.is_paid, FALSE) = FALSE
        AND COALESCE(NEW.is_paid, FALSE) = TRUE
    ) EXECUTE FUNCTION affiliate_after_bill_info_update_function();