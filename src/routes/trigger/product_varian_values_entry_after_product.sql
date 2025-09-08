CREATE OR REPLACE FUNCTION store.product_variant_values_entry_after_product_update_function() RETURNS TRIGGER AS $$
BEGIN
    -- On product UPDATE: for the updated product, get its variants, then delete variant values entries
    -- where attribute_uuid is not in the NEW.attributes_list.
    IF TG_OP = 'UPDATE' THEN
        IF NEW.attribute_list IS NULL OR array_length(NEW.attribute_list, 1) IS NULL THEN
            -- no attributes -> remove all variant value entries for this product's variants
            DELETE FROM store.product_variant_values_entry
            WHERE product_variant_uuid IN (
                SELECT pv.uuid FROM store.product_variant pv WHERE pv.product_uuid = NEW.uuid
            );
        ELSE
            -- remove entries for this product's variants whose attribute_uuid is not in the new attributes_list
            DELETE FROM store.product_variant_values_entry
            WHERE product_variant_uuid IN (
                SELECT pv.uuid FROM store.product_variant pv WHERE pv.product_uuid = NEW.uuid
            )
            AND NOT (attribute_uuid = ANY(NEW.attribute_list));
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER product_variant_values_entry_after_product_update
AFTER UPDATE ON store.product
FOR EACH ROW EXECUTE FUNCTION store.product_variant_values_entry_after_product_update_function();