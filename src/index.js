require("dotenv").config();
/* Includes */
const fs = require("fs");

/* Config */
const folderId = process.env.FOLDER_ID;
const token = process.env.YANDEX_API;

/* gRPC */
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const CHUNK_SIZE = 4000;

// Получаем ID каталога и IAM-токен из переменных окружения.

// Читаем файл, указанный в аргументах.
const audio = fs.readFileSync("./beluga.ogg");

// Задать настройки распознавания.
const request = {
  config: {
    specification: {
      languageCode: "auto",
      profanityFilter: true,
      model: "general",
      partialResults: true,
      audioEncoding: "OGG_OPUS",
      sampleRateHertz: "8000",
    },
    folderId: folderId,
  },
};

// Частота отправки аудио в миллисекундах.
// Для формата LPCM частоту можно рассчитать по формуле: CHUNK_SIZE * 1000 / ( 2 * sampleRateHertz);
const FREQUENCY = 250;

const PROTO_PATH = "../yandex/cloud/ai/stt/v2/stt_service.proto";
const options = {
  includeDirs: ["node_modules/google-proto-files", ".."],
};
let serviceMetadata = new grpc.Metadata();
serviceMetadata.add("authorization", `Api-Key ${token}`);
var packageDefinition = protoLoader.loadSync(PROTO_PATH, options);
const StreamingRecognize =
  grpc.loadPackageDefinition(packageDefinition).yandex.cloud.ai.stt.v2
    .SttService;
const client = new StreamingRecognize(
  "stt.api.cloud.yandex.net:443",
  grpc.credentials.createSsl(fs.readFileSync("./roots.pem"))
);

let call = client.StreamingRecognize(serviceMetadata, (error, news) => {
  if (!error) throw error;
});
// Отправить сообщение с настройками распознавания.
call.write(request);

// Прочитать аудиофайл и отправить его содержимое порциями.
let i = 1;
const interval = setInterval(() => {
  if (i * CHUNK_SIZE <= audio.length) {
    const chunk = new Uint16Array(
      audio.slice((i - 1) * CHUNK_SIZE, i * CHUNK_SIZE)
    );
    const chunkBuffer = Buffer.from(chunk);
    call.write({ audioContent: chunkBuffer });
    i++;
  } else {
    call.end();
    clearInterval(interval);
  }
}, FREQUENCY);

// Обработать ответы сервера и вывести результат в консоль.
call.on("data", (response) => {
  console.log("Start chunk: ");
  response.chunks[0].alternatives.forEach((alternative) => {
    console.log("alternative: ", alternative.text);
  });
  console.log("Is final: ", Boolean(response.chunks[0].final));
  console.log("");
});

call.on("error", (response) => {
  // Обрабатываем ошибки
  console.log(response);
});
