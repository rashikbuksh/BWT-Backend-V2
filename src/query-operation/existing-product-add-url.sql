UPDATE store.product
SET
    url = (
        SELECT LOWER(
                TRIM(
                    REGEXP_REPLACE(
                        REGEXP_REPLACE(
                            REGEXP_REPLACE(title, '\$', '', 'g'), -- Remove dollar signs
                            '[^a-z0-9\s-]', '', 'g' -- Remove special characters except spaces and hyphens
                        ), '\s+', '-', 'g' -- Replace spaces with hyphens
                    )
                )
            )
        FROM store.product AS p2
        WHERE
            p2.uuid = store.product.uuid
    )
WHERE
    url IS NULL
    OR url = '';