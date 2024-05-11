const { Client } = require('pg');

const connectionString = 'postgresql://test-user:test-password@localhost:5432/postgres?schema=leagues';

const client = new Client({
  connectionString: connectionString,
});

client.connect();

async function insertLeagueHierarchy(data, nodeKey, parentId = null) {
    if (!Array.isArray(data)) {
        data = [data];
    }
    for (const node of data) {
        const { name, label, options } = node;
        const nodeId = await insertIntoLeagueHierarchy(nodeKey, name, label, parentId);
        if (options && options.length > 0) {

            await insertLeagueHierarchy(options, removeLastCharacter(label), nodeId);
        }
    }
}

async function insertIntoLeagueHierarchy(nodeKey, nodeValue, childrenLabel, parentId) {
    try {
        const query = 'INSERT INTO leagues.ta_league_hierarchy (node_key, node_value, children_label, parent_id) VALUES ($1, $2, $3, $4) RETURNING node_id';
        const values = [nodeKey, nodeValue, childrenLabel, parentId];
        const result = await client.query(query, values);
        return result.rows[0].node_id;
    } catch (error) {
        console.error('Error inserting into league hierarchy:', error);
    }
}

async function insertCountryAndSportIntoLeageHierarchy(country, sport){
    const countryParentId = await insertIntoLeagueHierarchy("country", country, "sports", null);
    return insertIntoLeagueHierarchy("sport", sport, "clients", countryParentId);
}

async function saveDataToDB(data){
    const teamParentId = await insertCountryAndSportIntoLeageHierarchy("germany", "football")
    // start recursion
    for (const client of data) {
        await insertLeagueHierarchy(client, "client", teamParentId);
    }
}

async function cleanDB(){
    try {
        const query = 'DELETE FROM leagues.ta_league_hierarchy WHERE node_id IS NOT NULL';
        const result = await client.query(query);
        return;
    } catch (error) {
        console.error('Error deleting everythinfg from league hierarchy:', error);
    }
}

async function overwriteDataInDB(data){
    await cleanDB();
    await saveDataToDB(data);
}

function removeLastCharacter(str){
    return str = str.substring(0, str.length - 1);
}

module.exports = {
    saveDataToDB,
    overwriteDataInDB
};