const { scrapeData } = require('./scraper');
const { saveDataToDB, overwriteDataInDB } = require('./db');
const fs = require('fs');
const readline = require('readline-sync');

const RAW_JSON_PATH = 'raw.json';

const countCompetitions = (data) => {
    let count = 0;
    for (const client of data) {
        for (const teamType of client.options) {
            for (const league of teamType.options) {
                for (const area of league.options) {
                    if (area.options) {
                        for (const competition of area.options) {
                            count++;
                        }
                    }
                }
            }
        }
    }
    return count;
};

const saveDataToDisk = (baseUrl, data) => {
    for(const client of data){
        const jsonClient = JSON.stringify(client, null, 2);
        const filePathClient = baseUrl + "client-" + client.name + ".json";
        fs.writeFileSync(filePathClient, jsonClient);
    }
    const filePathClients = baseUrl + "clients.json";
    const clientNames = data.map(client => client.name);
    const jsonClientNames = JSON.stringify({
        label: "clients",
        options: clientNames
    }
    , null, 2);
    fs.writeFileSync(filePathClients, jsonClientNames);
}

const main = async () => {
    let result = [];

    while(true){
        console.log("Please select an action:");
        console.log("[1] Scrape data (save to raw.json)");
        console.log("[2] Chunk raw.json into smaller JSONs");
        console.log("[3] Count competitions in raw.json");
        console.log("[4] Overwrite the database");
        console.log("[5] Write to the database");
        console.log("[x] Exit the program");

        const input = readline.keyIn('> ');

        switch (input) {
            case "1":
                console.log("Scraping data from fußball.de...");
                try {
                    result = await scrapeData();
                    const rawJson = JSON.stringify(result, null, 2);
                    fs.writeFileSync(RAW_JSON_PATH, rawJson);
                    console.log("Data successfully saved to raw.json.");
                } catch (error) {
                    console.error("An error occurred while scraping:", error);
                }
                break;
            case "2":
                console.log("Converting raw.json into chunks...");
                try {
                    result = JSON.parse(fs.readFileSync(RAW_JSON_PATH));
                    const filePathPrefix = "de_football/";
                    saveDataToDisk(filePathPrefix, result);
                    console.log("Chunking completed.");
                } catch (error) {
                    console.error("An error occurred while chunking:", error);
                }
                break;
            case "3":
                console.log("Counting competitions...");
                try {
                    result = JSON.parse(fs.readFileSync(RAW_JSON_PATH));
                    const competitionCount = countCompetitions(result);
                    console.log("Total number of competitions:", competitionCount);
                } catch (error) {
                    console.error("An error occurred while counting:", error);
                }
                break;
            case "4":
                console.log("Overwriting the database...");
                try {
                    result = JSON.parse(fs.readFileSync(RAW_JSON_PATH));
                    await overwriteDataInDB(result);
                } catch (error) {
                    console.error("An error occurred while overwriting the database:", error);
                }
                break;
            case "5":
                console.log("Writing to the database...");
                try {
                    result = JSON.parse(fs.readFileSync(RAW_JSON_PATH));
                    await saveDataToDB(result);
                } catch (error) {
                    console.error("An error occurred while writing to the database:", error);
                }
                break;
            case "x":
                console.log("Exiting the program...");
                process.exit(0);
            default:
                console.log("Invalid input");
                break;
        }
        console.log("- - - - - - -");
    }
}


main();