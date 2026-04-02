CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT
);

CREATE TABLE shops (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    location_id INT REFERENCES locations (id)
);

CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    level NUMERIC(10, 3) DEFAULT 1,
    experience NUMERIC(10, 3) DEFAULT 0,
    health NUMERIC(10, 3) DEFAULT 100,
    mana NUMERIC(10, 3) DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(150) NOT NULL,
    rarity VARCHAR(150),
    power NUMERIC(10, 3) DEFAULT 0
);

CREATE TABLE shop_items (
    id SERIAL PRIMARY KEY,
    shop_id INT REFERENCES shops (id),
    item_id INT REFERENCES items (id),
    price NUMERIC(10, 3) NOT NULL
);

CREATE TABLE player_items (
    id SERIAL PRIMARY KEY,
    player_id INT REFERENCES players (id),
    item_id INT REFERENCES items (id),
    quantity NUMERIC(10, 3) DEFAULT 1 NOT NULL,
    shop_id INT REFERENCES shops (id)
);

CREATE TABLE player_shops (
    id SERIAL PRIMARY KEY,
    player_id INT REFERENCES players (id),
    shop_id INT REFERENCES shops (id),
    visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reputation NUMERIC(10, 3) DEFAULT 0
);

CREATE TABLE enemies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    level NUMERIC(10, 3),
    health NUMERIC(10, 3),
    attack NUMERIC(10, 3)
);

CREATE TABLE bosses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    level NUMERIC(10, 3),
    health NUMERIC(10, 3),
    attack NUMERIC(10, 3),
    location_id INT REFERENCES locations (id)
);

CREATE TABLE quests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    reward_experience NUMERIC(10, 3),
    reward_item_id INT REFERENCES items (id)
);

CREATE TABLE player_quests (
    id SERIAL PRIMARY KEY,
    player_id INT REFERENCES players (id),
    quest_id INT REFERENCES quests (id),
    status_id INT REFERENCES statuses (id),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE battles (
    id SERIAL PRIMARY KEY,
    player_id INT REFERENCES players (id),
    enemy_id INT REFERENCES enemies (id),
    boss_id INT REFERENCES bosses (id),
    result VARCHAR(150),
    experience_gained NUMERIC(10, 3),
    battle_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150),
    description TEXT,
    duration NUMERIC(10, 3)
);