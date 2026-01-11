-- Update get_related_shirts to include slug
CREATE OR REPLACE FUNCTION get_related_shirts(p_vault_item_id UUID)
RETURNS TABLE (
    id UUID,
    related_shirt_id UUID,
    slug TEXT,
    subject TEXT,
    category TEXT,
    reference_image_url TEXT,
    score INTEGER,
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rs.id,
        CASE WHEN rs.shirt_a_id = p_vault_item_id THEN rs.shirt_b_id ELSE rs.shirt_a_id END as related_shirt_id,
        v.slug,
        v.subject,
        v.category,
        v.reference_image_url,
        rs.score,
        rs.reason
    FROM related_shirts rs
    JOIN the_vault v ON v.id = CASE WHEN rs.shirt_a_id = p_vault_item_id THEN rs.shirt_b_id ELSE rs.shirt_a_id END
    WHERE (rs.shirt_a_id = p_vault_item_id OR rs.shirt_b_id = p_vault_item_id)
      AND rs.status = 'approved'
    ORDER BY rs.score DESC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
