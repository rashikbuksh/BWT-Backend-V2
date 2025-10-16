DELETE FROM work.diagnosis
WHERE
    order_uuid IN (
        SELECT o.uuid
        FROM work.order o
            LEFT JOIN work.info i ON o.info_uuid = i.uuid
        WHERE
            i.is_product_received = FALSE
            AND o.is_proceed_to_repair = FALSE
    );