CREATE OR REPLACE FUNCTION affiliate_after_affiliate_click_insert_function() RETURNS TRIGGER AS $$
DECLARE v_total_visited INT;
BEGIN
SELECT COUNT(*) INTO v_total_visited
FROM store.affiliate_click
WHERE affiliate_id = NEW.affiliate_id;

UPDATE store.affiliate
SET visited = v_total_visited
WHERE id = NEW.affiliate_id;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER affiliate_after_affiliate_click_insert_trigger
AFTER
INSERT ON store.affiliate_click FOR EACH ROW EXECUTE FUNCTION affiliate_after_affiliate_click_insert_function();