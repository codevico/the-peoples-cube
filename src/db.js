import path from 'path'
import Database from 'better-sqlite3'

const dbPath = path.join('data', 'cube.db')

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

export const createTables = () => {
    db.prepare(`create table if not exists cube_cards (
        scryfall_id text,
        card_name text,
        card_type text,
        mana_cost text,
        cmc integer,
        voted integer,
        votes_yes integer,
        votes_no integer
    )`).run()
}

export const insertCard = (card, voted, votesYes, votesNo) => {
    const insert = db.prepare(`insert into cube_cards (scryfall_id, card_name, card_type, mana_cost, cmc, voted, votes_yes, votes_no) values (?, ?, ?, ?, ?, ?, ?, ?)`)
    insert.run(card.id, card.name, card.type_line, card.mana_cost, card.cmc, voted, votesYes, votesNo)
}

export const getSavedCardByName = (name) => {
    return db.prepare(`select * from cube_cards where card_name=? collate nocase`).get(name)
}

export const getAllCubeCards = () => {
    return db.prepare(`select * from cube_cards order by voted desc, card_name`).all()
}

export const getColorCount = () => {
    return db.prepare(`select
        sum(length(mana_cost) - length(replace(mana_cost, 'W', ''))) as white,
        sum(length(mana_cost) - length(replace(mana_cost, 'U', ''))) as blue,
        sum(length(mana_cost) - length(replace(mana_cost, 'B', ''))) as black,
        sum(length(mana_cost) - length(replace(mana_cost, 'R', ''))) as red,
        sum(length(mana_cost) - length(replace(mana_cost, 'G', ''))) as green
        from cube_cards where voted=1`).get()
}

export const getCmcCount = () => {
    const map = {}
    for (const row of db.prepare(`select cmc, count(*) as tot from cube_cards where voted=1 group by cmc`).all()) {
        map[row.cmc] = row.tot
    }
    return map
}