import { initClient } from "./config.js";
import {writeFile} from "fs/promises";

const DAYS_IN_SECONDS = 86400;
// const THIRTY_DAYS_IN_SECONDS = 1 * DAYS_IN_SECONDS;

  async function main() {
    const client = await initClient();
    let cursor = 0;
    let runs = 0;
    async function batchProcess(){
      const startTime = Date.now();
      const scanResult = await client.scan(cursor, "COUNT", 2000);
      const serverCursor = Number(scanResult?.[0] ?? 0);
      cursor = serverCursor;
      const keys = scanResult[1];
      const commands: string[][] = [];
      const ttlCommands: string[][] = [];
    
      for (const key of keys) {
        commands.push(["object", "idletime", key]);
        ttlCommands.push(["ttl", key]);
      }
      // const response = await client.pipeline(commands).exec();
      const [idleTimeResponse, ttlResponse] = await Promise.all([
        client.pipeline(commands).exec(),
        client.pipeline(ttlCommands).exec(),
      ]);


      const result = idleTimeResponse?.map((item, index) => {
        const ttl =  Number(ttlResponse?.[index]?.[1]);
        return {
            key: commands?.[index]?.[2],
            lastAccessedSeconds: Math.floor(Number(item?.[1] ?? 0) ?? null),
            lastAccessedDays: Math.floor(
              Number(item?.[1] ?? 0) / DAYS_IN_SECONDS
            ),
            ttl,
            ttlInDays: Math.floor(
              (ttl ?? 0) / DAYS_IN_SECONDS
            ),
          };
        })?.filter((item) => (item?.ttl === -1 && item?.lastAccessedDays > 30));
      const isOldKeysPresent = (result?.length || 0) > 0;
      await writeFile(`run-result.txt`, JSON.stringify(result));  
      console.log(
        `<== Result: ${isOldKeysPresent ? "Found old keys" : "No old keys found"} - cursor=${cursor} - run=${runs} duration - ${(Date.now() - startTime) / 1000}seconds  ==>`,
        result
      );
    }

    do {
      await batchProcess();
      runs ++;
      await new Promise(resolve => setTimeout(resolve, 500));
    } while (cursor !== 0);
    console.log("Exiting process gracefully..");
    process.exit(0);
  }  
  main();



