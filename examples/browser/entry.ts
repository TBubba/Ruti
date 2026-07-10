import { type IncomingMessage, type ServerResponse, createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const SERVER_PORT = 8080;

main();

function main() {
  const server = createServer(onRequest).listen(SERVER_PORT, onListen);
}

function onListen(): void {
  console.log(`Server started! http://127.0.0.1:${SERVER_PORT}/`);
}

async function onRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = req.url;
  console.log(url);
  switch (url) {
    case '/': {
      res.writeHead(200, {
        'Content-Type': 'text/html',
      });
      res.end(HTML);
    } break;

    case '/client.js': {
      const file_path = join(import.meta.dirname!, 'client.js');
      let file_data: Buffer;
      try {
        file_data = await readFile(file_path);
      } catch (err) {
        res.writeHead(500);
        res.end(`Failed to read client.js! ${err}`);
        return; // Bail!
      }

      res.writeHead(200, {
        'Content-Type': CONTENT_TYPE_JS,
      });
      res.end(file_data);
    } break;

    case '/ruti.js': {
      const file_path = join(import.meta.dirname!, '../../dist/ruti.js');
      let file_data: Buffer;
      try {
        file_data = await readFile(file_path);
      } catch (err) {
        res.writeHead(500);
        res.end(`Failed to read ruti.js! Remember that you have to build/transpile it! ${err}`);
        return; // Bail!
      }

      res.writeHead(200, {
        'Content-Type': CONTENT_TYPE_JS,
      });
      res.end(file_data);
    } break;

    default: {
      res.writeHead(404);
      res.end(`Page not found.`);
    } break;
  }
}

const CONTENT_TYPE_JS = 'text/javascript; charset=utf-8';

const HTML = (
`<!DOCTYPE html>
<html>
<head>
  <title>Ruti Browser Example</title>
  <script src="/client.js" type="module"></script>
  <style>p { font-size: 2rem; font-weight: bold; }</style>
</head>
<body>
  <p>Open the console! (F12)</p>
</body>
</html>
`);
