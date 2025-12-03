-- SQL script to insert Christmas trivia polls
-- REPLACE THE UUID BELOW with your actual event_id
-- You can find your event_id in the Supabase dashboard under the 'events' table

-- Set the event_id variable (REPLACE '00000000-0000-0000-0000-000000000000' with your actual event_id UUID)
DO $$
DECLARE
  v_event_id UUID := '00000000-0000-0000-0000-000000000000';  -- ⚠️ REPLACE THIS UUID WITH YOUR EVENT ID ⚠️
  v_poll_id UUID;
  v_option_a_id UUID;
  v_option_b_id UUID;
  v_option_c_id UUID;
  v_option_d_id UUID;
  v_correct_option_id UUID;
BEGIN
  -- Poll 1: Home Alone
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES (v_event_id, 'In the movie Home Alone where are the McCallisters going on vacation when they leave Kevin behind', 'scheduled', 30, 8)
  RETURNING id INTO v_poll_id;
  
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Paris') RETURNING id INTO v_option_a_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'London') RETURNING id INTO v_option_b_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'New York City') RETURNING id INTO v_option_c_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Los Angeles') RETURNING id INTO v_option_d_id;
  
  UPDATE polls SET correct_option_id = v_option_a_id WHERE id = v_poll_id;

  -- Poll 2: Gingerbread
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES (v_event_id, 'What is the main spice that gives classic gingerbread cookies their flavor', 'scheduled', 30, 8)
  RETURNING id INTO v_poll_id;
  
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Cinnamon') RETURNING id INTO v_option_a_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Nutmeg') RETURNING id INTO v_option_b_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Ginger') RETURNING id INTO v_option_c_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Cloves') RETURNING id INTO v_option_d_id;
  
  UPDATE polls SET correct_option_id = v_option_c_id WHERE id = v_poll_id;

  -- Poll 3: Rudolph
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES (v_event_id, 'Which reindeer is famous for having a shiny red nose', 'scheduled', 30, 8)
  RETURNING id INTO v_poll_id;
  
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Dasher') RETURNING id INTO v_option_a_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Rudolph') RETURNING id INTO v_option_b_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Vixen') RETURNING id INTO v_option_c_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Comet') RETURNING id INTO v_option_d_id;
  
  UPDATE polls SET correct_option_id = v_option_b_id WHERE id = v_poll_id;

  -- Poll 4: Christmas Tree
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES (v_event_id, 'Which country is widely credited with starting the tradition of the decorated Christmas tree', 'scheduled', 30, 8)
  RETURNING id INTO v_poll_id;
  
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Germany') RETURNING id INTO v_option_a_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Italy') RETURNING id INTO v_option_b_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'United States') RETURNING id INTO v_option_c_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Sweden') RETURNING id INTO v_option_d_id;
  
  UPDATE polls SET correct_option_id = v_option_a_id WHERE id = v_poll_id;

  -- Poll 5: Twelve Days of Christmas
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES (v_event_id, 'In the song The Twelve Days of Christmas how many total gifts are given by the end of the song', 'scheduled', 30, 8)
  RETURNING id INTO v_poll_id;
  
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, '78') RETURNING id INTO v_option_a_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, '144') RETURNING id INTO v_option_b_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, '364') RETURNING id INTO v_option_c_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, '412') RETURNING id INTO v_option_d_id;
  
  UPDATE polls SET correct_option_id = v_option_c_id WHERE id = v_poll_id;

  -- Poll 6: Eggnog
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES (v_event_id, 'What popular Christmas drink is also sometimes called milk punch', 'scheduled', 30, 8)
  RETURNING id INTO v_poll_id;
  
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Hot chocolate') RETURNING id INTO v_option_a_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Apple cider') RETURNING id INTO v_option_b_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Eggnog') RETURNING id INTO v_option_c_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Peppermint tea') RETURNING id INTO v_option_d_id;
  
  UPDATE polls SET correct_option_id = v_option_c_id WHERE id = v_poll_id;

  -- Poll 7: Grinch
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES (v_event_id, 'In How the Grinch Stole Christmas what is the name of the Grinch dog', 'scheduled', 30, 8)
  RETURNING id INTO v_poll_id;
  
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Max') RETURNING id INTO v_option_a_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Buddy') RETURNING id INTO v_option_b_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Spot') RETURNING id INTO v_option_c_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Rex') RETURNING id INTO v_option_d_id;
  
  UPDATE polls SET correct_option_id = v_option_a_id WHERE id = v_poll_id;

  -- Poll 8: A Christmas Story
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES (v_event_id, 'In the movie A Christmas Story what gift does Ralphie want more than anything', 'scheduled', 30, 8)
  RETURNING id INTO v_poll_id;
  
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'A train set') RETURNING id INTO v_option_a_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'A Red Ryder BB gun') RETURNING id INTO v_option_b_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'A toy robot') RETURNING id INTO v_option_c_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'A sled') RETURNING id INTO v_option_d_id;
  
  UPDATE polls SET correct_option_id = v_option_b_id WHERE id = v_poll_id;

  -- Poll 9: Reindeer
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES (v_event_id, 'Which of these is NOT one of Santas reindeer', 'scheduled', 30, 8)
  RETURNING id INTO v_poll_id;
  
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Comet') RETURNING id INTO v_option_a_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Blitzen') RETURNING id INTO v_option_b_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Roger') RETURNING id INTO v_option_c_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Cupid') RETURNING id INTO v_option_d_id;
  
  UPDATE polls SET correct_option_id = v_option_c_id WHERE id = v_poll_id;

  -- Poll 10: Mistletoe
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES (v_event_id, 'What color are the berries of the traditional mistletoe plant', 'scheduled', 30, 8)
  RETURNING id INTO v_poll_id;
  
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'White') RETURNING id INTO v_option_a_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Red') RETURNING id INTO v_option_b_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Blue') RETURNING id INTO v_option_c_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Purple') RETURNING id INTO v_option_d_id;
  
  UPDATE polls SET correct_option_id = v_option_a_id WHERE id = v_poll_id;

  -- Poll 11: Saint Nicholas
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES (v_event_id, 'In which modern day country was Saint Nicholas born', 'scheduled', 30, 8)
  RETURNING id INTO v_poll_id;
  
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Greece') RETURNING id INTO v_option_a_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Italy') RETURNING id INTO v_option_b_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Turkey') RETURNING id INTO v_option_c_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Germany') RETURNING id INTO v_option_d_id;
  
  UPDATE polls SET correct_option_id = v_option_c_id WHERE id = v_poll_id;

  -- Poll 12: O Holy Night
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES (v_event_id, 'Which Christmas carol includes the line Fall on your knees', 'scheduled', 30, 8)
  RETURNING id INTO v_poll_id;
  
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Hark the Herald Angels Sing') RETURNING id INTO v_option_a_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'O Holy Night') RETURNING id INTO v_option_b_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Silent Night') RETURNING id INTO v_option_c_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'O Come All Ye Faithful') RETURNING id INTO v_option_d_id;
  
  UPDATE polls SET correct_option_id = v_option_b_id WHERE id = v_poll_id;

  -- Poll 13: Advent
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES (v_event_id, 'What is the name for the season of preparation leading up to Christmas in many churches', 'scheduled', 30, 8)
  RETURNING id INTO v_poll_id;
  
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Advent') RETURNING id INTO v_option_a_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Lent') RETURNING id INTO v_option_b_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Epiphany') RETURNING id INTO v_option_c_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Pentecost') RETURNING id INTO v_option_d_id;
  
  UPDATE polls SET correct_option_id = v_option_a_id WHERE id = v_poll_id;

  -- Poll 14: Elf
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES (v_event_id, 'In the movie Elf what is the first rule of The Code of Elves', 'scheduled', 30, 8)
  RETURNING id INTO v_poll_id;
  
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Treat every day like Christmas') RETURNING id INTO v_option_a_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Sing loud for all to hear') RETURNING id INTO v_option_b_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Always eat candy canes') RETURNING id INTO v_option_c_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Finish your Christmas shopping early') RETURNING id INTO v_option_d_id;
  
  UPDATE polls SET correct_option_id = v_option_a_id WHERE id = v_poll_id;

  -- Poll 15: Poinsettia
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES (v_event_id, 'Which plant is known as the Christmas star due to its bright red leaves', 'scheduled', 30, 8)
  RETURNING id INTO v_poll_id;
  
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Holly') RETURNING id INTO v_option_a_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Poinsettia') RETURNING id INTO v_option_b_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Ivy') RETURNING id INTO v_option_c_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Rosemary') RETURNING id INTO v_option_d_id;
  
  UPDATE polls SET correct_option_id = v_option_b_id WHERE id = v_poll_id;

  -- Poll 16: A Christmas Carol
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES (v_event_id, 'In A Christmas Carol what is the name of Scrooge cheerful clerk', 'scheduled', 30, 8)
  RETURNING id INTO v_poll_id;
  
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Tiny Tim') RETURNING id INTO v_option_a_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Bob Cratchit') RETURNING id INTO v_option_b_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Fred') RETURNING id INTO v_option_c_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Jacob Marley') RETURNING id INTO v_option_d_id;
  
  UPDATE polls SET correct_option_id = v_option_b_id WHERE id = v_poll_id;

  -- Poll 17: The Nutcracker
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES (v_event_id, 'What is the name of the famous Christmas ballet featuring Clara and the Sugar Plum Fairy', 'scheduled', 30, 8)
  RETURNING id INTO v_poll_id;
  
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'The Nutcracker') RETURNING id INTO v_option_a_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Swan Lake') RETURNING id INTO v_option_b_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Sleeping Beauty') RETURNING id INTO v_option_c_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Giselle') RETURNING id INTO v_option_d_id;
  
  UPDATE polls SET correct_option_id = v_option_a_id WHERE id = v_poll_id;

  -- Poll 18: Rudolph song
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES (v_event_id, 'In the song Rudolph the Red Nosed Reindeer what do the other reindeer not let Rudolph do', 'scheduled', 30, 8)
  RETURNING id INTO v_poll_id;
  
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Pull the sleigh') RETURNING id INTO v_option_a_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Lead the parade') RETURNING id INTO v_option_b_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Join in any reindeer games') RETURNING id INTO v_option_c_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Go to the North Pole') RETURNING id INTO v_option_d_id;
  
  UPDATE polls SET correct_option_id = v_option_c_id WHERE id = v_poll_id;

  -- Poll 19: Mistletoe kiss
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES (v_event_id, 'Under which decoration do people traditionally share a Christmas kiss', 'scheduled', 30, 8)
  RETURNING id INTO v_poll_id;
  
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Tinsel') RETURNING id INTO v_option_a_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Holly') RETURNING id INTO v_option_b_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Wreath') RETURNING id INTO v_option_c_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Mistletoe') RETURNING id INTO v_option_d_id;
  
  UPDATE polls SET correct_option_id = v_option_d_id WHERE id = v_poll_id;

  -- Poll 20: Australia Christmas
  INSERT INTO polls (event_id, question, state, duration_seconds, results_seconds)
  VALUES (v_event_id, 'Which of these countries celebrates Christmas during its summer season', 'scheduled', 30, 8)
  RETURNING id INTO v_poll_id;
  
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Australia') RETURNING id INTO v_option_a_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Canada') RETURNING id INTO v_option_b_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Norway') RETURNING id INTO v_option_c_id;
  INSERT INTO poll_options (poll_id, label) VALUES (v_poll_id, 'Russia') RETURNING id INTO v_option_d_id;
  
  UPDATE polls SET correct_option_id = v_option_a_id WHERE id = v_poll_id;

  RAISE NOTICE 'Successfully inserted 20 Christmas trivia polls!';
END $$;

