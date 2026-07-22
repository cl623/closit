-- Seed base avatar + controlled wardrobe (served from /seed/* in the Next app)
insert into public.avatars (id, name, image_path, body_width, body_height, is_active)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Paper Doll',
    '/seed/avatar-base.svg',
    400,
    600,
    true
  );

insert into public.items (
  id, owner_id, name, image_path, category, color, style,
  anchor_x, anchor_y, z_index, is_system
) values
  (
    '22222222-2222-2222-2222-222222222201',
    null,
    'Crop Tee',
    '/seed/item-top-tee.svg',
    'top',
    'white',
    'casual',
    0.5000,
    0.3800,
    30,
    true
  ),
  (
    '22222222-2222-2222-2222-222222222202',
    null,
    'Denim Jacket',
    '/seed/item-outerwear-jacket.svg',
    'outerwear',
    'blue',
    'street',
    0.5000,
    0.3600,
    40,
    true
  ),
  (
    '22222222-2222-2222-2222-222222222203',
    null,
    'Wide Pants',
    '/seed/item-bottom-pants.svg',
    'bottom',
    'black',
    'minimal',
    0.5000,
    0.6200,
    20,
    true
  ),
  (
    '22222222-2222-2222-2222-222222222204',
    null,
    'Sneakers',
    '/seed/item-shoes-sneakers.svg',
    'shoes',
    'white',
    'casual',
    0.5000,
    0.9000,
    10,
    true
  ),
  (
    '22222222-2222-2222-2222-222222222205',
    null,
    'Bob Cut',
    '/seed/item-hair-bob.svg',
    'hair',
    'brown',
    'classic',
    0.5000,
    0.1400,
    60,
    true
  ),
  (
    '22222222-2222-2222-2222-222222222206',
    null,
    'Round Specs',
    '/seed/item-accessory-glasses.svg',
    'accessory',
    'black',
    'nerd',
    0.5000,
    0.1800,
    50,
    true
  );
