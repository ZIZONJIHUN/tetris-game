-- supabase/migrations/003_seed_achievements.sql

insert into public.achievements (id, category, name_en, name_ko, description_en, description_ko, xp_reward, badge_label, skin_key, sort_order) values
-- Milestone (5)
('first_game',     'milestone', 'First Steps',   '첫 발걸음',     'Finish your first game',         '첫 게임 완료',                   200,    null,              null,                1),
('first_win',      'milestone', 'First Victory', '첫 승리',       'Win your first battle',          '배틀 첫 승리',                   300,    'Rookie',          null,                2),
('first_tetris',   'milestone', 'First Tetris',  '첫 테트리스',   'Clear 4 lines at once',          '한 판에 4줄 동시 클리어',        300,    'Tetrimino',       null,                3),
('first_perfect',  'milestone', 'First Perfect', '첫 퍼펙트',     'First perfect clear in a game',  '한 판에 퍼펙트 클리어 1회',      500,    'Cleaner',         null,                4),
('first_combo_5',  'milestone', 'First Combo',   '첫 콤보',       'Reach a 5-line combo',           '한 판에 5콤보',                  300,    null,              null,                5),

-- Skill (10)
('score_10k',      'skill',     '10K Club',      '만점 클럽',     'Score 10,000 in a single game',  '한 판 10,000점',                 500,    null,              null,               10),
('score_50k',      'skill',     '50K Club',      '5만 클럽',      'Score 50,000 in a single game',  '한 판 50,000점',                 2000,   '50K Club',        null,               11),
('score_100k',     'skill',     '100K Club',     '10만 클럽',     'Score 100,000 in a single game', '한 판 100,000점',                5000,   '100K Club',       'gold_block',       12),
('tetris_double',  'skill',     'Double Tetris', '더블 테트리스', 'Two tetrises in one game',       '한 판 테트리스 2회',             1000,   null,              null,               13),
('tetris_quad',    'skill',     'Quad Tetris',   '쿼드 테트리스', 'Four tetrises in one game',      '한 판 테트리스 4회',             3000,   'Tetris Master',   null,               14),
('combo_10',       'skill',     'Combo Master',  '콤보 마스터',   'Reach a 10-line combo',          '한 판 10콤보',                   3000,   null,              'neon_pink',        15),
('combo_15',       'skill',     'Combo Emperor', '콤보 황제',     'Reach a 15-line combo',          '한 판 15콤보',                   5000,   'Combo Emperor',   null,               16),
('perfect_triple', 'skill',     'Triple Perfect','트리플 퍼펙트', 'Three perfect clears in a game', '한 판 퍼펙트 클리어 3회',        3000,   'Pristine',        null,               17),
('win_streak_5',   'skill',     '5-Win Streak',  '5연승',         'Win 5 battles in a row',         '5연승 달성',                     2000,   null,              null,               18),
('win_streak_10',  'skill',     '10-Win Streak', '10연승',        'Win 10 battles in a row',        '10연승 달성',                    5000,   'Unbreakable',     null,               19),

-- Cumulative (10)
('games_10',       'cumulative','Beginner',      '입문자',        'Play 10 games total',            '누적 10판',                      300,    null,              null,               30),
('games_100',      'cumulative','Regular',       '단골',          'Play 100 games total',           '누적 100판',                     1500,   null,              null,               31),
('games_500',      'cumulative','Addict',        '중독자',        'Play 500 games total',           '누적 500판',                     5000,   'Addict',          'dark_board',       32),
('wins_10',        'cumulative','10 Wins',       '10승',          'Win 10 battles total',           '누적 10승',                      500,    null,              null,               33),
('wins_50',        'cumulative','50 Wins',       '50승',          'Win 50 battles total',           '누적 50승',                      2000,   null,              null,               34),
('wins_100',       'cumulative','Veteran',       '백전노장',      'Win 100 battles total',          '누적 100승',                     5000,   'Veteran',         null,               35),
('tetrises_50',    'cumulative','Tetris 50',     '테트리스 50',   '50 total tetrises',              '누적 테트리스 50회',             1000,   null,              null,               36),
('tetrises_500',   'cumulative','Tetris 500',    '테트리스 500',  '500 total tetrises',             '누적 테트리스 500회',            5000,   null,              'galaxy_board',     37),
('level_10',       'cumulative','Silver Tier',   '실버 도달',     'Reach XP level 10',              'XP 레벨 10 도달',                0,      'Silver',          'silver_board',     38),
('level_25',       'cumulative','Gold Tier',     '골드 도달',     'Reach XP level 25',              'XP 레벨 25 도달',                0,      'Gold',            'gold_board',       39);
