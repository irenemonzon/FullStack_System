-- Postcode became required for new and edited guests (specs/003). Guests
-- registered before that without one get the same default the form's
-- "No postcode" button uses. The column stays nullable; the audit trigger
-- records each change with a null actor_id, since no user is signed in.
UPDATE guests SET postcode = '3012' WHERE postcode IS NULL OR trim(postcode) = '';
