const net = require("net");
const readline = require("readline");
const fs = require("fs");

const client = new net.Socket();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let option = -1;
let fileStream = null;

client.connect(8080, "127.0.0.1", async () => {
  console.log("Voce esta conectado ao Sevidor!!!");
  client.emit("ready_");
});

// Evento ready é chamado logo apos a conexão com o servidor
client.on("ready_", async () => {
  while (true) {
    option = await rlQuestion(
      "Escolha uma opção:\n0 - Fechar conexão\n1 - Enviar arquivo\n2 - Listar arquivos\n3 - Baixar arquivo\n"
    );

    if (!(option >= 0 && option <= 3)) {
      console.log("Esta opção não esta disponivel");
      continue;
    }

    // Fechar conexão
    if (option == 0) {
      // Envia opção escolhida
      client.write(option);
      // Fechando conexão
      client.emit("close_connection");
      break;
    }

    // Enviar arquivo
    else if (option == 1) {
      const file =
        __dirname +
        "/" +
        (await rlQuestion("Digite o nome do arquivo para enviar:"));

      if (!(await fileExist(file))) {
        console.log("Arquivo não existe!\n");
        continue;
      }

      // Envia opção escolhida
      client.write(option);
      // Envia nome do arquivo
      const fileName = file.split(/\/|\\/).pop();
      client.write(fileName);
      // Envia tamanho do arquivo
      client.write(fs.statSync(file).size.toString());
      // Envia arquivo
      const data = await fs.promises.readFile(file);
      client.write(data);

      console.log("Arquivo enviado com sucesso!!!\n");
    }

    // Recebe lista arquivos
    else if (option == 2) {
      client.write(option);
      console.log("Lista de arquivos disponiveis:");
      break;
    }

    // Recebe arquivo
    else if (option == 3) {
      const fileName = await rlQuestion(
        "Digite o nome do arquivo para receber:"
      );

      client.write(option);
      client.write(fileName);

      const file = __dirname + "/" + fileName;
      fileStream = fs.createWriteStream(file);
      console.log("Recebendo arquivo ...")
      break;
    }
  }
});

client.on("data", (data) => {
  dataSub = data.toString().substring(data.toString().length - 8);
  if (dataSub == "end_data")
    data = data.toString().substring(0, data.toString().length - 8);

  if (option == 2 && data) {
    data
      .toString()
      .split(",")
      .map((x) => console.log(x));
  } else if (option == 3 && data) {
    if (data.toString() == "file_not_exist") {
      console.log("Esse arquivo não existe no servidor");
      fileStream.destroy();
      fs.unlinkSync(fileStream.path);
      fileStream = null;
    } else fileStream.write(data);
  }

  if (dataSub == "end_data") {
    if (option == 3)
      if (fileStream != null) {
        fileStream.end();
        fileStream = null;
        console.log("Arquivo recebido")
      }
    client.emit("ready_");
  }
});

client.on("error", (error) => {
  console.log("Houve um problema. Erro: " + error.message);
  // Fechando conexão
  client.emit("close_connection");
});

client.on("close_connection", () => {
  console.log("Conexão fechada");
  client.destroy();
  process.exit(0);
});

async function rlQuestion(question) {
  return await new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function fileExist(file) {
  return await new Promise((resolve) => {
    fs.exists(file, resolve);
  });
}
