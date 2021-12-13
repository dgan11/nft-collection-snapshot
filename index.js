require("dotenv").config();
const axios = require("axios");

const MORALIS_BASE_URL_API = "https://deep-index.moralis.io/api/v2/";
const config = {
  "X-API-KEY": process.env.MORALIS_API_KEY,
};
const CRYPTOPUNK_CONTRACT_ADDRESS =
  "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB";
const INNER_CIRCLE_CONTRACT_ADDRESS =
  "0x36d30B3b85255473D27dd0F7fD8F35e36a9d6F06";

class DefaultDict {
  constructor(defaultVal) {
    return new Proxy(
      {},
      {
        get: (target, name) => (name in target ? target[name] : defaultVal),
      }
    );
  }
}

/**
 * Function to get the nearest block to a given timestamp
 */
async function getNearestBlockToTime(timestamp) {
  var url =
    MORALIS_BASE_URL_API + "dateToBlock?chain=eth&date=" + timestamp.toString();
  const response = await axios.get(
    //"https://deep-index.moralis.io/api/v2/dateToBlock?chain=eth&date=1639166206",
    url,
    {
      headers: config,
    }
  );

  console.log(response.data);
  return response.data;
}
//const now = Date.now() / 1000;
//getNearestBlockToTime(now);

/**
 * Helper function to wait ms milliseconds
 * - used so we can space out API requests slightly and we dont get rate limited
 * @param {*} ms - the number of milliseconds we want to
 * @returns
 */
function delayXMilliseconds(ms) {
  return new Promise((ok) => setTimeout(ok, ms));
}

/**
 * Helper function to find the missing tokens from getHoldersOfNFT(contractAddr, numberOfTokens)
 *  - these are token numbers that the Moralis API does not have data on for some unknown reason.
 * @param {*} tokens -- a JS object of string:tokenNumber to integer:Count
 * @param {*} range -- the total number of tokens in the NFT collection
 * @returns
 */
function findMissingTokens(tokens, range) {
  notThere = [];
  for (var i = 0; i < range; i++) {
    iStr = i.toString();
    if (iStr in tokens) {
      //pass
    } else {
      notThere.push(iStr);
    }
  }
  //console.log("notThere: ", notThere);
  return notThere;
}

/**
 * Creates a javascript object (hash table) of wallet addresses to number of nfts they own
 * of the specified contract
 * @param {*} contractAddr - the address for the project contract
 * @param {*} numberOfTokens - the total number of tokens available
 * @returns
 */
async function getHoldersOfNFT(contractAddr, numberOfTokens) {
  var front_url = MORALIS_BASE_URL_API + "nft/" + contractAddr;
  var url = "";
  const numIterations = Math.ceil(numberOfTokens / 500);
  const pageSize = 500;
  var curIter = 0;
  var holderToCountTable = new DefaultDict(0);
  var tokenIdToSeenCount = new DefaultDict(0);

  var arrayOfIters = Array.from(Array(numIterations).keys()); // create an array of 1 to numIterations (inclusive) -- wonky bc of JS await loops
  for await (var curIter of arrayOfIters) {
    try {
      console.log("curIter: ", curIter);
      // Make the request to moralis api with correct offset
      url =
        front_url +
        "/owners?chain=eth&format=decimal" +
        "&offset=" +
        (pageSize * curIter).toString();
      console.log("url: ", url);
      const response = await axios.get(url, {
        headers: config,
      });

      const data = await response.data.result;
      // if (curIter === 1) {
      //   // DELETE
      //   console.log("data: ", data[0]);
      // }

      // Loop through the data and increment the counts
      for await (var tokenHeld of data) {
        holderToCountTable[tokenHeld["owner_of"]] += 1;
        tokenIdToSeenCount[tokenHeld["token_id"]] += 1;
      }

      console.log("number of unique holders: ", Object.keys(holderToCountTable).length);
      console.log("number of tokens: ", Object.keys(tokenIdToSeenCount).length);
      await delayXMilliseconds(1000); // Delay time between next request so we don't get rate limited (I'm on free version)
    } catch (error) {
      console.log("Error: ", error);
      return;
    }
  }

  // Log and Return table and summary statistics.
  console.log("\n  ****** END VALUES ******** \n");
  console.log("holderToCountTable at end: ", holderToCountTable);
  console.log(
    "number of unique holders: ",
    Object.keys(holderToCountTable).length
  );
  //console.log("tokenIdToSeenCount: ", tokenIdToSeenCount);
  console.log(
    "number of tokens accounted for: ",
    Object.keys(tokenIdToSeenCount).length
  );
  var missingTokens = findMissingTokens(tokenIdToSeenCount, numberOfTokens);
  console.log("missingTokens: ", missingTokens);
  return holderToCountTable;
}
getHoldersOfNFT(CRYPTOPUNK_CONTRACT_ADDRESS, 10000);
