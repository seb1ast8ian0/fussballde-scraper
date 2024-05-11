const puppeteer = require('puppeteer');

async function parallel(arr, fn, threads = 2) {
    const result = [];
    const copy = arr.slice(); // Create a copy of the array
    while (copy.length) {
        const res = await Promise.all(copy.splice(0, threads).map(x => fn(x)));
        result.push(res);
    }
    return result.flat();
}

const getATagElements = async (page, selector) => {
    await page.waitForSelector(selector);
    //await page.waitForNetworkIdle('networkidle0');

    // Get the list of li elements
    const liElements = await page.$$(selector);
    const halvedArray = liElements.slice(liElements.length / 2);


    const aTagsInfo = [];
    // Iterate over each li element
    for (let i = 1; i < halvedArray.length; i++) {
        // Get the a tag inside the current li element
        const aTag = await halvedArray[i].$('a');
        if (aTag) {
            // Extract name and href attributes
            const name = await page.evaluate(element => element.innerHTML, aTag);
            const href = await aTag.evaluate(a => a.getAttribute('href'));
            // Push the extracted data to the array
            aTagsInfo.push({ name, href });
        }
    }

    //console.log(aTagsInfo);
    //console.log(aTagsInfo.length, liElements.length)

    return aTagsInfo;
};

const clickLinkByInnerHTML = async (page, selector, searchString) => {
    await page.waitForSelector(selector);
    //await page.waitForNetworkIdle('networkidle0');

    console.log("try clicking link: ", searchString)
    const result = await page.evaluate((selector, searchString) => {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
            const aTag = element.querySelector('a');
            if (aTag && aTag.innerText.trim() === searchString) {
                aTag.click();
                console.log("Clicked on the link with innerHTML:", searchString);
                return { clicked: true }; // Return an object indicating the click was successful
            }
        }
        console.log("No link found with innerHTML:", searchString);
        return { clicked: false }; // Return an object indicating the click was not successful
    }, selector, searchString);

    console.log("Click result:", result); // Log the result from page.evaluate()
};

const getLeaguesForClient = async (clientsSelector, client) => {
    const URL = "https://www.fussball.de/homepage#!/"
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate the page to a URL
    await page.goto(URL, {waitUntil: 'networkidle2'});
    await page.setViewport({
        width: 1920,
        height: 1080 ,
        deviceScaleFactor: 1,
    });

    //LEAGUES
    console.log("- - - - - - - - - -")
    console.log("client: ", client.name);
    await clickLinkByInnerHTML(page, clientsSelector, client.name);
    //await page.waitForNavigation({ waitUntil: 'networkidle2' });

    //SEASONS
    
    const seasonsSelector = 'li[data-ng-repeat="option in wamData.seasons"]';
    const fixedSeason = "23/24"
    await clickLinkByInnerHTML(page, seasonsSelector, fixedSeason);

    //COMPETITION TYPE

    const competitionTypeSelector = 'li[data-ng-repeat="option in wamData.competitionTypes"]';
    const fixedCompetitionType = "Meisterschaften"

    await clickLinkByInnerHTML(page, competitionTypeSelector, fixedCompetitionType);
    await page.waitForNetworkIdle('networkidle0');

    //TEAM TYPES
    
    const teamTypesSelector = 'li[data-ng-repeat="option in wamData.teamTypes"]'

    const teamTypes = await getATagElements(page, teamTypesSelector);
    console.log("teamTypes", teamTypes);

    const teamTypeResult = [];
    
    for(const teamType of teamTypes){

        const leaguesResult = [];

        console.log("teamType: ", teamType.name)
        await clickLinkByInnerHTML(page, teamTypesSelector, teamType.name);

        //LEAGUES
    
        const leaguesSelector = 'li[data-ng-repeat="option in wamData.leagues"]'

        const leagueTypes = await getATagElements(page, leaguesSelector);
        console.log("leagueTypes", leagueTypes);

        for(const leagueType of leagueTypes){
            console.log("leagueType: ", leagueType.name)
            await clickLinkByInnerHTML(page, leaguesSelector, leagueType.name);

            //AREAS

            const areasSelector = 'li[data-ng-repeat="option in wamData.areas"]';
            const areaTypes = await getATagElements(page, areasSelector);
            console.log("areaTypes", areaTypes);

            const areasResult = [];
            
            for(const areaType of areaTypes){

                console.log("areaType: ", areaType.name)
                await clickLinkByInnerHTML(page, areasSelector, areaType.name);
                await page.waitForNetworkIdle('networkidle0');

                //COMPETITIONS
                
                const competitionSelector = 'li[data-ng-repeat="option in wamData.competitions"]'
                const competitions = await getATagElements(page, competitionSelector);
                console.log("competitions: ", competitions);

                const competitionResults = [];

                for(const competition of competitions){
                    competitionResults.push({
                        name: competition.name,
                        label: null,
                        options: null
                    })
                }

                areasResult.push({
                    name: areaType.name,
                    label: "competitions",
                    options: competitionResults
                })
            }

            leaguesResult.push({
                name: leagueType.name,
                label: "areas",
                options: areasResult
            })
        }

        teamTypeResult.push({
            name: teamType.name,
            label: "leagues",
            options: leaguesResult
        })
    }

    return {
        name: client.name,
        label: "teamTypes",
        options: teamTypeResult
    };
}

const scrapeData = async () => {
    const URL = "https://www.fussball.de/homepage#!/"
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate the page to a URL
    await page.goto(URL, {waitUntil: 'networkidle2'});
    await page.setViewport({
        width: 1920,
        height: 1080 ,
        deviceScaleFactor: 1,
    });

    const clientsSelector = 'li[data-ng-repeat="option in wamData.clients"]';
    const clients = await getATagElements(page, clientsSelector);
    
    //execute for each Client in parallel with 8 Threads
    const result = await parallel(clients, async (client) => {
        return getLeaguesForClient(clientsSelector, client);
    }, 8);

    await browser.close();
    console.log(`Browser has been closed`);

    return result;
}

module.exports = {
    scrapeData
};