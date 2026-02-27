INSERT INTO public.users_t (
    unique_id,
    user_email,
    user_name,
    first_name,
    last_name,
    display_name,
    created,
    created_by,
    modified,
    modified_by,
    active
) VALUES
(
    'bryan-hernandez-001',
    'bryan.hernandez@example.com',
    'bryan.hernandez',
    'Bryan',
    'Hernandez',
    'Bryan Hernandez',
    NOW(),
    1,
    NOW(),
    1,
    1
),
(
    'brittney-hernandez-001',
    'brittney.hernandez@example.com',
    'brittney.hernandez',
    'Brittney',
    'Hernandez',
    'Brittney Hernandez',
    NOW(),
    1,
    NOW(),
    1,
    1
);