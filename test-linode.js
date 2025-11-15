// Load environment variables from .env file
require('dotenv').config();

// Import all the functions we need to test
const { setToken, getAccountInfo, getLinodes } = require('@linode/api-v4');

const apiToken = process.env.LINODE_TOKEN;

if (!apiToken) {
  console.error("Linode API token not found. Please check your .env file.");
  process.exit(1);
}

// Set the token for the API client
setToken(apiToken);

// Define an async function to run our tests
const testLinodeFunctions = async () => {
  console.log("--- Running Linode API Connection Test ---");
  try {
    // --- Part 1: Test Account Connection ---
    console.log("\nFetching account information...");
    const account = await getAccountInfo();
    
    console.log("✅ Account connection successful!");
    console.log("-----------------------------------------");
    console.log(`  - Company: ${account.company}`);
    console.log(`  - Email:   ${account.email}`);
    console.log("-----------------------------------------");

    // --- Part 2: Test Fetching Linode Instances ---
    console.log("\nFetching Linode instances...");
    const { data: linodes } = await getLinodes();

    if (linodes.length === 0) {
      console.log("✅ Successfully fetched list. No Linodes found in this account.");
    } else {
      console.log(`✅ Success! Found ${linodes.length} Linode(s):`);
      linodes.forEach(linode => {
        console.log("\n  .................................");
        console.log(`  Label:    ${linode.label}`);
        console.log(`  ID:       ${linode.id}`);
        console.log(`  Status:   ${linode.status}`);
        console.log(`  Region:   ${linode.region}`);
        console.log(`  IPv4:     ${linode.ipv4.join(', ')}`); // IPs are in an array
        console.log(`  Type:     ${linode.type}`);
      });
      console.log("  .................................");
    }

  } catch (error) {
    console.error("\n❌ An error occurred during the API test.");
    console.error("Error details:", error.message || error);
  }
};

// Run the tests
testLinodeFunctions();