-- SIMPLE VERSION: Insert Christmas trivia polls
-- 
-- INSTRUCTIONS:
-- 1. Replace 'YOUR_EVENT_ID' below with your actual event_id (just the UUID, no quotes needed in the replacement)
-- 2. Run this script in Supabase SQL Editor
--
-- Example: If your event_id is '123e4567-e89b-12d3-a456-426614174000'
--          Replace 'YOUR_EVENT_ID' with '123e4567-e89b-12d3-a456-426614174000'

-- ========================================================================
-- REPLACE 'YOUR_EVENT_ID' BELOW WITH YOUR ACTUAL EVENT ID UUID
-- ========================================================================
-- You can find your event_id by running: SELECT id, name FROM events ORDER BY created_at DESC LIMIT 5;
-- ========================================================================

-- Poll 1: Home Alone
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'In the movie Home Alone where are the McCallisters going on vacation when they leave Kevin behind', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Paris', 'London', 'New York City', 'Los Angeles'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Paris')
WHERE id = (SELECT id FROM new_poll);

-- Poll 2: Gingerbread
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'What is the main spice that gives classic gingerbread cookies their flavor', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Cinnamon', 'Nutmeg', 'Ginger', 'Cloves'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Ginger')
WHERE id = (SELECT id FROM new_poll);

-- Poll 3: Rudolph
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'Which reindeer is famous for having a shiny red nose', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Dasher', 'Rudolph', 'Vixen', 'Comet'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Rudolph')
WHERE id = (SELECT id FROM new_poll);

-- Poll 4: Christmas Tree
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'Which country is widely credited with starting the tradition of the decorated Christmas tree', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Germany', 'Italy', 'United States', 'Sweden'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Germany')
WHERE id = (SELECT id FROM new_poll);

-- Poll 5: Twelve Days of Christmas
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'In the song The Twelve Days of Christmas how many total gifts are given by the end of the song', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['78', '144', '364', '412'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = '364')
WHERE id = (SELECT id FROM new_poll);

-- Poll 6: Eggnog
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'What popular Christmas drink is also sometimes called milk punch', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Hot chocolate', 'Apple cider', 'Eggnog', 'Peppermint tea'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Eggnog')
WHERE id = (SELECT id FROM new_poll);

-- Poll 7: Grinch
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'In How the Grinch Stole Christmas what is the name of the Grinch dog', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Max', 'Buddy', 'Spot', 'Rex'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Max')
WHERE id = (SELECT id FROM new_poll);

-- Poll 8: A Christmas Story
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'In the movie A Christmas Story what gift does Ralphie want more than anything', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['A train set', 'A Red Ryder BB gun', 'A toy robot', 'A sled'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'A Red Ryder BB gun')
WHERE id = (SELECT id FROM new_poll);

-- Poll 9: Reindeer
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'Which of these is NOT one of Santas reindeer', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Comet', 'Blitzen', 'Roger', 'Cupid'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Roger')
WHERE id = (SELECT id FROM new_poll);

-- Poll 10: Mistletoe
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'What color are the berries of the traditional mistletoe plant', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['White', 'Red', 'Blue', 'Purple'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'White')
WHERE id = (SELECT id FROM new_poll);

-- Poll 11: Saint Nicholas
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'In which modern day country was Saint Nicholas born', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Greece', 'Italy', 'Turkey', 'Germany'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Turkey')
WHERE id = (SELECT id FROM new_poll);

-- Poll 12: O Holy Night
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'Which Christmas carol includes the line Fall on your knees', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Hark the Herald Angels Sing', 'O Holy Night', 'Silent Night', 'O Come All Ye Faithful'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'O Holy Night')
WHERE id = (SELECT id FROM new_poll);

-- Poll 13: Advent
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'What is the name for the season of preparation leading up to Christmas in many churches', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Advent', 'Lent', 'Epiphany', 'Pentecost'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Advent')
WHERE id = (SELECT id FROM new_poll);

-- Poll 14: Elf
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'In the movie Elf what is the first rule of The Code of Elves', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Treat every day like Christmas', 'Sing loud for all to hear', 'Always eat candy canes', 'Finish your Christmas shopping early'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Treat every day like Christmas')
WHERE id = (SELECT id FROM new_poll);

-- Poll 15: Poinsettia
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'Which plant is known as the Christmas star due to its bright red leaves', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Holly', 'Poinsettia', 'Ivy', 'Rosemary'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Poinsettia')
WHERE id = (SELECT id FROM new_poll);

-- Poll 16: A Christmas Carol
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'In A Christmas Carol what is the name of Scrooge cheerful clerk', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Tiny Tim', 'Bob Cratchit', 'Fred', 'Jacob Marley'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Bob Cratchit')
WHERE id = (SELECT id FROM new_poll);

-- Poll 17: The Nutcracker
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'What is the name of the famous Christmas ballet featuring Clara and the Sugar Plum Fairy', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['The Nutcracker', 'Swan Lake', 'Sleeping Beauty', 'Giselle'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'The Nutcracker')
WHERE id = (SELECT id FROM new_poll);

-- Poll 18: Rudolph song
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'In the song Rudolph the Red Nosed Reindeer what do the other reindeer not let Rudolph do', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Pull the sleigh', 'Lead the parade', 'Join in any reindeer games', 'Go to the North Pole'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Join in any reindeer games')
WHERE id = (SELECT id FROM new_poll);

-- Poll 19: Mistletoe kiss
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'Under which decoration do people traditionally share a Christmas kiss', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Tinsel', 'Holly', 'Wreath', 'Mistletoe'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Mistletoe')
WHERE id = (SELECT id FROM new_poll);

-- Poll 20: Australia Christmas
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'Which of these countries celebrates Christmas during its summer season', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Australia', 'Canada', 'Norway', 'Russia'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Australia')
WHERE id = (SELECT id FROM new_poll);



