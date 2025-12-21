-- ============================================================================
-- Biblical Christmas Questions - 20 Polls
-- REPLACE 'YOUR_EVENT_ID' BELOW WITH YOUR ACTUAL EVENT ID UUID
-- ============================================================================
-- You can find your event_id by running: SELECT id, name FROM events ORDER BY created_at DESC LIMIT 5;
-- ============================================================================

-- Poll 1: Where was Jesus born?
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'Where was Jesus born?', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Nazareth', 'Bethlehem', 'Jericho'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Bethlehem')
WHERE id = (SELECT id FROM new_poll);

-- Poll 2: Which Old Testament prophet foretold that the Messiah would be born of a virgin?
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'Which Old Testament prophet foretold that the Messiah would be born of a virgin?', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Ezekiel', 'Isaiah', 'Malachi'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Isaiah')
WHERE id = (SELECT id FROM new_poll);

-- Poll 3: What sign did the angel give the shepherds to recognize the Messiah?
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'What sign did the angel give the shepherds to recognize the Messiah?', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['A star above a house', 'A baby wrapped in cloths and lying in a manger', 'A lamb standing by a stable'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'A baby wrapped in cloths and lying in a manger')
WHERE id = (SELECT id FROM new_poll);

-- Poll 4: Who ordered the census that caused Joseph and Mary to travel to Bethlehem?
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'Who ordered the census that caused Joseph and Mary to travel to Bethlehem?', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Herod', 'Caesar Augustus', 'Pontius Pilate'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Caesar Augustus')
WHERE id = (SELECT id FROM new_poll);

-- Poll 5: What guided the wise men to the place where Jesus was?
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'What guided the wise men to the place where Jesus was?', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['A dream', 'A star', 'A messenger'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'A star')
WHERE id = (SELECT id FROM new_poll);

-- Poll 6: According to Scripture, where did Joseph and Mary live before the birth of Jesus?
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'According to Scripture, where did Joseph and Mary live before the birth of Jesus?', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Bethlehem', 'Nazareth', 'Jerusalem'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Nazareth')
WHERE id = (SELECT id FROM new_poll);

-- Poll 7: What gift did the wise men NOT bring?
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'What gift did the wise men NOT bring?', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Gold', 'Myrrh', 'Silver'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Silver')
WHERE id = (SELECT id FROM new_poll);

-- Poll 8: Who appeared to Joseph in dreams to give him instructions?
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'Who appeared to Joseph in dreams to give him instructions?', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['A prophet', 'An angel of the Lord', 'A shepherd'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'An angel of the Lord')
WHERE id = (SELECT id FROM new_poll);

-- Poll 9: Which Gospel contains the story of the shepherds visiting Jesus?
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'Which Gospel contains the story of the shepherds visiting Jesus?', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Matthew', 'Luke', 'John'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Luke')
WHERE id = (SELECT id FROM new_poll);

-- Poll 10: Where did Joseph take his family to protect Jesus from Herod?
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'Where did Joseph take his family to protect Jesus from Herod?', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Syria', 'Egypt', 'Cyprus'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Egypt')
WHERE id = (SELECT id FROM new_poll);

-- Poll 11: What does the name "Immanuel" mean?
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'What does the name "Immanuel" mean?', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['God is faithful', 'God with us', 'God saves'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'God with us')
WHERE id = (SELECT id FROM new_poll);

-- Poll 12: What occupation did the first people who heard about Jesus'' birth have?
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'What occupation did the first people who heard about Jesus'' birth have?', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Carpenters', 'Merchants', 'Shepherds'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Shepherds')
WHERE id = (SELECT id FROM new_poll);

-- Poll 13: Which Gospel traces Jesus'' genealogy through Joseph to Abraham?
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'Which Gospel traces Jesus'' genealogy through Joseph to Abraham?', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Mark', 'Luke', 'Matthew'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Matthew')
WHERE id = (SELECT id FROM new_poll);

-- Poll 14: What was the name of the angel who appeared to Mary to announce that she would give birth to Jesus?
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'What was the name of the angel who appeared to Mary to announce that she would give birth to Jesus?', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Michael', 'Gabriel', 'Raphael'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Gabriel')
WHERE id = (SELECT id FROM new_poll);

-- Poll 15: What was the name of the king who felt threatened by the birth of Jesus?
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'What was the name of the king who felt threatened by the birth of Jesus?', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Caesar Augustus', 'Herod', 'Archelaus'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Herod')
WHERE id = (SELECT id FROM new_poll);

-- Poll 16: In what kind of place was Jesus laid after His birth?
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'In what kind of place was Jesus laid after His birth?', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['A cradle', 'A guest room', 'A manger'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'A manger')
WHERE id = (SELECT id FROM new_poll);

-- Poll 17: Who was the elderly prophetess in the temple who recognized Jesus as the Messiah?
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'Who was the elderly prophetess in the temple who recognized Jesus as the Messiah?', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Miriam', 'Anna', 'Deborah'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Anna')
WHERE id = (SELECT id FROM new_poll);

-- Poll 18: Which Old Testament book prophesied that a ruler would come from Bethlehem?
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'Which Old Testament book prophesied that a ruler would come from Bethlehem?', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Isaiah', 'Jeremiah', 'Micah'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Micah')
WHERE id = (SELECT id FROM new_poll);

-- Poll 19: How did the angel describe the newborn Jesus to the shepherds?
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'How did the angel describe the newborn Jesus to the shepherds?', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['As a future king', 'As a miracle worker', 'As a Savior, Christ the Lord'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'As a Savior, Christ the Lord')
WHERE id = (SELECT id FROM new_poll);

-- Poll 20: What did Mary do with the things she heard and witnessed surrounding Jesus'' birth?
WITH new_poll AS (
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES ('YOUR_EVENT_ID'::UUID, 'What did Mary do with the things she heard and witnessed surrounding Jesus'' birth?', 'scheduled', 30, 8)
  RETURNING id
),
options AS (
  INSERT INTO poll_options (poll_id, label)
  SELECT id, unnest(ARRAY['Wrote them on scrolls', 'Told them only to Joseph', 'Treasured them and pondered them in her heart'])
  FROM new_poll
  RETURNING id, poll_id, label
)
UPDATE polls SET correct_option_id = (SELECT id FROM options WHERE poll_id = (SELECT id FROM new_poll) AND label = 'Treasured them and pondered them in her heart')
WHERE id = (SELECT id FROM new_poll);



