import inquirer from "inquirer";
import ora from "ora";
import chalk from "chalk";
import fs from "fs/promises";
import { DatabaseCredentials, DatabaseConnection, Migrator, Kit } from "./src";

const prefix = chalk`{blue >}`

async function main() {
  const kits = await getKits();
  const db = await getDatabaseConnection();
  const tables = await getTables();
  const migrator = new Migrator(db, tables.kits, tables.kitsModified);
  const spinner = ora({ stream: process.stdout });
  let count = 0;

  for (const kit of kits) {
    count++;
    spinner.start(chalk`[{magenta ${count}/${kits.length}}] migrating {yellow ${kit.Name}}...`);
    
    try {
      await migrator.migrate(kit);
      spinner.succeed(chalk`[{magenta ${count}/${kits.length}}] migrated {blue ${kit.Name}}`);
    } catch (err) {
      spinner.fail();
    }
  }

  process.exit(0);
}

async function getDatabaseConnection() {
  const credentials = <DatabaseCredentials>await inquirer.prompt([
    { type: "input", name: "host", prefix, message: "database IP", default: "localhost" },
    { type: "number", name: "port", prefix, message: "database port", default: 3306 },
    { type: "input", name: "database", prefix, message: "database name" },
    { type: "input", name: "user", prefix, message: "database username" },
    { type: "password", name: "password", prefix, message: "database password", mask: "*" }
  ]);

  return new DatabaseConnection(credentials);
}

async function getTables() {
  const tables = await inquirer.prompt([
    { type: "input", name: "kits", prefix, message: "kits table", default: "kits" },
    { type: "input", name: "kitsModified", prefix, message: "kits_modified table", default: "kits_modified" }
  ]);

  return tables as { kits: string, kitsModified: string };
}

async function getKits() {
  let kits;

  try {
    kits = await fs.readFile("./kits.json", "utf-8");
  } catch (err) {
    if (err.code !== "ENOENT")
      throw err;

     console.log(chalk`{red [error]} kits.json file not found in current directory, exiting...`);
     process.exit(1);
  }

  return JSON.parse(kits) as Kit[];
}

main();