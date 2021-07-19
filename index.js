const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const readlineSync = require("readline-sync");

const configPath = path.join(__dirname, "config.json");

let config;

if (!fs.existsSync(configPath)) {
  console.log("Config does not exist. Creating one.");
  const domain = readlineSync.question("Enter shopify domain (<domain>.myshopify.com): ");
  const accessToken = readlineSync.question("Enter Access Token / Password: ");

  config = { domain, accessToken };

  console.log("Writing config to: " + configPath);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
} else {
  console.log("Using config from: " + configPath);
  config = JSON.parse(fs.readFileSync(configPath));
}

function simplifyOrder(b) {
  return {
    id: b.id,
    discount_codes: b.discount_codes,
    order_number: b.order_number,
    subtotal_price: b.subtotal_price,
    total_discounts: b.total_discounts,
    total_line_items_price: b.total_line_items_price,
    total_shipping_price_set: b.total_shipping_price_set,
    discount_applications: b.discount_applications,
    line_items: b.line_items.map((i) => ({
      price: i.price,
      product_id: i.product_id,
      sku: i.sku,
      title: i.title,
      total_discount: i.total_discount,
      discount_allocations: i.discount_allocations,
    })),
  }
}

function parseQuery(query) {
  const i = parseInt(query.trim());

  if (isNaN(i)) {
    return { type: "name", name: query };
  } else if (i < 100_000) {
    return { type: "num", num: i };
  } else  {
    return { type: "id", id: i };
  }
}

function matchesOrder(o, matcher) {
  switch (matcher.type) {
  case "name":
    return o.name === matcher.name;
  case "num":
    return o.order_number === matcher.num;
  case "id":
    return o.id === matcher.id;
  }
}

async function queryOrder(query) {
  const matcher = parseQuery(query);
  const path = `https://${config.domain}.myshopify.com/admin/api/2021-07/orders.json?query=${query}`;

  const resp = await (await fetch(path, {
    headers: { "X-Shopify-Access-Token": config.accessToken },
  })).json();


  const orders = resp.orders;
  let order;

  for (const o of resp.orders) {
    if (matchesOrder(o, matcher)) {
      order = o;
      break;
    }
  }

  if (typeof order === "undefined") {
    console.error("Did not find any order.");
  } else {
    console.dir(simplifyOrder(order), { depth: null });
  }
};

async function main() {

  let query;
  do {
    query = readlineSync.question("Enter Order Query: ");
    if (query) {
      await queryOrder(query);
    }
  } while (query)

  console.log("Done.");
}

main();
