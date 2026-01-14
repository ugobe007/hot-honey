import "dotenv/config";
import { Command } from "commander";
import { runBacktest } from "../backtest/backtest.js";

const program = new Command();
program.name("pyth").description("Pyth GOD+FOMO scoring").version("0.1.0");

program
  .command("backtest")
  .requiredOption("--content <path>", "CSV of content items (snippets)")
  .requiredOption("--events <path>", "CSV of investor events")
  .option("--days <n>", "How many days to simulate", "30")
  .action((opts) => {
    runBacktest(opts.content, opts.events, Number(opts.days));
  });

program.parse(process.argv);
